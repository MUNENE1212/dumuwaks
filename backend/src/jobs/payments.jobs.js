/**
 * Scheduled money jobs. Started from server.js on PM2 instance 0 only; each
 * run also takes a Mongo lock, so a second process can never double-run.
 *
 *   every 2 min   poll unanswered STK pushes and in-flight payouts
 *   every 15 min  auto-release (3 days after completion, no dispute)
 *                 and auto-refund (paid, never started, 14 days)
 *   06:00 EAT     reconcile the escrow wallet against the ledger
 */

const cron = require('node-cron');
const config = require('../config/payments');
const Payout = require('../models/Payout');
const engine = require('../services/payments/escrow.engine');
const payouts = require('../services/payments/payout.service');
const reconciliation = require('../services/payments/reconciliation.service');
const { withLock } = require('../utils/jobLock');
const logger = require('../utils/logger');

async function pollPayouts() {
  const stale = await Payout.find({
    status: 'processing',
    trackingId: { $exists: true },
    $or: [{ lastCheckedAt: { $lt: new Date(Date.now() - 60 * 1000) } }, { lastCheckedAt: { $exists: false } }],
  })
    .select('_id')
    .limit(50);
  for (const p of stale) {
    try {
      await payouts.refresh(p._id);
    } catch (error) {
      logger.warn(`payments: payout poll ${p._id} failed: ${error.message}`);
    }
  }
  return stale.length;
}

const safe = (name, ttl, fn) => async () => {
  try {
    const out = await withLock(name, ttl, fn);
    if (out.result !== undefined) logger.info(`payments job ${name}: ${JSON.stringify(out.result)}`);
  } catch (error) {
    logger.error(`payments job ${name} failed: ${error.message}`);
  }
};

function start() {
  if (!config.isConfigured()) {
    logger.info('payments jobs: not started (payments not configured)');
    return [];
  }
  const instance = process.env.NODE_APP_INSTANCE;
  if (instance !== undefined && instance !== '0') return [];

  const tz = { timezone: 'Africa/Nairobi' };
  return [
    cron.schedule('*/2 * * * *', safe('payments.poll', 110 * 1000, async () => ({
      collections: await engine.pollPendingCollections(),
      payouts: await pollPayouts(),
    })), tz),
    cron.schedule('*/15 * * * *', safe('payments.auto', 14 * 60 * 1000, () => engine.runAutoActions()), tz),
    cron.schedule('0 6 * * *', safe('payments.reconcile', 30 * 60 * 1000, async () => {
      const r = await reconciliation.run();
      return { ok: r.ok, drift: r.drift };
    }), tz),
  ];
}

module.exports = { start, pollPayouts };
