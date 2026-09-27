const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Booking = require('../models/Booking');
const { registerTrackingHandlers } = require('../socketHandlers/tracking.handler');
const { registerBookingNotificationHandlers } = require('../socketHandlers/bookingNotification.handler');
const { registerMessagingHandlers } = require('../socketHandlers/messaging.handler');
const { registerAvailabilityHandlers } = require('../socketHandlers/availability.handler');
const { registerPricingHandlers } = require('../socketHandlers/pricing.handler');
const { registerAnalyticsHandlers } = require('../socketHandlers/analytics.handler');

/**
 * Socket.IO Configuration
 * Handles real-time communication for messages, notifications, and live updates
 */

let io;

/**
 * Initialize Socket.IO
 */
exports.initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: [
        process.env.CLIENT_WEB_URL,
        'https://dumuwaks.co.ke',
        'https://www.dumuwaks.co.ke',
        'https://dumuwaks.ementech.co.ke',
        'https://api.ementech.co.ke',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:5174'
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(socket.userId);

    // Support and admin share a room for desk-wide events (WhatsApp requests)
    if (['support', 'admin'].includes(socket.user?.role)) {
      socket.join('staff');
    }

    // Update user online status
    updateUserOnlineStatus(socket.userId, true);

    // Handle user joining conversation (with participant validation)
    socket.on('join_conversation', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }
        const isParticipant = conversation.participants.some(
          p => p.user.toString() === socket.userId
        );
        if (!isParticipant) {
          return socket.emit('error', { message: 'Not a participant in this conversation' });
        }
        socket.join(`conversation:${conversationId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle user leaving conversation
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Handle typing indicator
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId
      });
    });

    // Handle stop typing
    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        userId: socket.userId,
        conversationId
      });
    });

    // Handle booking updates (with participant validation)
    socket.on('subscribe_booking', async (bookingId) => {
      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          return socket.emit('error', { message: 'Booking not found' });
        }
        const userId = socket.userId;
        const isParticipant =
          booking.customer?.toString() === userId ||
          booking.technician?.toString() === userId ||
          socket.user?.role === 'admin' ||
          socket.user?.role === 'support';
        if (!isParticipant) {
          return socket.emit('error', { message: 'Not authorized for this booking' });
        }
        socket.join(`booking:${bookingId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to subscribe to booking' });
      }
    });

    socket.on('unsubscribe_booking', (bookingId) => {
      socket.leave(`booking:${bookingId}`);
    });

    // Handle location updates (for technician tracking)
    socket.on('update_location', ({ bookingId, location }) => {
      socket.to(`booking:${bookingId}`).emit('technician_location', {
        technicianId: socket.userId,
        location,
        timestamp: new Date()
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
      updateUserOnlineStatus(socket.userId, false);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Register tracking handlers for real-time technician location tracking
  registerTrackingHandlers(io);

  // Register booking notification handlers for real-time booking status updates
  registerBookingNotificationHandlers(io);

  // Register messaging handlers for real-time messaging features
  registerMessagingHandlers(io);

  // Register availability handlers for real-time availability & queue system
  registerAvailabilityHandlers(io);

  // Register pricing handlers for real-time pricing & negotiation
  registerPricingHandlers(io);

  // Register analytics handlers for real-time admin dashboard
  registerAnalyticsHandlers(io);

  console.log('✅ Socket.IO initialized');
  return io;
};

/**
 * Get Socket.IO instance
 */
exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Emit event to specific user
 */
exports.emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(userId).emit(event, data);
};

/**
 * Emit event to conversation
 */
exports.emitToConversation = (conversationId, event, data) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, data);
};

/**
 * Emit event to booking subscribers
 */
exports.emitToBooking = (bookingId, event, data) => {
  if (!io) return;
  io.to(`booking:${bookingId}`).emit(event, data);
};

/**
 * Emit event to support and admin staff
 */
exports.emitToStaff = (event, data) => {
  if (!io) return;
  io.to('staff').emit(event, data);
};

/**
 * Broadcast to all connected users
 */
exports.broadcast = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

/**
 * Send new message notification
 */
exports.sendNewMessage = (conversationId, message) => {
  this.emitToConversation(conversationId, 'new_message', message);
};

/**
 * Send booking update notification
 */
exports.sendBookingUpdate = (bookingId, update) => {
  this.emitToBooking(bookingId, 'booking_update', update);
};

/**
 * Send notification to user
 */
exports.sendNotification = (userId, notification) => {
  this.emitToUser(userId, 'notification', notification);
};

/**
 * Update user online status
 */
const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    await User.findByIdAndUpdate(userId, {
      isOnline,
      ...(isOnline ? {} : { lastSeen: new Date() })
    });
  } catch (error) {
    console.error('Error updating user online status:', error);
  }
};

/**
 * Get online users count
 */
exports.getOnlineUsersCount = () => {
  if (!io) return 0;
  return io.sockets.sockets.size;
};

/**
 * Check if user is online
 */
exports.isUserOnline = (userId) => {
  if (!io) return false;
  const userSockets = io.sockets.adapter.rooms.get(userId);
  return userSockets && userSockets.size > 0;
};

module.exports = exports;
