const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Main Notification Schema
const NotificationSchema = new Schema({
  // Recipient
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Sender (optional - system notifications don't have a sender)
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Notification Type
  type: {
    type: String,
    enum: [
      // Booking notifications
      'booking_created',
      'booking_assigned',
      'booking_accepted',
      'booking_rejected',
      'booking_started',
      'booking_completed',
      'booking_cancelled',
      'booking_reminder',
      'booking_en_route',
      'booking_arrived',
      'booking_in_progress',
      'booking_paused',
      'counter_offer_submitted',
      'counter_offer_accepted',
      'counter_offer_rejected',
      'completion_requested',
      'completion_confirmed',
      'completion_rejected',

      // Payment notifications
      'payment_received',
      'payment_sent',
      'payment_failed',
      'payout_processed',
      'refund_processed',
      'booking_fee_required',
      'booking_fee_held',
      'booking_fee_released',

      // Message notifications
      'new_message',
      'message_reaction',
      'mention',

      // Social notifications
      'new_follower',
      'post_liked',
      'post_commented',
      'post_shared',
      'comment_liked',
      'comment_reply',

      // Review notifications
      'review_received',
      'review_response',

      // System notifications
      'account_verified',
      'profile_approved',
      'profile_rejected',
      'subscription_expiring',
      'subscription_renewed',
      'promotion',
      'system_update',
      'security_alert',

      // Achievement notifications
      'milestone_reached',
      'badge_earned',
      'level_up'
    ],
    required: true
  },

  // Notification Content
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  image: String,

  // Action Data
  actionData: {
    type: Schema.Types.Mixed,
    // Examples:
    // { bookingId: '...', action: 'view_booking' }
    // { postId: '...', action: 'view_post' }
    // { userId: '...', action: 'view_profile' }
  },

  // Deep Link (for mobile apps)
  deepLink: String, // e.g., 'dumuwaks://booking/123'

  // Related Documents
  relatedBooking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  },
  relatedPost: {
    type: Schema.Types.ObjectId,
    ref: 'Post'
  },
  relatedReview: {
    type: Schema.Types.ObjectId,
    ref: 'Review'
  },
  relatedMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  relatedTransaction: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  },

  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,

  // Delivery Status
  deliveryStatus: {
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      failed: { type: Boolean, default: false },
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      failed: { type: Boolean, default: false },
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      failed: { type: Boolean, default: false },
      error: String
    },
    whatsapp: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      failed: { type: Boolean, default: false },
      error: String
    }
  },

  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Expiry
  expiresAt: Date,

  // Category (for grouping)
  category: {
    type: String,
    enum: ['booking', 'payment', 'social', 'message', 'system', 'achievement'],
    required: true
  },

  // For grouped notifications (e.g., "John and 5 others liked your post")
  isGrouped: {
    type: Boolean,
    default: false
  },
  groupKey: String, // Used to group similar notifications
  groupCount: {
    type: Number,
    default: 1
  },

  // Soft Delete
  deletedAt: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== INDEXES =====
NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1 });
NotificationSchema.index({ recipient: 1, category: 1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 });
NotificationSchema.index({ groupKey: 1, recipient: 1 });

// Compound index for unread notifications
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// ===== VIRTUALS =====
NotificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

NotificationSchema.virtual('age').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
});

// ===== MIDDLEWARE =====

// Delete expired notifications
NotificationSchema.pre('find', function() {
  if (!this.getOptions().includeExpired) {
    this.where({
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });
  }
});

// ===== METHODS =====

// Mark as read
NotificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Mark as unread
NotificationSchema.methods.markAsUnread = async function() {
  this.isRead = false;
  this.readAt = null;
  await this.save();
  return this;
};

// Update delivery status
NotificationSchema.methods.updateDeliveryStatus = async function(channel, success, error = null) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].sent = success;
    this.deliveryStatus[channel].sentAt = new Date();

    if (!success) {
      this.deliveryStatus[channel].failed = true;
      this.deliveryStatus[channel].error = error;
    }

    await this.save();
  }
  return this;
};

// Delete notification
NotificationSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  await this.save();
  return this;
};

// ===== STATIC METHODS =====

// Get user notifications
NotificationSchema.statics.getUserNotifications = function(
  userId,
  filters = {},
  page = 1,
  limit = 20
) {
  const query = {
    recipient: userId,
    deletedAt: { $exists: false },
    ...filters
  };

  return this.find(query)
    .populate('sender', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Get unread notifications
NotificationSchema.statics.getUnreadNotifications = function(userId, page = 1, limit = 20) {
  return this.find({
    recipient: userId,
    isRead: false,
    deletedAt: { $exists: false }
  })
  .populate('sender', 'firstName lastName profilePicture')
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
};

// Get unread count
NotificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    deletedAt: { $exists: false }
  });
};

// Get unread count by category
NotificationSchema.statics.getUnreadCountByCategory = async function(userId) {
  return this.aggregate([
    {
      $match: {
        recipient: userId,
        isRead: false,
        deletedAt: { $exists: false }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Mark all as read
NotificationSchema.statics.markAllAsRead = async function(userId, category = null) {
  const query = {
    recipient: userId,
    isRead: false,
    deletedAt: { $exists: false }
  };

  if (category) {
    query.category = category;
  }

  return this.updateMany(query, {
    isRead: true,
    readAt: new Date()
  });
};

// Delete all read notifications
NotificationSchema.statics.deleteAllRead = async function(userId) {
  return this.updateMany(
    {
      recipient: userId,
      isRead: true,
      deletedAt: { $exists: false }
    },
    {
      deletedAt: new Date()
    }
  );
};

// Create notification (with grouping logic)
NotificationSchema.statics.createNotification = async function(data) {
  // Check if we should group this notification
  if (data.groupKey) {
    const recentSimilar = await this.findOne({
      recipient: data.recipient,
      type: data.type,
      groupKey: data.groupKey,
      isRead: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
    });

    if (recentSimilar) {
      // Update existing grouped notification
      recentSimilar.groupCount++;
      recentSimilar.body = `${recentSimilar.groupCount} new ${data.type.replace('_', ' ')}s`;
      recentSimilar.createdAt = new Date(); // Move to top
      await recentSimilar.save();
      return recentSimilar;
    }
  }

  // Create new notification
  return this.create(data);
};

// Send notification to multiple users
NotificationSchema.statics.sendToMultiple = async function(userIds, data) {
  const notifications = userIds.map(userId => ({
    ...data,
    recipient: userId
  }));

  return this.insertMany(notifications);
};

// Clean up old read notifications
NotificationSchema.statics.cleanupOldNotifications = async function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  return this.deleteMany({
    isRead: true,
    createdAt: { $lt: cutoffDate }
  });
};

// Clean up expired notifications
NotificationSchema.statics.cleanupExpiredNotifications = async function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Get notification statistics
NotificationSchema.statics.getNotificationStats = async function(userId, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        recipient: userId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);
};

// Get notifications by type
NotificationSchema.statics.getByType = function(userId, type, page = 1, limit = 20) {
  return this.find({
    recipient: userId,
    type,
    deletedAt: { $exists: false }
  })
  .populate('sender', 'firstName lastName profilePicture')
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
};

module.exports = mongoose.model('Notification', NotificationSchema);
