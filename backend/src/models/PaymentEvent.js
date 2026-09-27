const mongoose = require('mongoose');

/** Webhook events already processed (dedupe on `key`, e.g. `collection:INV123:COMPLETE`). */
const PaymentEventSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    type: String,
    payload: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

PaymentEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('PaymentEvent', PaymentEventSchema);
