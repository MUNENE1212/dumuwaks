/**
 * Technician payout details (M-Pesa number or bank account).
 *
 * A change is only saved after a 6-digit code sent to the phone that will
 * receive the money (M-Pesa) or to the account phone (bank) is entered. When a
 * technician replaces existing details, payouts are held for 24 hours and the
 * account phone is told — the usual account-takeover pattern is "change the
 * payout number, then trigger a payout".
 */

const crypto = require('crypto');
const User = require('../../models/User');
const intasend = require('./intasend.client');
const { toWhatsAppNumber } = require('../../utils/phone');
const logger = require('../../utils/logger');

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

class DestinationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const hash = (code) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET || 'dumuwaks-otp').update(String(code)).digest('hex');

const mask = (s) => (s ? String(s).replace(/^(.*)(.{3})$/, (_, a, b) => '•'.repeat(Math.max(a.length - 3, 0)) + a.slice(-3) + b) : '');

let bankCache = { at: 0, list: [] };
async function bankCodes() {
  if (Date.now() - bankCache.at < 24 * 60 * 60 * 1000 && bankCache.list.length) return bankCache.list;
  const list = await intasend.bankCodes();
  bankCache = { at: Date.now(), list: Array.isArray(list) ? list : [] };
  return bankCache.list;
}

function publicView(d) {
  if (!d?.method) return null;
  return {
    method: d.method,
    phone: d.phone ? `+${d.phone.slice(0, 6)}***${d.phone.slice(-3)}` : undefined,
    bankName: d.bankName,
    accountNumber: d.accountNumber ? mask(d.accountNumber) : undefined,
    accountName: d.accountName,
    verifiedAt: d.verifiedAt,
    changedAt: d.changedAt,
    payoutsHeldUntil: d.changedAt ? new Date(new Date(d.changedAt).getTime() + 24 * 60 * 60 * 1000) : null,
  };
}

async function get(userId) {
  const user = await User.findById(userId).select('payoutDestination pendingPayoutDestination');
  return {
    current: publicView(user?.payoutDestination),
    pending: user?.pendingPayoutDestination?.method
      ? { method: user.pendingPayoutDestination.method, expires: user.pendingPayoutDestination.otpExpires }
      : null,
  };
}

async function sendCode(phone, code) {
  return sendMessage(
    phone,
    `Dumuwaks: your code to confirm payout details is ${code}. It expires in 10 minutes. If you did not ask for this, ignore it and call us.`,
    code
  );
}

async function sendMessage(phone, text, devCode) {
  try {
    const wa = require('../whatsapp/evolution.client');
    if (require('../../config/whatsapp').isConfigured()) {
      await wa.sendText(phone, text, { delay: 0 });
      return 'whatsapp';
    }
  } catch (error) {
    logger.warn(`payouts: WhatsApp OTP failed (${error.message}), trying SMS`);
  }
  try {
    await require('../sms.service').sendSMS(`+${phone}`, text);
    return 'sms';
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`payouts: [dev] message to ${phone}: ${devCode || text}`);
      return 'log';
    }
    throw new DestinationError('Could not send the confirmation code. Try again shortly.', 502);
  }
}

/** Start a change: validate, store as pending, send the code. */
async function requestChange(userId, input) {
  const user = await User.findById(userId).select('role phoneNumber firstName lastName payoutDestination');
  if (!user) throw new DestinationError('User not found', 404);
  if (user.role !== 'technician') throw new DestinationError('Only technicians receive payouts', 403);

  let pending;
  let codeTo;
  if (input.method === 'mpesa') {
    const phone = toWhatsAppNumber(input.phone);
    if (!phone || !/^254[17]\d{8}$/.test(phone)) throw new DestinationError('Enter a Safaricom M-Pesa number, e.g. 0712 345 678');
    pending = { method: 'mpesa', phone };
    codeTo = phone; // proves the technician holds the receiving line
  } else if (input.method === 'bank') {
    const accountNumber = String(input.accountNumber || '').replace(/\s/g, '');
    const accountName = String(input.accountName || '').trim();
    if (!/^\d{6,20}$/.test(accountNumber)) throw new DestinationError('Enter the bank account number (digits only)');
    if (accountName.length < 3) throw new DestinationError('Enter the account name exactly as the bank has it');
    const bank = (await bankCodes()).find((b) => String(b.bank_code) === String(input.bankCode));
    if (!bank) throw new DestinationError('Choose your bank from the list');
    pending = { method: 'bank', bankCode: String(bank.bank_code), bankName: bank.bank_name, accountNumber, accountName };
    codeTo = toWhatsAppNumber(user.phoneNumber);
    if (!codeTo) throw new DestinationError('Add a phone number to your account first');
  } else {
    throw new DestinationError('Choose M-Pesa or bank');
  }

  const code = String(crypto.randomInt(100000, 1000000));
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        pendingPayoutDestination: {
          ...pending,
          otpHash: hash(code),
          otpExpires: new Date(Date.now() + OTP_TTL_MS),
          attempts: 0,
          requestedAt: new Date(),
        },
      },
    }
  );
  const via = await sendCode(codeTo, code);
  return { sentTo: `+${codeTo.slice(0, 6)}***${codeTo.slice(-3)}`, via };
}

/** Confirm the code and make the pending details live. */
async function verify(userId, code) {
  const user = await User.findById(userId).select('+pendingPayoutDestination.otpHash');
  const p = user?.pendingPayoutDestination;
  if (!p?.method || !p.otpHash) throw new DestinationError('No change waiting for confirmation');
  if (p.otpExpires < new Date()) throw new DestinationError('The code has expired. Request a new one.');
  if (p.attempts >= MAX_ATTEMPTS) throw new DestinationError('Too many wrong codes. Request a new one.', 429);

  const ok = crypto.timingSafeEqual(Buffer.from(hash(code)), Buffer.from(p.otpHash));
  if (!ok) {
    await User.updateOne({ _id: userId }, { $inc: { 'pendingPayoutDestination.attempts': 1 } });
    throw new DestinationError('That code is not right');
  }

  const replacing = Boolean(user.payoutDestination?.verifiedAt);
  const now = new Date();
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        payoutDestination: {
          method: p.method,
          phone: p.phone,
          bankCode: p.bankCode,
          bankName: p.bankName,
          accountNumber: p.accountNumber,
          accountName: p.accountName,
          verifiedAt: now,
          // First-time setup is not held; a change is (24 h cooling-off)
          changedAt: replacing ? now : undefined,
        },
      },
      $unset: { pendingPayoutDestination: 1 },
    }
  );

  if (replacing) {
    try {
      await require('../notification.service').createNotification(userId, {
        type: 'security_alert',
        category: 'system',
        title: 'Payout details changed',
        body: 'Your payout details were changed. Payouts are paused for 24 hours. If this was not you, call Dumuwaks now.',
        priority: 'urgent',
      });
      const accountPhone = toWhatsAppNumber(user.phoneNumber);
      if (accountPhone) {
        await sendMessage(
          accountPhone,
          'Dumuwaks: your payout details were just changed. Payouts are paused for 24 hours. If this was not you, call +254 799 954 672 now.'
        ).catch(() => {});
      }
    } catch (error) {
      logger.warn(`payouts: change alert failed: ${error.message}`);
    }
  }
  return get(userId);
}

module.exports = { get, requestChange, verify, bankCodes, DestinationError };
