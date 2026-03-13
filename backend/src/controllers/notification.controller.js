const Notification = require('../models/Notification');

/**
 * @desc    Create a notification
 * @route   POST /api/v1/notifications
 * @access  Private (Admin/System)
 */
exports.createNotification = async (req, res) => {
  try {
    const {
      recipient,
      type,
      title,
      message,
      data,
      channels,
      priority,
      deepLink,
      actionData
    } = req.body;

    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      data,
      channels: channels || ['push'],
      priority: priority || 'normal',
      deepLink,
      actionData,
      deliveryStatus: {
        push: channels?.includes('push') ? { sent: false } : undefined,
        email: channels?.includes('email') ? { sent: false } : undefined,
        sms: channels?.includes('sms') ? { sent: false } : undefined
      }
    });

    // Send push notification if requested
    if (channels?.includes('push')) {
      try {
        const notificationService = require('../services/notification.service');
        const User = require('../models/User');
        const recipient = await User.findById(recipientId).select('fcmTokens');
        if (recipient?.fcmTokens?.length > 0) {
          const tokens = recipient.fcmTokens.map(t => t.token);
          await notificationService.sendPushNotification(tokens, title, message, data || {});
          notification.deliveryStatus.push = { sent: true, sentAt: new Date() };
          await notification.save();
        }
      } catch (pushError) {
        console.error('Push notification error:', pushError);
      }
    }
    // Email and SMS channels require provider configuration (deferred)

    // Emit real-time notification
    try {
      const { emitToUser } = require('../config/socket');
      emitToUser(recipientId.toString(), 'notification', { notificationId: notification._id, title, body: message });
    } catch (socketError) {
      console.error('Socket notification error:', socketError);
    }

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
    });
  }
};

/**
 * @desc    Get all notifications for user
 * @route   GET /api/v1/notifications
 * @access  Private
 */
exports.getNotifications = async (req, res) => {
  try {
    const {
      isRead,
      type,
      priority,
      category,
      page = 1,
      limit = 20
    } = req.query;

    const query = { recipient: req.user.id };

    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    // Don't show expired notifications
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
};

/**
 * @desc    Get single notification
 * @route   GET /api/v1/notifications/:id
 * @access  Private
 */
exports.getNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this notification'
      });
    }

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification'
    });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/v1/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();

    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read'
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/v1/notifications/mark-all-read
 * @access  Private
 */
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read'
    });
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification'
    });
  }
};

/**
 * @desc    Delete all read notifications
 * @route   DELETE /api/v1/notifications/clear-read
 * @access  Private
 */
exports.clearReadNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id,
      isRead: true
    });

    res.status(200).json({
      success: true,
      message: 'Read notifications cleared successfully'
    });
  } catch (error) {
    console.error('Clear read notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing read notifications'
    });
  }
};

/**
 * @desc    Get notification preferences
 * @route   GET /api/v1/notifications/preferences
 * @access  Private
 */
exports.getPreferences = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('preferences.notifications');

    res.status(200).json({
      success: true,
      preferences: user.preferences?.notifications || {}
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification preferences'
    });
  }
};

/**
 * @desc    Update notification preferences
 * @route   PUT /api/v1/notifications/preferences
 * @access  Private
 */
exports.updatePreferences = async (req, res) => {
  try {
    const User = require('../models/User');
    const { emailNotifications, pushNotifications, smsNotifications } = req.body;

    const user = await User.findById(req.user.id);

    if (!user.preferences) user.preferences = {};
    if (!user.preferences.notifications) user.preferences.notifications = {};

    if (emailNotifications !== undefined) {
      user.preferences.notifications.email = emailNotifications;
    }
    if (pushNotifications !== undefined) {
      user.preferences.notifications.push = pushNotifications;
    }
    if (smsNotifications !== undefined) {
      user.preferences.notifications.sms = smsNotifications;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: user.preferences.notifications
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences'
    });
  }
};
