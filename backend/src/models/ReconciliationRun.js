const mongoose = require('mongoose');

/** Daily proof that the IntaSend escrow wallet holds exactly what the ledger says. */
const ReconciliationRunSchema = new mongoose.Schema(
  {
    walletId: String,
    walletAvailable: Number,
    walletCurrent: Number,
    ledgerHeld: Number,
    drift: Number, // walletAvailable − ledgerHeld
    ok: Boolean,
    escrowCount: Number,
    error: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReconciliationRun', ReconciliationRunSchema);
