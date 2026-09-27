const mongoose = require('mongoose');

/**
 * Money leaving the escrow wallet: to a technician, back to a customer, or the
 * platform's share to the settlement wallet.
 *
 *   queued → initiated → processing → succeeded
 *                 ↘ needs_review ↗        ↘ failed
 *
 * `initiated` is written BEFORE calling IntaSend. A payout whose outcome is
 * unknown (timeout) goes to needs_review and is never re-sent automatically.
 */
const DestinationSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ['mpesa', 'bank', 'wallet'], required: true },
    phone: String,
    bankCode: String,
    bankName: String,
    accountNumber: String,
    accountName: String,
    walletId: String,
  },
  { _id: false }
);

const PayoutSchema = new mongoose.Schema(
  {
    escrow: { type: mongoose.Schema.Types.ObjectId, ref: 'Escrow', required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    kind: { type: String, enum: ['technician', 'refund', 'platform_share', 'platform_topup'], required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    narrative: String,
    destination: DestinationSchema,
    /** When the recipient last changed payout details (cooling-off check) */
    destinationChangedAt: Date,
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },

    idempotencyKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['queued', 'needs_review', 'initiated', 'processing', 'succeeded', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    reviewReason: String,
    failureReason: String,

    trackingId: { type: String, index: true },
    providerRef: String, // M-Pesa / bank reference
    charge: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    initiatedAt: Date,
    completedAt: Date,
    lastCheckedAt: Date,
  },
  { timestamps: true }
);

PayoutSchema.index({ status: 1, updatedAt: 1 });

module.exports = mongoose.model('Payout', PayoutSchema);
