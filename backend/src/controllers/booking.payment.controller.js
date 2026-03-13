const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const {
  BOOKING_POPULATES,
  isCustomer,
  isTechnician,
  isSupportOrAdmin,
  getBookingRole,
  notFound,
  notAuthorized
} = require('../utils/bookingHelpers');

/**
 * @desc    Confirm booking fee payment (20% refundable deposit)
 * @route   POST /api/v1/bookings/:id/booking-fee/confirm
 * @access  Private (Customer)
 */
exports.confirmBookingFee = async (req, res) => {
  try {
    const { transactionId, paymentMethod } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify customer owns this booking
    if (!isCustomer(booking, req.user.id)) {
      return notAuthorized(res, 'Not authorized to confirm booking fee for this booking');
    }

    // Check if booking fee already paid
    if (booking.bookingFee.status === 'paid' || booking.bookingFee.status === 'held') {
      return res.status(400).json({
        success: false,
        message: 'Booking fee already paid'
      });
    }

    // Verify transaction exists and matches booking fee amount
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.amount !== booking.bookingFee.amount) {
      return res.status(400).json({
        success: false,
        message: `Transaction amount (${transaction.amount}) does not match booking fee (${booking.bookingFee.amount})`
      });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Transaction must be completed before confirming booking fee'
      });
    }

    // Update booking fee status
    booking.bookingFee.status = 'held';
    booking.bookingFee.paidAt = new Date();
    booking.bookingFee.heldInEscrow = true;
    booking.bookingFee.transactionId = transactionId;

    // Update booking status to allow matching
    if (booking.status === 'pending') {
      // If there's a preferred technician, assign them now that payment is confirmed
      if (booking.preferredTechnician) {
        booking.technician = booking.preferredTechnician;
        booking.status = 'assigned';
        booking.statusHistory.push({
          status: 'assigned',
          changedBy: req.user.id,
          changedAt: new Date(),
          reason: 'Payment verified, preferred technician assigned'
        });

        // Notify assigned technician
        try {
          const User = require('../models/User');
          const notificationService = require('../services/notification.service');
          const tech = await User.findById(booking.technician);
          if (tech) {
            await notificationService.notifyNewBooking(tech, booking);
          }
          // Create conversation between customer and technician
          const Conversation = require('../models/Conversation');
          const existingConv = await Conversation.findOne({
            'participants.user': { $all: [booking.customer, booking.technician] },
            booking: booking._id
          });
          if (!existingConv) {
            await Conversation.create({
              participants: [
                { user: booking.customer, role: 'customer' },
                { user: booking.technician, role: 'technician' }
              ],
              booking: booking._id,
              type: 'booking'
            });
          }
        } catch (notifError) {
          console.error('Notification/conversation error:', notifError);
        }
      } else {
        // No preferred technician, move to matching status
        booking.status = 'matching';
        booking.statusHistory.push({
          status: 'matching',
          changedBy: req.user.id,
          changedAt: new Date(),
          reason: 'Booking fee confirmed, ready for technician matching'
        });

        // Trigger matching via socket event
        try {
          const { emitToBooking } = require('../config/socket');
          emitToBooking(booking._id.toString(), 'matching:new_booking', {
            bookingId: booking._id,
            serviceCategory: booking.serviceCategory,
            serviceType: booking.serviceType,
            location: booking.serviceLocation
          });
        } catch (socketError) {
          console.error('Matching trigger error:', socketError);
        }
      }
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking fee confirmed and held in escrow',
      booking: {
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        bookingFee: booking.bookingFee
      }
    });

  } catch (error) {
    console.error('Confirm booking fee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming booking fee',
    });
  }
};

/**
 * @desc    Release booking fee to technician after job completion
 * @route   POST /api/v1/bookings/:id/booking-fee/release
 * @access  Private (System/Support)
 */
exports.releaseBookingFee = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate(BOOKING_POPULATES.feeRelease);

    if (!booking) return notFound(res);

    // Only support or system can release booking fee
    if (!isSupportOrAdmin(req.user.role)) {
      return notAuthorized(res, 'Not authorized to release booking fee');
    }

    // Check if booking fee is held in escrow
    if (booking.bookingFee.status !== 'held') {
      return res.status(400).json({
        success: false,
        message: `Cannot release booking fee with status: ${booking.bookingFee.status}`
      });
    }

    // Check if job is verified
    if (booking.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Job must be verified before releasing booking fee'
      });
    }

    // Create transaction for booking fee release
    const releaseTransaction = await Transaction.create({
      type: 'booking_fee_release',
      amount: booking.bookingFee.amount,
      currency: booking.pricing.currency,
      sender: booking.customer?._id,
      recipient: booking.technician?._id,
      booking: booking._id,
      status: 'completed',
      method: 'escrow_release',
      description: `Booking fee release for ${booking.bookingNumber}`,
      metadata: {
        originalTransactionId: booking.bookingFee.transactionId,
        releasedBy: req.user.id,
        releaseCondition: booking.bookingFee.escrowReleaseCondition
      }
    });

    // Update booking fee status
    booking.bookingFee.status = 'released';
    booking.bookingFee.releasedAt = new Date();
    booking.bookingFee.heldInEscrow = false;

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking fee released to technician',
      booking: {
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        bookingFee: booking.bookingFee
      },
      transaction: releaseTransaction
    });

  } catch (error) {
    console.error('Release booking fee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error releasing booking fee',
    });
  }
};

/**
 * @desc    Refund booking fee (if booking cancelled before completion)
 * @route   POST /api/v1/bookings/:id/booking-fee/refund
 * @access  Private (Support/Admin)
 */
exports.refundBookingFee = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate(BOOKING_POPULATES.feeRefund);

    if (!booking) return notFound(res);

    // Only support or admin can refund booking fee
    if (!isSupportOrAdmin(req.user.role)) {
      return notAuthorized(res, 'Not authorized to refund booking fee');
    }

    // Check if booking fee is held
    if (booking.bookingFee.status !== 'held') {
      return res.status(400).json({
        success: false,
        message: `Cannot refund booking fee with status: ${booking.bookingFee.status}`
      });
    }

    // Verify booking is cancelled or disputed
    if (!['cancelled', 'disputed', 'rejected'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Booking must be cancelled, disputed, or rejected to refund booking fee'
      });
    }

    // Create refund transaction
    const refundTransaction = await Transaction.create({
      type: 'booking_fee_refund',
      amount: booking.bookingFee.amount,
      currency: booking.pricing.currency,
      sender: 'system',
      recipient: booking.customer?._id,
      booking: booking._id,
      status: 'completed',
      method: 'escrow_refund',
      description: `Booking fee refund for ${booking.bookingNumber}`,
      metadata: {
        originalTransactionId: booking.bookingFee.transactionId,
        refundedBy: req.user.id,
        refundReason: reason || 'Booking cancelled',
        bookingStatus: booking.status
      }
    });

    // Update booking fee status
    booking.bookingFee.status = 'refunded';
    booking.bookingFee.refundedAt = new Date();
    booking.bookingFee.refundTransactionId = refundTransaction._id;
    booking.bookingFee.heldInEscrow = false;
    booking.bookingFee.notes = reason || 'Booking cancelled';

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking fee refunded to customer',
      booking: {
        id: booking._id,
        bookingNumber: booking.bookingNumber,
        bookingFee: booking.bookingFee
      },
      transaction: refundTransaction
    });

  } catch (error) {
    console.error('Refund booking fee error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refunding booking fee',
    });
  }
};

/**
 * @desc    Get booking fee status
 * @route   GET /api/v1/bookings/:id/booking-fee
 * @access  Private
 */
exports.getBookingFeeStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .select('bookingNumber bookingFee pricing customer technician status')
      .populate('bookingFee.transactionId', 'amount status method createdAt')
      .populate('bookingFee.refundTransactionId', 'amount status method createdAt');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify user is customer, technician, or support
    const { authorized } = getBookingRole(booking, req.user.id, req.user.role);

    if (!authorized) {
      return notAuthorized(res, 'Not authorized to view booking fee status');
    }

    res.status(200).json({
      success: true,
      bookingFee: booking.bookingFee,
      bookingStatus: booking.status,
      totalAmount: booking.pricing.totalAmount,
      remainingAmount: booking.pricing.totalAmount - booking.bookingFee.amount
    });

  } catch (error) {
    console.error('Get booking fee status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking fee status',
    });
  }
};
