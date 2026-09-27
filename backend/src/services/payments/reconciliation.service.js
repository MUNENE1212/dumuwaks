/**
 * Proves the IntaSend escrow wallet holds exactly what the ledger says is held.
 * Any drift alerts staff: it means money moved that the platform did not record
 * (or the reverse) and must be explained before more payouts go out.
 */

const config = require('../../config/payments');
const intasend = require('./intasend.client');
const ledger = require('./ledger.service');
const ReconciliationRun = require('../../models/ReconciliationRun');
const Escrow = require('../../models/Escrow');
const logger = require('../../utils/logger');

const TOLERANCE = 1; // KES — rounding across many entries

async function run() {
  try {
    const [wallet, totals, escrowCount] = await Promise.all([
      intasend.getWallet(config.escrowWalletId),
      ledger.totalHeld(),
      Escrow.countDocuments({ provider: 'intasend', status: { $in: ['funded', 'disputed', 'release_pending', 'refunding'] } }),
    ]);
    const walletAvailable = ledger.round(wallet.available_balance);
    const drift = ledger.round(walletAvailable - totals.held);
    const doc = await ReconciliationRun.create({
      walletId: config.escrowWalletId,
      walletAvailable,
      walletCurrent: ledger.round(wallet.current_balance),
      ledgerHeld: totals.held,
      drift,
      ok: Math.abs(drift) <= TOLERANCE,
      escrowCount,
    });
    if (!doc.ok) alert(`Escrow wallet ${walletAvailable} vs ledger ${totals.held}: drift KES ${drift}`);
    return doc;
  } catch (error) {
    const doc = await ReconciliationRun.create({ walletId: config.escrowWalletId, ok: false, error: error.message });
    alert(`Reconciliation could not run: ${error.message}`);
    return doc;
  }
}

function alert(message) {
  logger.error(`payments: RECONCILIATION ${message}`);
  try {
    require('../../config/socket').emitToStaff('payments:reconciliation_alert', { message });
  } catch (_) {
    /* no socket */
  }
  // WhatsApp the company line if the channel is up
  try {
    const wa = require('../../config/whatsapp');
    const alertTo = process.env.PAYMENTS_ALERT_PHONE;
    if (wa.isConfigured() && alertTo) {
      require('../whatsapp/evolution.client').sendText(alertTo.replace(/\D/g, ''), `Dumuwaks payments alert: ${message}`).catch(() => {});
    }
  } catch (_) {
    /* ignore */
  }
}

const latest = (limit = 14) => ReconciliationRun.find().sort({ createdAt: -1 }).limit(limit).lean();

module.exports = { run, latest };
