const mongoose = require('mongoose');

/**
 * Append-only money ledger for escrow, seen from the IntaSend escrow wallet.
 *
 *   in : collect, platform_topup
 *   out: collection_charge, release_technician, payout_charge, refund, platform_share
 *
 * Held balance of an escrow = Σin − Σout. Summed over every escrow it must
 * equal the escrow wallet's balance (jobs/payments.jobs.js reconciles daily).
 * Entries are never updated or deleted; a mistake is corrected with `reversal`.
 */
const KINDS = {
  collect: 'in',
  platform_topup: 'in',
  collection_charge: 'out',
  release_technician: 'out',
  payout_charge: 'out',
  refund: 'out',
  platform_share: 'out',
};

const LedgerEntrySchema = new mongoose.Schema(
  {
    escrow: { type: mongoose.Schema.Types.ObjectId, ref: 'Escrow', required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    kind: { type: String, enum: [...Object.keys(KINDS), 'reversal'], required: true },
    direction: { type: String, enum: ['in', 'out'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },
    /** IntaSend invoice_id / tracking_id / M-Pesa receipt */
    providerRef: String,
    payout: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout' },
    /** Posting the same fact twice is impossible: e.g. `collect:<invoice_id>` */
    idempotencyKey: { type: String, required: true, unique: true },
    note: String,
  },
  { timestamps: { createdAt: 'at', updatedAt: false } }
);

// Append-only
LedgerEntrySchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  throw new Error('LedgerEntry is append-only');
});

LedgerEntrySchema.statics.KINDS = KINDS;

module.exports = mongoose.model('LedgerEntry', LedgerEntrySchema);
