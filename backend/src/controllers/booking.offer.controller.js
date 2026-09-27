const Booking = require('../models/Booking');
const {
  findBookingPopulated,
  isTechnician,
  isCustomer,
  notFound,
  notAuthorized
} = require('../utils/bookingHelpers');

// Maximum negotiation rounds allowed
const MAX_NEGOTIATION_ROUNDS = 5;

// Counter-offer expiration time in hours
const COUNTER_OFFER_EXPIRATION_HOURS = 24;

/**
 * @desc    Accept booking (Technician)
 * @route   POST /api/v1/bookings/:id/accept
 * @access  Private (Technician)
 */
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await findBookingPopulated(req.params.id, 'offers');

    if (!booking) return notFound(res);

    if (!isTechnician(booking, req.user.id)) {
      return notAuthorized(res, 'You are not assigned to this booking');
    }

    // Verify booking is in assigned status
    if (booking.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept booking in ${booking.status} status`
      });
    }

    // IMPORTANT: Verify booking fee has been paid
    const paymentVerified =
      ['held', 'paid', 'released'].includes(booking.bookingFee?.status) ||
      // Real escrow: the full price is held (processing) or already paid out (completed)
      (booking.paymentProvider === 'intasend' && ['processing', 'completed'].includes(booking.payment?.status));
    if (!paymentVerified) {
      return res.status(400).json({
        success: false,
        message: 'Cannot accept booking. Customer must complete booking fee payment first.',
        bookingFee: {
          status: booking.bookingFee?.status || 'pending',
          amount: booking.bookingFee?.amount || 0,
          required: true
        }
      });
    }

    // Update booking status to accepted
    booking.status = 'accepted';
    booking.statusHistory.push({
      status: 'accepted',
      changedBy: req.user.id,
      changedAt: new Date(),
      notes: 'Technician accepted the booking'
    });

    await booking.save();

    // Create notification for customer
    try {
      const notificationService = require('../services/notification.service');
      await notificationService.notifyBookingAccepted(booking);
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      booking
    });

  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting booking',
    });
  }
};

/**
 * @desc    Reject booking (Technician)
 * @route   POST /api/v1/bookings/:id/reject
 * @access  Private (Technician)
 */
exports.rejectBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await findBookingPopulated(req.params.id, 'offers');

    if (!booking) return notFound(res);

    if (!isTechnician(booking, req.user.id)) {
      return notAuthorized(res, 'You are not assigned to this booking');
    }

    // Verify booking is in assigned status
    if (booking.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject booking in ${booking.status} status`
      });
    }

    // Update booking status to rejected
    booking.status = 'rejected';
    booking.statusHistory.push({
      status: 'rejected',
      changedBy: req.user.id,
      changedAt: new Date(),
      reason: reason || 'Technician rejected the booking',
      notes: reason
    });

    // Clear technician assignment
    booking.technician = null;

    await booking.save();

    // Notify customer
    try {
      const notificationService = require('../services/notification.service');
      await notificationService.notifyBookingRejected(booking);
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    // Trigger re-matching process
    try {
      booking.status = 'matching';
      await booking.save();
      const { emitToBooking } = require('../config/socket');
      emitToBooking(booking._id.toString(), 'matching:re_match', {
        bookingId: booking._id,
        serviceCategory: booking.serviceCategory,
        serviceType: booking.serviceType,
        rejectedBy: req.user.id
      });
    } catch (matchError) {
      console.error('Re-matching trigger error:', matchError);
    }

    res.status(200).json({
      success: true,
      message: 'Booking rejected. Finding another technician...',
      booking
    });

  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting booking',
    });
  }
};

/**
 * @desc    Submit counter offer (Technician)
 * @route   POST /api/v1/bookings/:id/counter-offer
 * @access  Private (Technician)
 */
exports.submitCounterOffer = async (req, res) => {
  try {
    const { proposedAmount, reason, additionalNotes, expiresInHours } = req.body;

    if (!proposedAmount || proposedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid proposed amount is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason for counter offer is required'
      });
    }

    const booking = await findBookingPopulated(req.params.id, 'offers');

    if (!booking) return notFound(res);

    if (!isTechnician(booking, req.user.id)) {
      return notAuthorized(res, 'You are not assigned to this booking');
    }

    // Verify booking is in assigned status (or counter-offer rejected state)
    if (!['assigned'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit counter offer for booking in ${booking.status} status`
      });
    }

    // Check max negotiation rounds
    const currentRound = booking.negotiationHistory?.length || 0;
    if (currentRound >= MAX_NEGOTIATION_ROUNDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum negotiation rounds (${MAX_NEGOTIATION_ROUNDS}) reached. Please accept or reject the booking.`
      });
    }

    // Mark previous pending offers as superseded
    if (booking.negotiationHistory && booking.negotiationHistory.length > 0) {
      booking.negotiationHistory.forEach(offer => {
        if (offer.status === 'pending') {
          offer.status = 'superseded';
        }
      });
    }

    // Calculate new pricing breakdown based on proposed amount
    const originalPricing = booking.pricing;
    const priceRatio = proposedAmount / originalPricing.totalAmount;

    const proposedPricing = {
      basePrice: Math.round((originalPricing.basePrice || 0) * priceRatio),
      serviceCharge: Math.round((originalPricing.serviceCharge || 0) * priceRatio),
      platformFee: Math.round((originalPricing.platformFee || 0) * priceRatio),
      tax: Math.round((originalPricing.tax || 0) * priceRatio),
      discount: originalPricing.discount || 0,
      totalAmount: proposedAmount,
      currency: originalPricing.currency || 'KES'
    };

    // Set counter offer expiration
    const expirationHours = expiresInHours || COUNTER_OFFER_EXPIRATION_HOURS;
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + expirationHours);

    const newRound = currentRound + 1;

    // Create counter offer
    booking.counterOffer = {
      proposedBy: req.user.id,
      proposedAt: new Date(),
      status: 'pending',
      proposedPricing,
      reason,
      additionalNotes,
      validUntil,
      round: newRound
    };

    // Add to negotiation history
    if (!booking.negotiationHistory) {
      booking.negotiationHistory = [];
    }
    booking.negotiationHistory.push({
      round: newRound,
      proposedBy: 'technician',
      proposedByUser: req.user.id,
      proposedAt: new Date(),
      proposedAmount,
      reason,
      additionalNotes,
      validUntil,
      status: 'pending'
    });

    await booking.save();

    // Notify customer via notification service
    try {
      const notificationService = require('../services/notification.service');
      const technicianName = `${booking.technician.firstName} ${booking.technician.lastName}`;
      await notificationService.notifyCounterOfferSubmitted(booking, technicianName);
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    // Send real-time socket notification
    try {
      const { getIO } = require('../config/socket');
      const { notifyNewCounterOffer } = require('../socketHandlers/pricing.handler');
      const io = getIO();
      notifyNewCounterOffer(io, booking, booking.counterOffer);
    } catch (socketError) {
      console.error('Socket notification error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Counter offer submitted successfully',
      counterOffer: booking.counterOffer,
      negotiationHistory: booking.negotiationHistory,
      roundsRemaining: MAX_NEGOTIATION_ROUNDS - newRound,
      booking
    });

  } catch (error) {
    console.error('Submit counter offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting counter offer',
    });
  }
};

/**
 * @desc    Respond to counter offer (Customer)
 * @route   POST /api/v1/bookings/:id/counter-offer/respond
 * @access  Private (Customer)
 */
exports.respondToCounterOffer = async (req, res) => {
  try {
    const { accepted, notes, counterAmount } = req.body;

    if (typeof accepted !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Accepted status is required (true or false)'
      });
    }

    const booking = await findBookingPopulated(req.params.id, 'offers');

    if (!booking) return notFound(res);

    if (!isCustomer(booking, req.user.id)) {
      return notAuthorized(res, 'Only the customer can respond to counter offers');
    }

    // Verify counter offer exists and is pending
    if (!booking.counterOffer || booking.counterOffer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending counter offer found for this booking'
      });
    }

    // Check if counter offer has expired
    if (new Date() > booking.counterOffer.validUntil) {
      booking.counterOffer.status = 'expired';
      // Update history
      const historyItem = booking.negotiationHistory.find(
        h => h.round === booking.counterOffer.round && h.status === 'pending'
      );
      if (historyItem) {
        historyItem.status = 'expired';
      }
      await booking.save();
      return res.status(400).json({
        success: false,
        message: 'Counter offer has expired'
      });
    }

    // Check if customer wants to make a counter-counter offer
    if (!accepted && counterAmount && counterAmount > 0) {
      // Check max negotiation rounds
      const currentRound = booking.counterOffer.round || 1;
      if (currentRound >= MAX_NEGOTIATION_ROUNDS) {
        return res.status(400).json({
          success: false,
          message: `Maximum negotiation rounds (${MAX_NEGOTIATION_ROUNDS}) reached. Please accept or reject.`
        });
      }

      // Mark current offer as rejected with counter
      booking.counterOffer.status = 'rejected';
      booking.counterOffer.customerResponse = {
        respondedAt: new Date(),
        accepted: false,
        notes,
        counterAmount
      };

      // Update history
      const historyItem = booking.negotiationHistory.find(
        h => h.round === booking.counterOffer.round && h.status === 'pending'
      );
      if (historyItem) {
        historyItem.status = 'rejected';
        historyItem.response = {
          respondedAt: new Date(),
          accepted: false,
          notes,
          counterAmount
        };
      }

      // Add customer's counter to history
      const newRound = currentRound + 1;
      booking.negotiationHistory.push({
        round: newRound,
        proposedBy: 'customer',
        proposedByUser: req.user.id,
        proposedAt: new Date(),
        proposedAmount: counterAmount,
        reason: notes,
        status: 'pending'
      });

      // Reset counterOffer to pending customer counter
      booking.counterOffer = {
        proposedBy: req.user.id,
        proposedAt: new Date(),
        status: 'pending',
        proposedPricing: {
          ...booking.pricing,
          totalAmount: counterAmount
        },
        reason: notes,
        round: newRound,
        validUntil: new Date(Date.now() + COUNTER_OFFER_EXPIRATION_HOURS * 60 * 60 * 1000)
      };

      await booking.save();

      // Notify technician of customer's counter
      try {
        const notificationService = require('../services/notification.service');
        const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`;
        await notificationService.notifyCounterOfferRejected(booking, customerName);
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }

      return res.status(200).json({
        success: true,
        message: 'Counter offer rejected. Your counter-proposal has been sent to the technician.',
        isCounterProposal: true,
        counterOffer: booking.counterOffer,
        negotiationHistory: booking.negotiationHistory,
        roundsRemaining: MAX_NEGOTIATION_ROUNDS - newRound,
        booking
      });
    }

    // Update counter offer response
    booking.counterOffer.customerResponse = {
      respondedAt: new Date(),
      accepted,
      notes
    };

    // Update history
    const historyItem = booking.negotiationHistory.find(
      h => h.round === booking.counterOffer.round && h.status === 'pending'
    );

    if (accepted) {
      // Accept counter offer - update pricing and status
      booking.counterOffer.status = 'accepted';
      booking.pricing = booking.counterOffer.proposedPricing;

      // Recalculate booking fee based on new total
      booking.bookingFee.amount = Math.round(
        booking.pricing.totalAmount * (booking.bookingFee.percentage / 100)
      );

      // Move to accepted status
      booking.status = 'accepted';
      booking.statusHistory.push({
        status: 'accepted',
        changedBy: req.user.id,
        changedAt: new Date(),
        notes: `Customer accepted counter offer. New price: ${booking.pricing.currency} ${booking.pricing.totalAmount}`
      });

      if (historyItem) {
        historyItem.status = 'accepted';
        historyItem.response = {
          respondedAt: new Date(),
          accepted: true,
          notes
        };
      }
    } else {
      // Reject counter offer
      booking.counterOffer.status = 'rejected';
      booking.statusHistory.push({
        status: 'assigned', // Keep as assigned
        changedBy: req.user.id,
        changedAt: new Date(),
        notes: `Customer rejected counter offer. ${notes || ''}`
      });

      if (historyItem) {
        historyItem.status = 'rejected';
        historyItem.response = {
          respondedAt: new Date(),
          accepted: false,
          notes
        };
      }
    }

    await booking.save();

    // Notify technician
    try {
      const notificationService = require('../services/notification.service');
      const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`;

      // Also send real-time socket notification
      const { getIO } = require('../config/socket');
      const { notifyCounterOfferAccepted, notifyCounterOfferRejected } = require('../socketHandlers/pricing.handler');
      const io = getIO();

      if (accepted) {
        await notificationService.notifyCounterOfferAccepted(booking, customerName);
        notifyCounterOfferAccepted(io, booking, booking.counterOffer.customerResponse);
      } else {
        await notificationService.notifyCounterOfferRejected(booking, customerName);
        notifyCounterOfferRejected(io, booking, booking.counterOffer.customerResponse);
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.status(200).json({
      success: true,
      message: accepted ? 'Counter offer accepted' : 'Counter offer rejected',
      booking
    });

  } catch (error) {
    console.error('Respond to counter offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error responding to counter offer',
    });
  }
};

/**
 * @desc    Get negotiation history for a booking
 * @route   GET /api/v1/bookings/:id/negotiation-history
 * @access  Private (Customer or Technician involved)
 */
exports.getNegotiationHistory = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .select('customer technician negotiationHistory counterOffer pricing')
      .populate('negotiationHistory.proposedByUser', 'firstName lastName role');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify access
    if (!isCustomer(booking, req.user.id) && !isTechnician(booking, req.user.id)) {
      return notAuthorized(res, 'Access denied to this booking');
    }

    res.status(200).json({
      success: true,
      data: {
        currentCounterOffer: booking.counterOffer,
        negotiationHistory: booking.negotiationHistory || [],
        originalPricing: booking.pricing,
        maxRounds: MAX_NEGOTIATION_ROUNDS,
        roundsRemaining: MAX_NEGOTIATION_ROUNDS - (booking.negotiationHistory?.length || 0)
      }
    });

  } catch (error) {
    console.error('Get negotiation history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting negotiation history',
    });
  }
};

/**
 * @desc    Withdraw counter offer (Technician)
 * @route   DELETE /api/v1/bookings/:id/counter-offer
 * @access  Private (Technician)
 */
exports.withdrawCounterOffer = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await findBookingPopulated(req.params.id, 'offers');

    if (!booking) return notFound(res);

    if (!isTechnician(booking, req.user.id)) {
      return notAuthorized(res, 'You are not assigned to this booking');
    }

    // Verify counter offer exists and is pending
    if (!booking.counterOffer || booking.counterOffer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending counter offer to withdraw'
      });
    }

    // Mark as withdrawn
    booking.counterOffer.status = 'withdrawn';

    // Update history
    const historyItem = booking.negotiationHistory.find(
      h => h.round === booking.counterOffer.round && h.status === 'pending'
    );
    if (historyItem) {
      historyItem.status = 'withdrawn';
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Counter offer withdrawn successfully',
      booking
    });

  } catch (error) {
    console.error('Withdraw counter offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error withdrawing counter offer',
    });
  }
};

/**
 * @desc    Auto-expire stale counter offers (called by cron job)
 * @route   Internal
 */
exports.expireStaleCounterOffers = async () => {
  try {
    const now = new Date();

    const result = await Booking.updateMany(
      {
        'counterOffer.status': 'pending',
        'counterOffer.validUntil': { $lt: now }
      },
      {
        $set: { 'counterOffer.status': 'expired' }
      }
    );

    return result;
  } catch (error) {
    console.error('Error expiring stale counter offers:', error);
    throw error;
  }
};
