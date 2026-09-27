/**
 * IntaSend webhook events. The payload only tells us *what* changed; the
 * state is always re-read from IntaSend before anything is recorded.
 */

const crypto = require('crypto');
const config = require('../../config/payments');
const PaymentEvent = require('../../models/PaymentEvent');
const Payout = require('../../models/Payout');
const engine = require('./escrow.engine');
const payouts = require('./payout.service');
const logger = require('../../utils/logger');

function validChallenge(challenge) {
  const a = Buffer.from(String(challenge || ''));
  const b = Buffer.from(String(config.webhookChallenge || ''));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Remember an event once; returns false if it was already handled. */
async function firstTime(key, type, payload) {
  try {
    await PaymentEvent.create({ key, type, payload });
    return true;
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
}

async function handle(payload) {
  if (payload.invoice_id) {
    const key = `collection:${payload.invoice_id}:${payload.state}`;
    if (!(await firstTime(key, 'collection', payload))) return { duplicate: true };
    return engine.confirmCollection(payload.invoice_id);
  }
  if (payload.tracking_id) {
    const key = `send_money:${payload.tracking_id}:${payload.status_code || payload.status}`;
    if (!(await firstTime(key, 'send_money', payload))) return { duplicate: true };
    const payout = await Payout.findOne({ trackingId: payload.tracking_id }).select('_id');
    if (!payout) return { ignored: 'unknown tracking_id' };
    return payouts.refresh(payout._id);
  }
  logger.info('payments: webhook with no invoice_id/tracking_id ignored');
  return { ignored: 'unrecognised event' };
}

module.exports = { validChallenge, handle };
