const mongoose = require('mongoose');

/**
 * Something a customer or technician asked for on WhatsApp that a person on
 * the support desk has to act on: a booking request, a technician wanting to
 * join, or someone asking to talk to a human.
 *
 * Booking requests are converted into real bookings with the existing support
 * endpoints (POST /support/create-customer, POST /support/create-booking).
 */
const WhatsAppRequestSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true }, // WR-240926-4821
    kind: { type: String, enum: ['booking', 'join', 'human'], required: true },
    phone: { type: String, required: true, index: true },
    name: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // booking requests
    serviceCategory: {
      type: String,
      enum: ['plumbing', 'electrical', 'carpentry', 'masonry', 'painting', 'hvac', 'welding', 'other'],
    },
    description: { type: String, maxlength: 1000 },
    hasPhoto: { type: Boolean, default: false },
    location: {
      text: String,
      lat: Number,
      lng: Number,
    },
    urgency: { type: String, enum: ['low', 'medium', 'high', 'emergency'], default: 'medium' },

    status: {
      type: String,
      enum: ['open', 'in_progress', 'converted', 'closed'],
      default: 'open',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    notes: [
      {
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

WhatsAppRequestSchema.index({ status: 1, createdAt: -1 });

WhatsAppRequestSchema.statics.newReference = function newReference(date = new Date()) {
  // Date part in Nairobi time (UTC+3, no DST) so it matches the customer's day
  const eat = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const ymd = eat.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `WR-${ymd}-${rand}`;
};

module.exports = mongoose.model('WhatsAppRequest', WhatsAppRequestSchema);
