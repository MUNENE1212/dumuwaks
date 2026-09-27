/**
 * Payouts out of the IntaSend escrow wallet.
 *
 * Rules that keep money safe:
 *  - A payout is written `initiated` BEFORE IntaSend is called.
 *  - If IntaSend's answer is lost (timeout), the payout goes to needs_review
 *    and is never re-sent automatically — someone checks the dashboard first.
 *  - Large payouts and payouts to recently changed destinations wait for an admin.
 *  - Success is only recorded from IntaSend's own status, then posted to the ledger.
 */

const config = require('../../config/payments');
const Payout = require('../../models/Payout');
const intasend = require('./intasend.client');
const ledger = require('./ledger.service');
const logger = require('../../utils/logger');

const engine = () => require('./escrow.engine');

let settlementWalletId = process.env.INTASEND_SETTLEMENT_WALLET_ID || null;

/** The account's SETTLEMENT wallet (platform revenue), looked up once. */
async function getSettlementWalletId() {
  if (settlementWalletId) return settlementWalletId;
  const res = await intasend.listWallets();
  const list = Array.isArray(res) ? res : res?.results || [];
  const w = list.find((x) => x.wallet_type === 'SETTLEMENT' && x.currency === config.currency);
  if (!w) throw new Error('No KES SETTLEMENT wallet found on the IntaSend account');
  settlementWalletId = w.wallet_id;
  return settlementWalletId;
}

/** Create a payout once per idempotency key; a repeat returns the existing one. */
async function create(fields) {
  try {
    return await Payout.create(fields);
  } catch (error) {
    if (error.code === 11000) return Payout.findOne({ idempotencyKey: fields.idempotencyKey });
    throw error;
  }
}

async function toReview(payout, reason) {
  await Payout.updateOne({ _id: payout._id }, { $set: { status: 'needs_review', reviewReason: reason } });
  logger.warn(`payments: payout ${payout._id} needs review — ${reason}`);
  try {
    require('../../config/socket').emitToStaff('payments:payout_review', {
      payoutId: payout._id,
      amount: payout.amount,
      kind: payout.kind,
      reason,
    });
  } catch (_) {
    /* socket not initialised */
  }
}

/** Why this payout cannot go out automatically, or null. */
function gate(payout) {
  if (payout.approvedBy) return null;
  if (payout.kind === 'platform_share' || payout.kind === 'platform_topup') return null;
  if (!payout.destination?.method) return 'No payout destination on file';
  if (payout.amount > config.payoutApprovalThreshold) {
    return `Above the KES ${config.payoutApprovalThreshold.toLocaleString()} approval threshold`;
  }
  if (payout.destinationChangedAt && Date.now() - new Date(payout.destinationChangedAt).getTime() < config.destinationCoolingMs) {
    return 'Payout details were changed in the last 24 hours';
  }
  return null;
}

/**
 * Send one queued payout. Safe to call repeatedly: only a payout that is
 * `queued` is claimed (compare-and-set), so two workers cannot both send it.
 */
async function processPayout(payoutId) {
  let payout = await Payout.findById(payoutId);
  if (!payout || payout.status !== 'queued') return payout;

  const blocked = gate(payout);
  if (blocked) {
    await toReview(payout, blocked);
    return Payout.findById(payoutId);
  }

  payout = await Payout.findOneAndUpdate(
    { _id: payoutId, status: 'queued' },
    { $set: { status: 'initiated', initiatedAt: new Date() }, $inc: { attempts: 1 } },
    { new: true }
  );
  if (!payout) return Payout.findById(payoutId); // another worker claimed it

  try {
    if (payout.kind === 'platform_share' || payout.kind === 'platform_topup') {
      const settlement = await getSettlementWalletId();
      const [from, to] =
        payout.kind === 'platform_share' ? [config.escrowWalletId, settlement] : [settlement, config.escrowWalletId];
      const res = await intasend.intraTransfer({ from, to, amount: payout.amount, narrative: payout.narrative });
      await markSucceeded(payout, { providerRef: res?.tracking_id || res?.id || res?.invoice || null, charge: 0 });
      return Payout.findById(payoutId);
    }

    const res = await intasend.sendMoney({
      destination: payout.destination,
      amount: payout.amount,
      name: payout.name,
      narrative: payout.narrative,
      walletId: config.escrowWalletId,
      idempotencyKey: `${payout.idempotencyKey}:a${payout.attempts}`,
    });
    if (!res?.tracking_id) throw Object.assign(new Error('IntaSend returned no tracking_id'), { outcomeUnknown: true });
    await Payout.updateOne(
      { _id: payout._id },
      { $set: { status: 'processing', trackingId: res.tracking_id, lastCheckedAt: new Date() } }
    );
    return Payout.findById(payoutId);
  } catch (error) {
    // A 4xx means IntaSend refused it: definitely not sent. Anything else: unknown.
    const refused = error.status && error.status < 500 && error.status !== 429;
    if (refused) {
      await Payout.updateOne({ _id: payout._id }, { $set: { status: 'failed', failureReason: error.message } });
      await toReview(payout, `IntaSend refused the payout: ${error.message}`);
    } else {
      await toReview(payout, `Outcome unknown (${error.message}). Check the IntaSend dashboard before approving again.`);
    }
    return Payout.findById(payoutId);
  }
}

async function markSucceeded(payout, { providerRef, charge }) {
  const updated = await Payout.findOneAndUpdate(
    { _id: payout._id, status: { $ne: 'succeeded' } },
    { $set: { status: 'succeeded', providerRef, charge: charge || 0, completedAt: new Date() } },
    { new: true }
  );
  if (!updated) return; // already recorded

  const base = { escrow: payout.escrow, booking: payout.booking, payout: payout._id, providerRef };
  const kind = {
    technician: 'release_technician',
    refund: 'refund',
    platform_share: 'platform_share',
    platform_topup: 'platform_topup',
  }[payout.kind];
  await ledger.post({ ...base, kind, amount: payout.amount, idempotencyKey: `payout:${payout._id}` });
  if (charge > 0) {
    await ledger.post({ ...base, kind: 'payout_charge', amount: charge, idempotencyKey: `payout_charge:${payout._id}` });
  }
  await engine().onPayoutSettled(payout.escrow);
}

async function markFailed(payout, reason) {
  const updated = await Payout.findOneAndUpdate(
    { _id: payout._id, status: { $in: ['initiated', 'processing'] } },
    { $set: { status: 'failed', failureReason: reason, completedAt: new Date() } },
    { new: true }
  );
  if (updated) await toReview(updated, `Payout failed: ${reason}`);
}

const SUCCESS = ['TS100'];
const FAILED = ['TF103', 'TF106', 'TC108', 'BF102', 'BE111', 'BF105', 'BF107'];

/** Ask IntaSend for the truth about a payout and record it. */
async function refresh(payoutId) {
  const payout = await Payout.findById(payoutId);
  if (!payout || !payout.trackingId || !['initiated', 'processing'].includes(payout.status)) return payout;

  const res = await intasend.sendMoneyStatus(payout.trackingId);
  await Payout.updateOne({ _id: payout._id }, { $set: { lastCheckedAt: new Date() } });
  const tx = res?.transactions?.[0] || {};
  const code = tx.status_code || res?.status_code;

  if (SUCCESS.includes(tx.status_code)) {
    await markSucceeded(payout, { providerRef: tx.provider_reference, charge: Number(tx.charge) || 0 });
  } else if (FAILED.includes(code)) {
    await markFailed(payout, tx.status_description || tx.failed_reason || res?.status || code);
  } else if (tx.status_code === 'TF105') {
    await toReview(payout, 'IntaSend cannot determine the transaction status (TF105). Contact IntaSend support.');
  }
  return Payout.findById(payoutId);
}

/** Admin approval: releases a payout held for review. */
async function approve(payoutId, adminId) {
  const payout = await Payout.findOneAndUpdate(
    { _id: payoutId, status: { $in: ['needs_review', 'failed'] } },
    { $set: { status: 'queued', approvedBy: adminId, approvedAt: new Date(), reviewReason: null } },
    { new: true }
  );
  if (!payout) throw new Error('Payout is not waiting for review');
  return processPayout(payout._id);
}

module.exports = { create, processPayout, refresh, approve, markSucceeded, getSettlementWalletId, gate };
