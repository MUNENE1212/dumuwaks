const Notification = require('../models/Notification');
const admin = require('firebase-admin');
const whatsappNotifier = require('./whatsapp/notifier.service');

/**
 * Notification Service
 * Handles push notifications and in-app notifications
 */

// Initialize Firebase Admin (if credentials are provided)
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return true;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });
    } else {
      console.warn('⚠️  Firebase credentials not configured. Push notifications will not work.');
      return false;
    }

    firebaseInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    return false;
  }
};

/**
 * Create in-app notification
 */
exports.createNotification = async (recipientId, data) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      ...data
    });

    // Mirror to WhatsApp in the background; it never blocks or fails the caller.
    whatsappNotifier.deliver(notification).catch(() => {});

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw new Error(`Failed to create notification: ${error.message}`);
  }
};

/**
 * Send push notification
 */
exports.sendPushNotification = async (fcmTokens, title, body, data = {}) => {
  try {
    if (!initializeFirebase()) {
      console.warn('⚠️  Push notification skipped - Firebase not initialized');
      return { success: false, message: 'Firebase not configured' };
    }

    if (!fcmTokens || fcmTokens.length === 0) {
      console.warn('⚠️  No FCM tokens provided');
      return { success: false, message: 'No FCM tokens' };
    }

    const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      tokens
    };

    const response = await admin.messaging().sendMulticast(message);

    return { success: true, response };
  } catch (error) {
    console.error('Push notification error:', error);
    throw new Error(`Failed to send push notification: ${error.message}`);
  }
};

/**
 * Notify new booking
 */
exports.notifyNewBooking = async (user, booking) => {
  // Create in-app notification
  await exports.createNotification(user._id, {
    type: 'booking',
    title: 'New Booking Request',
    body: `You have a new booking request for ${booking.serviceCategory}`,
    category: 'booking',
    relatedBooking: booking._id,
    data: {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber
    },
    priority: 'high'
  });

  // Send push notification
  if (user.fcmTokens && user.fcmTokens.length > 0) {
    const tokens = user.fcmTokens.map(t => t.token);
    await exports.sendPushNotification(
      tokens,
      'New Booking Request',
      `You have a new booking for ${booking.serviceCategory}`,
      {
        type: 'booking',
        bookingId: booking._id.toString()
      }
    );
  }
};

/**
 * Notify booking status change
 */
exports.notifyBookingStatusChange = async (user, booking, status) => {
  const statusMessages = {
    accepted: 'Your booking has been accepted',
    rejected: 'Your booking was declined',
    in_progress: 'Your booking is now in progress',
    completed: 'Your booking has been completed',
    cancelled: 'Your booking has been cancelled'
  };

  const body = statusMessages[status] || `Booking status changed to ${status}`;

  await exports.createNotification(user._id, {
    type: 'booking_update',
    title: 'Booking Update',
    body,
    category: 'booking',
    relatedBooking: booking._id,
    data: {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      status
    },
    priority: 'medium'
  });

  if (user.fcmTokens && user.fcmTokens.length > 0) {
    const tokens = user.fcmTokens.map(t => t.token);
    await exports.sendPushNotification(
      tokens,
      'Booking Update',
      body,
      {
        type: 'booking_update',
        bookingId: booking._id.toString(),
        status
      }
    );
  }
};

/**
 * Notify payment received
 */
exports.notifyPaymentReceived = async (user, transaction) => {
  await exports.createNotification(user._id, {
    type: 'payment',
    title: 'Payment Received',
    body: `You received a payment of KES ${transaction.amount.net}`,
    category: 'payment',
    relatedTransaction: transaction._id,
    data: {
      transactionId: transaction._id,
      transactionNumber: transaction.transactionNumber,
      amount: transaction.amount.net
    },
    priority: 'high'
  });

  if (user.fcmTokens && user.fcmTokens.length > 0) {
    const tokens = user.fcmTokens.map(t => t.token);
    await exports.sendPushNotification(
      tokens,
      'Payment Received',
      `You received KES ${transaction.amount.net}`,
      {
        type: 'payment',
        transactionId: transaction._id.toString()
      }
    );
  }
};

/**
 * Notify new message
 */
exports.notifyNewMessage = async (user, sender, messageText) => {
  await exports.createNotification(user._id, {
    type: 'new_message',
    title: `New message from ${sender.firstName}`,
    body: messageText.substring(0, 100),
    category: 'message',
    sender: sender._id,
    data: {
      senderId: sender._id,
      senderName: `${sender.firstName} ${sender.lastName}`
    },
    priority: 'medium'
  });

  if (user.fcmTokens && user.fcmTokens.length > 0) {
    const tokens = user.fcmTokens.map(t => t.token);
    await exports.sendPushNotification(
      tokens,
      `${sender.firstName} ${sender.lastName}`,
      messageText.substring(0, 100),
      {
        type: 'message',
        senderId: sender._id.toString()
      }
    );
  }
};

/**
 * Notify new review
 */
exports.notifyNewReview = async (user, reviewer, rating) => {
  await exports.createNotification(user._id, {
    type: 'review_received',
    title: 'New Review',
    body: `${reviewer.firstName} left you a ${rating}-star review`,
    category: 'social',
    sender: reviewer._id,
    data: {
      reviewerId: reviewer._id,
      rating
    },
    priority: 'low'
  });

  if (user.fcmTokens && user.fcmTokens.length > 0) {
    const tokens = user.fcmTokens.map(t => t.token);
    await exports.sendPushNotification(
      tokens,
      'New Review',
      `${reviewer.firstName} left you a ${rating}-star review`,
      {
        type: 'review',
        reviewerId: reviewer._id.toString()
      }
    );
  }
};

/**
 * Mark notifications as read
 */
exports.markAsRead = async (notificationIds, userId) => {
  try {
    await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        recipient: userId
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Mark as read error:', error);
    throw error;
  }
};

/**
 * Get unread count
 */
exports.getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    return count;
  } catch (error) {
    console.error('Get unread count error:', error);
    throw error;
  }
};

// ===== BOOKING-SPECIFIC NOTIFICATIONS =====

/**
 * Notify booking accepted
 */
exports.notifyBookingAccepted = async (booking) => {
  const customerId = booking.customer._id || booking.customer;
  const technicianName = booking.technician?.firstName || 'The technician';

  await exports.createNotification(customerId, {
    type: 'booking_accepted',
    title: 'Booking Accepted',
    body: `${technicianName} has accepted your booking #${booking.bookingNumber}`,
    category: 'booking',
    relatedBooking: booking._id,
    priority: 'high',
    actionData: {
      bookingId: booking._id,
      action: 'view_booking'
    }
  });
};

/**
 * Notify booking rejected
 */
exports.notifyBookingRejected = async (booking) => {
  const customerId = booking.customer._id || booking.customer;

  await exports.createNotification(customerId, {
    type: 'booking_rejected',
    title: 'Booking Declined',
    body: `Booking #${booking.bookingNumber} was declined. We're finding another technician for you.`,
    category: 'booking',
    relatedBooking: booking._id,
    priority: 'high'
  });
};

/**
 * Notify counter offer submitted
 */
exports.notifyCounterOfferSubmitted = async (booking, technicianName) => {
  const customerId = booking.customer._id || booking.customer;

  await exports.createNotification(customerId, {
    type: 'counter_offer_submitted',
    title: 'Counter Offer Received',
    body: `${technicianName} submitted a counter offer for booking #${booking.bookingNumber}`,
    category: 'booking',
    relatedBooking: booking._id,
    priority: 'high',
    actionData: {
      bookingId: booking._id,
      action: 'view_counter_offer'
    }
  });
};

/**
 * Notify counter offer accepted
 */
exports.notifyCounterOfferAccepted = async (booking, customerName) => {
  const technicianId = booking.technician._id || booking.technician;

  await exports.createNotification(technicianId, {
    type: 'counter_offer_accepted',
    title: 'Counter Offer Accepted',
    body: `${customerName} accepted your counter offer for booking #${booking.bookingNumber}`,
    category: 'booking',
    relatedBooking: booking._id,
    priority: 'high'
  });
};

/**
 * Notify counter offer rejected
 */
exports.notifyCounterOfferRejected = async (booking, customerName) => {
  const technicianId = booking.technician._id || booking.technician;

  await exports.createNotification(technicianId, {
    type: 'counter_offer_rejected',
    title: 'Counter Offer Rejected',
    body: `${customerName} rejected your counter offer for booking #${booking.bookingNumber}`,
    category: 'booking',
    relatedBooking: booking._id,
    priority: 'normal'
  });
};

/**
 * Notify status change (en_route, arrived, in_progress, paused)
 */
exports.notifyStatusChange = async (booking, status, recipientId, body) => {
  const statusTypeMap = {
    en_route: 'booking_en_route',
    arrived: 'booking_arrived',
    in_progress: 'booking_in_progress',
    paused: 'booking_paused',
    cancelled: 'booking_cancelled'
  };

  const statusTitles = {
    en_route: 'Technician On The Way',
    arrived: 'Technician Arrived',
    in_progress: 'Work Started',
    paused: 'Job Paused',
    cancelled: 'Booking Cancelled'
  };

  await exports.createNotification(recipientId, {
    type: statusTypeMap[status] || 'booking_started',
    title: statusTitles[status] || 'Booking Update',
    body: body || `Booking #${booking.bookingNumber} status updated to ${status}`,
    category: 'booking',
    relatedBooking: booking._id,
    priority: ['en_route', 'arrived'].includes(status) ? 'high' : 'normal'
  });
};

/**
 * Notify completion requested
 */
exports.notifyCompletionRequested = async (booking, technicianName) => {
  const customerId = booking.customer._id || booking.customer;

  await exports.createNotification(customerId, {
    type: 'completion_requested',
    title: 'Job Completion - Action Required',
    body: `${technicianName} has completed booking #${booking.bookingNumber}. Please confirm to release payment.`,
    category: 'booking',
    relatedBooking: booking._id,
    priority: 'urgent',
    actionData: {
      bookingId: booking._id,
      action: 'confirm_completion'
    }
  });
};

/**
 * Notify completion confirmed/rejected
 */
exports.notifyCompletionResponse = async (booking, customerName, approved) => {
  const technicianId = booking.technician._id || booking.technician;

  await exports.createNotification(technicianId, {
    type: approved ? 'completion_confirmed' : 'completion_rejected',
    title: approved ? 'Job Approved' : 'Job Completion Rejected',
    body: approved
      ? `${customerName} confirmed completion of booking #${booking.bookingNumber}. Payment will be released soon.`
      : `${customerName} reported issues with booking #${booking.bookingNumber}. Please check the details.`,
    category: 'booking',
    relatedBooking: booking._id,
    priority: 'high'
  });
};

/**
 * Notify payment required
 */
exports.notifyPaymentRequired = async (booking) => {
  const customerId = booking.customer._id || booking.customer;

  await exports.createNotification(customerId, {
    type: 'booking_fee_required',
    title: 'Payment Required',
    body: `Complete booking fee payment for #${booking.bookingNumber} to proceed with technician matching`,
    category: 'payment',
    relatedBooking: booking._id,
    priority: 'urgent',
    actionData: {
      bookingId: booking._id,
      action: 'pay_booking_fee'
    }
  });
};

module.exports = exports;
