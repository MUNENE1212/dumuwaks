const Booking = require('../models/Booking');
const User = require('../models/User');
const {
  isTechnician,
  isCustomer,
  notFound,
  notAuthorized
} = require('../utils/bookingHelpers');

/**
 * @desc    Assign technician to booking
 * @route   PUT /api/v1/bookings/:id/assign-technician
 * @access  Private (Admin or AI system)
 */
exports.assignTechnician = async (req, res) => {
  try {
    const { technician } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'pending' && booking.status !== 'matching') {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign technician to this booking'
      });
    }

    // Check if booking fee has been paid
    const paymentVerified =
      ['held', 'paid', 'released'].includes(booking.bookingFee?.status) ||
      // Real escrow: the full price is held (processing) or already paid out (completed)
      (booking.paymentProvider === 'intasend' && ['processing', 'completed'].includes(booking.payment?.status));
    if (!paymentVerified) {
      return res.status(400).json({
        success: false,
        message: 'Booking fee must be paid before assigning technician'
      });
    }

    // Verify technician
    const tech = await User.findById(technician);
    if (!tech || tech.role !== 'technician') {
      return res.status(400).json({
        success: false,
        message: 'Invalid technician'
      });
    }

    booking.technician = technician;
    booking.status = 'assigned';

    await booking.save();

    await booking.populate('technician', 'firstName lastName phoneNumber rating skills');

    // Notify technician of assignment
    try {
      const notificationService = require('../services/notification.service');
      await notificationService.notifyNewBooking(tech, booking);
      const { emitToUser } = require('../config/socket');
      emitToUser(technician, 'booking:assigned', { bookingId: booking._id, bookingNumber: booking.bookingNumber });
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Technician assigned successfully',
      booking
    });
  } catch (error) {
    console.error('Assign technician error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning technician'
    });
  }
};

/**
 * @desc    Update booking pricing
 * @route   PUT /api/v1/bookings/:id/pricing
 * @access  Private (Technician/Admin)
 */
exports.updatePricing = async (req, res) => {
  try {
    const { serviceCharge, materials, additionalCosts } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    const canUpdate =
      (req.user.role === 'technician' && isTechnician(booking, req.user.id)) ||
      req.user.role === 'admin';

    if (!canUpdate) {
      return notAuthorized(res, 'Not authorized to update pricing');
    }

    if (serviceCharge) booking.pricing.serviceCharge = serviceCharge;
    if (materials) booking.materialsUsed = materials;
    if (additionalCosts) booking.pricing.additionalCosts = additionalCosts;

    // Calculate totals
    const materialsTotal = booking.materialsUsed?.reduce((sum, m) => sum + (m.totalPrice || 0), 0) || 0;
    const additionalTotal = booking.pricing.additionalCosts?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
    const subtotal = booking.pricing.serviceCharge + materialsTotal + additionalTotal;
    const platformFee = subtotal * (process.env.PLATFORM_FEE_PERCENTAGE || 0.1); // 10% default
    const totalAmount = subtotal + platformFee;

    booking.pricing.platformFee = platformFee;
    booking.pricing.totalAmount = totalAmount;

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Pricing updated successfully',
      pricing: booking.pricing
    });
  } catch (error) {
    console.error('Update pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating pricing'
    });
  }
};

/**
 * @desc    Add QA checkpoint
 * @route   POST /api/v1/bookings/:id/qa-checkpoint
 * @access  Private (Technician)
 */
exports.addQACheckpoint = async (req, res) => {
  try {
    const { description, images, checklistItems } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (!isTechnician(booking, req.user.id)) {
      return notAuthorized(res, 'Only assigned technician can add QA checkpoints');
    }

    // Initialize quality assurance if not exists
    if (!booking.qualityCheck) {
      booking.qualityCheck = {};
    }

    // Add to notes or create a checkpoint structure
    if (!booking.qualityCheck.notes) {
      booking.qualityCheck.notes = description;
    } else {
      booking.qualityCheck.notes += `\n${description}`;
    }

    booking.qualityCheck.checkedAt = new Date();
    booking.qualityCheck.checkedBy = req.user.id;

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'QA checkpoint added successfully',
      qualityCheck: booking.qualityCheck
    });
  } catch (error) {
    console.error('Add QA checkpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding QA checkpoint'
    });
  }
};

/**
 * @desc    Create dispute
 * @route   POST /api/v1/bookings/:id/dispute
 * @access  Private (Customer/Technician)
 */
exports.createDispute = async (req, res) => {
  try {
    const { reason, description, evidence } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (!isCustomer(booking, req.user.id) && !isTechnician(booking, req.user.id)) {
      return notAuthorized(res, 'Not authorized to create dispute for this booking');
    }

    if (booking.dispute?.status === 'open' || booking.dispute?.status === 'investigating') {
      return res.status(400).json({
        success: false,
        message: 'Booking already has an active dispute'
      });
    }

    booking.dispute = {
      raisedBy: req.user.id,
      raisedAt: new Date(),
      reason,
      status: 'open'
    };

    booking.status = 'disputed';
    booking.statusHistory.push({
      status: 'disputed',
      changedBy: req.user.id,
      changedAt: new Date(),
      reason: reason,
      notes: description
    });

    await booking.save();

    // Notify admin and other party
    try {
      const notificationService = require('../services/notification.service');
      const { emitToUser } = require('../config/socket');
      const raiserId = req.user.id;
      const otherPartyId = isCustomer(booking, raiserId)
        ? (booking.technician?._id || booking.technician)?.toString()
        : (booking.customer?._id || booking.customer)?.toString();

      if (otherPartyId) {
        await notificationService.createNotification(otherPartyId, {
          type: 'booking_disputed',
          title: 'Booking Disputed',
          body: `A dispute has been raised for booking #${booking.bookingNumber}`,
          category: 'booking',
          relatedBooking: booking._id,
          priority: 'high'
        });
        emitToUser(otherPartyId, 'booking:disputed', { bookingId: booking._id });
      }

      // Hold payment in escrow
      const escrowService = require('../services/escrow.service');
      if (booking.escrow) {
        await escrowService.openDispute(booking.escrow, raiserId, reason);
      }
    } catch (notifError) {
      console.error('Dispute notification/escrow error:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Dispute created successfully. Admin will review shortly.',
      dispute: booking.dispute
    });
  } catch (error) {
    console.error('Create dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating dispute'
    });
  }
};

/**
 * @desc    Resolve dispute
 * @route   PUT /api/v1/bookings/:id/dispute/resolve
 * @access  Private (Admin)
 */
exports.resolveDispute = async (req, res) => {
  try {
    const { resolution, resolutionNotes, refundAmount } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking || !booking.dispute?.raisedBy) {
      return res.status(404).json({
        success: false,
        message: 'No active dispute found'
      });
    }

    booking.dispute.status = 'resolved';
    booking.dispute.resolution = resolutionNotes;
    booking.dispute.resolvedBy = req.user.id;
    booking.dispute.resolvedAt = new Date();

    // Update booking status and process escrow based on resolution
    if (resolution === 'customer_favor') {
      booking.status = 'cancelled';
    } else if (resolution === 'technician_favor') {
      booking.status = 'completed';
    } else if (resolution === 'partial_refund') {
      booking.status = 'completed';
    }

    booking.statusHistory.push({
      status: booking.status,
      changedBy: req.user.id,
      changedAt: new Date(),
      notes: `Dispute resolved: ${resolution}. ${resolutionNotes}`
    });

    await booking.save();

    // Process escrow resolution
    try {
      const escrowService = require('../services/escrow.service');
      if (booking.escrow) {
        await escrowService.resolveDispute(
          booking.escrow,
          req.user.id,
          resolution === 'customer_favor' ? 'customer_favor'
            : resolution === 'technician_favor' ? 'technician_favor'
            : 'split',
          resolution === 'partial_refund' && refundAmount ? { customerPercentage: Math.round((refundAmount / booking.pricing.totalAmount) * 100) } : undefined
        );
      }
    } catch (escrowError) {
      console.error('Escrow resolution error:', escrowError);
    }

    // Notify both parties
    try {
      const notificationService = require('../services/notification.service');
      const { emitToBooking } = require('../config/socket');
      const customerId = (booking.customer?._id || booking.customer)?.toString();
      const technicianId = (booking.technician?._id || booking.technician)?.toString();

      const notifBody = `Dispute for booking #${booking.bookingNumber} has been resolved: ${resolution}`;
      if (customerId) {
        await notificationService.notifyStatusChange(booking, booking.status, customerId, notifBody);
      }
      if (technicianId) {
        await notificationService.notifyStatusChange(booking, booking.status, technicianId, notifBody);
      }
      emitToBooking(booking._id.toString(), 'booking:dispute_resolved', { bookingId: booking._id, resolution });
    } catch (notifError) {
      console.error('Dispute notification error:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Dispute resolved successfully',
      dispute: booking.dispute
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving dispute'
    });
  }
};
