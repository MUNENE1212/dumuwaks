const mongoose = require('mongoose');

/**
 * One row per WhatsApp number that has messaged Dumuwaks.
 * Holds where the bot is in a conversation, so replies survive restarts and
 * both PM2 cluster workers see the same state.
 */
const WhatsAppSessionSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true }, // 2547XXXXXXXX
    jid: String, // the chat id Evolution uses to reply (may be an @lid id)
    name: String, // WhatsApp display name
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    state: { type: String, default: 'idle' }, // idle | book:category | book:describe | book:location | book:when
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    mode: { type: String, enum: ['bot', 'human'], default: 'bot' },
    humanUntil: Date,

    optedOut: { type: Boolean, default: false },
    lastInboundAt: Date,
    lastOutboundAt: Date,

    // Evolution can redeliver a webhook; remember recent message ids
    recentMessageIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

WhatsAppSessionSchema.methods.seen = function seen(messageId) {
  return Boolean(messageId) && this.recentMessageIds.includes(messageId);
};

WhatsAppSessionSchema.methods.remember = function remember(messageId) {
  if (!messageId) return;
  this.recentMessageIds = [...this.recentMessageIds.slice(-49), messageId];
};

module.exports = mongoose.model('WhatsAppSession', WhatsAppSessionSchema);
