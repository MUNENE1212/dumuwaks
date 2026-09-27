/**
 * Read models for the admin Finance page.
 */

const config = require('../../config/payments');
const Escrow = require('../../models/Escrow');
const Payout = require('../../models/Payout');
const ledger = require('./ledger.service');
const intasend = require('./intasend.client');
const reconciliation = require('./reconciliation.service');
const engine = require('./escrow.engine');

async function overview() {
  const [totals, byStatus, review, failed, runs] = await Promise.all([
    ledger.totalHeld(),
    Escrow.aggregate([
      { $match: { provider: 'intasend' } },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
    ]),
    Payout.countDocuments({ status: 'needs_review' }),
    Payout.countDocuments({ status: 'failed' }),
    reconciliation.latest(1),
  ]);
  let wallet = null;
  if (config.isConfigured()) {
    try {
      const w = await intasend.getWallet(config.escrowWalletId);
      wallet = { available: ledger.round(w.available_balance), current: ledger.round(w.current_balance) };
    } catch (error) {
      wallet = { error: error.message };
    }
  }
  return {
    env: config.env,
    configured: config.isConfigured(),
    held: totals.held,
    wallet,
    drift: wallet && wallet.available !== undefined ? ledger.round(wallet.available - totals.held) : null,
    escrows: Object.fromEntries(byStatus.map((r) => [r._id, { count: r.count, amount: r.amount }])),
    payoutsNeedingReview: review,
    payoutsFailed: failed,
    lastReconciliation: runs[0] || null,
    approvalThreshold: config.payoutApprovalThreshold,
  };
}

async function listPayouts({ status, page = 1, limit = 25 } = {}) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, parseInt(limit, 10) || 25);
  const filter = status ? { status: { $in: String(status).split(',') } } : {};
  const [items, total] = await Promise.all([
    Payout.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('recipient', 'firstName lastName phoneNumber')
      .populate('booking', 'bookingNumber')
      .lean(),
    Payout.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) };
}

async function listEscrows({ status, page = 1, limit = 25 } = {}) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, parseInt(limit, 10) || 25);
  const filter = { provider: 'intasend', ...(status ? { status: { $in: String(status).split(',') } } : {}) };
  const [items, total] = await Promise.all([
    Escrow.find(filter)
      .sort('-updatedAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .select('booking customer technician totalAmount status fundedAt releasedAt refundedAt completionRequestedAt expiresAt')
      .populate('booking', 'bookingNumber serviceCategory status')
      .populate('customer', 'firstName lastName')
      .populate('technician', 'firstName lastName')
      .lean(),
    Escrow.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) };
}

async function escrowDetail(escrowId) {
  const [summary, entries] = await Promise.all([engine.summary(escrowId, { staff: true }), ledger.entries(escrowId)]);
  return summary ? { ...summary, ledger: entries } : null;
}

module.exports = { overview, listPayouts, listEscrows, escrowDetail };
