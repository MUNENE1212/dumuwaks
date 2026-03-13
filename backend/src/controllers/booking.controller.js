// DEPRECATED: This monolithic controller is not used by any routes.
// See booking.base, booking.status, booking.completion, booking.payment,
// booking.offer, and booking.misc controllers instead.
const Booking = require('../models/Booking');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Conversation = require('../models/Conversation');
const SupportTicket = require('../models/SupportTicket');
const pricingService = require('../services/pricing.service');

/**
 * @desc    Create a new booking
 * @route   POST /api/v1/bookings
 * @access  Private (Customer/Corporate)
 */
exports.createBooking = async (req, res) => {
  try {
    const {
      serviceCategory,
      serviceType,
      description,
      scheduledDate,
      serviceLocation,
      technician,
      preferredTechnician,
      urgency,
      timeSlot,
      quantity
    } = req.body;

    // Validate customer role
    if (!['customer', 'corporate'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only customers and corporate accounts can create bookings'
      });
    }

    // Generate booking number
    const bookingCount = await Booking.countDocuments();
    const bookingNumber = `BKG-${Date.now()}-${(bookingCount + 1).toString().padStart(5, '0')}`;

    // Get customer data
    const customer = await User.findById(req.user.id);

    // Calculate pricing estimate (without specific technician initially)
    const pricingResult = await pricingService.getEstimate({
      serviceCategory,
      serviceType,
      urgency: urgency || 'medium',
      serviceLocation,
      customerLocation: customer.location || serviceLocation,
      scheduledDateTime: scheduledDate,
      customerId: req.user.id,
      quantity: quantity || 1
    });

    if (!pricingResult.success) {
      return res.status(400).json({
        success: false,
        message: pricingResult.error
      });
    }

    // Debug: Log pricing result

    // Validate booking fee is calculated
    if (!pricingResult.breakdown.bookingFee || pricingResult.breakdown.bookingFee <= 0) {
      console.error('ERROR: Booking fee not calculated in pricing!');
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate booking fee. Please try again.',
        error: 'Booking fee amount is missing or zero'
      });
    }

    // Create booking data
    const bookingData = {
      bookingNumber,
      customer: req.user.id,
      serviceCategory,
      serviceType,
      description,
      serviceLocation: {
        type: 'Point',
        coordinates: serviceLocation.coordinates,
        address: serviceLocation.address
      },
      timeSlot: timeSlot || {
        date: scheduledDate,
        startTime: new Date(scheduledDate).toTimeString().slice(0, 5),
        endTime: new Date(new Date(scheduledDate).getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5)
      },
      status: 'pending',
      urgency: urgency || 'medium',
      pricing: pricingResult.breakdown,
      bookingFee: {
        required: true,
        percentage: 20,
        amount: pricingResult.breakdown.bookingFee,
        status: 'pending'
      }
    };
    // If specific technician requested
    if (technician) {
      const tech = await User.findById(technician);
      if (!tech || tech.role !== 'technician') {
        return res.status(400).json({
          success: false,
          message: 'Invalid technician'
        });
      }

      // Recalculate with specific technician
      const techPricingResult = await pricingService.calculatePrice({
        serviceCategory,
        serviceType,
        urgency: urgency || 'medium',
        serviceLocation,
        technicianLocation: tech.location,
        technicianId: technician,
        scheduledDateTime: scheduledDate,
        customerId: req.user.id,
        quantity: quantity || 1
      });

      if (techPricingResult.success) {
        bookingData.pricing = techPricingResult.breakdown;
        bookingData.bookingFee.amount = techPricingResult.breakdown.bookingFee;
      }

      // Store preferred technician but DON'T assign until payment is verified
      // Assignment will happen after confirmBookingFee is called
      bookingData.preferredTechnician = technician;
      // Status remains 'pending' until payment is confirmed
    } else if (preferredTechnician) {
      bookingData.preferredTechnician = preferredTechnician;
    }

    const booking = await Booking.create(bookingData);

    // Populate data for response
    await booking.populate([
      { path: 'customer', select: 'firstName lastName phoneNumber profilePicture' },
      { path: 'technician', select: 'firstName lastName phoneNumber profilePicture rating experience skills' }
    ]);

    // Debug: Log booking fee details

    // TODO: Send notification to technician if assigned
    // TODO: Trigger AI matching if no technician assigned

    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Please pay the booking fee to proceed with matching.',
      booking,
      nextSteps: {
        action: 'pay_booking_fee',
        amount: booking.bookingFee?.amount || 0,
        currency: booking.pricing?.currency || 'KES',
        description: '20% refundable booking deposit required before technician matching',
        endpoint: `/api/v1/bookings/${booking._id}/booking-fee/confirm`
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
    });
  }
};

/**
 * @desc    Get all bookings (with filters)
 * @route   GET /api/v1/bookings
 * @access  Private
 */
exports.getBookings = async (req, res) => {
  try {
    const {
      status,
      serviceType,
      startDate,
      endDate,
      role,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    // Filter by user role
    if (req.user.role === 'customer' || req.user.role === 'corporate') {
      query.customer = req.user.id;
    } else if (req.user.role === 'technician') {
      query.technician = req.user.id;
    }
    // Admin sees all bookings

    // Additional filters
    if (status) query.status = status;
    if (serviceType) query.serviceType = serviceType;

    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(query)
      .populate('customer', 'firstName lastName phoneNumber profilePicture')
      .populate('technician', 'firstName lastName phoneNumber profilePicture rating skills')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    // Hide contact information for bookings without verified payment
    const isAdminOrSupport = req.user.role === 'admin' || req.user.role === 'support';
    const safeBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      const paymentVerified = ['held', 'paid', 'released'].includes(bookingObj.bookingFee?.status);

      if (!paymentVerified && !isAdminOrSupport) {
        // Hide customer contact info from technician
        if (bookingObj.customer && req.user.role === 'technician') {
          bookingObj.customer = {
            _id: bookingObj.customer._id,
            firstName: bookingObj.customer.firstName,
            lastName: bookingObj.customer.lastName,
            profilePicture: bookingObj.customer.profilePicture,
            phoneNumber: '[Hidden]'
          };
        }

        // Hide technician contact info from customer
        if (bookingObj.technician && (req.user.role === 'customer' || req.user.role === 'corporate')) {
          bookingObj.technician = {
            _id: bookingObj.technician._id,
            firstName: bookingObj.technician.firstName,
            lastName: bookingObj.technician.lastName,
            profilePicture: bookingObj.technician.profilePicture,
            rating: bookingObj.technician.rating,
            skills: bookingObj.technician.skills,
            phoneNumber: '[Hidden]'
          };
        }

        bookingObj.contactsHidden = true;
      }

      return bookingObj;
    });

    res.status(200).json({
      success: true,
      count: safeBookings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      bookings: safeBookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings'
    });
  }
};

/**
 * @desc    Get single booking
 * @route   GET /api/v1/bookings/:id
 * @access  Private
 */
exports.getBooking = async (req, res) => {
  try {

    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'firstName lastName email phoneNumber profilePicture location')
      .populate('technician', 'firstName lastName email phoneNumber profilePicture rating skills location');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    const isAuthorized =
      booking.customer?._id?.toString() === req.user.id ||
      booking.technician?._id?.toString() === req.user.id ||
      req.user.role === 'admin' ||
      req.user.role === 'support';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    // Hide contact information until payment is verified
    // Payment must be confirmed (held/paid/released) for contacts to be visible
    const paymentVerified = ['held', 'paid', 'released'].includes(booking.bookingFee?.status);
    const isAdminOrSupport = req.user.role === 'admin' || req.user.role === 'support';

    // Create a safe version of the booking with potentially hidden contact info
    const safeBooking = booking.toObject();

    if (!paymentVerified && !isAdminOrSupport) {
      // Hide customer contact info from technician
      if (safeBooking.customer && req.user.id === booking.technician?._id?.toString()) {
        safeBooking.customer = {
          _id: safeBooking.customer._id,
          firstName: safeBooking.customer.firstName,
          lastName: safeBooking.customer.lastName,
          profilePicture: safeBooking.customer.profilePicture,
          // Hide sensitive info
          email: '[Hidden until payment verified]',
          phoneNumber: '[Hidden until payment verified]',
          location: { type: 'Point', coordinates: [0, 0], address: '[Hidden until payment verified]' }
        };
      }

      // Hide technician contact info from customer
      if (safeBooking.technician && req.user.id === booking.customer?._id?.toString()) {
        safeBooking.technician = {
          _id: safeBooking.technician._id,
          firstName: safeBooking.technician.firstName,
          lastName: safeBooking.technician.lastName,
          profilePicture: safeBooking.technician.profilePicture,
          rating: safeBooking.technician.rating,
          skills: safeBooking.technician.skills,
          // Hide sensitive info
          email: '[Hidden until payment verified]',
          phoneNumber: '[Hidden until payment verified]',
          location: { type: 'Point', coordinates: [0, 0], address: '[Hidden until payment verified]' }
        };
      }

      // Add warning message
      safeBooking.contactsHidden = true;
      safeBooking.contactsHiddenReason = 'Payment verification required. Complete payment to view contact information.';
    }

    res.status(200).json({
      success: true,
      booking: safeBooking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
    });
  }
};

/**
 * @desc    Update booking status
 * @route   PUT /api/v1/bookings/:id/status
 * @access  Private
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'firstName email')
      .populate('technician', 'firstName email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization and validate state transition
    const canUpdate =
      (req.user.role === 'technician' && booking.technician?._id?.toString() === req.user.id) ||
      (req.user.role === 'customer' && booking.customer?._id?.toString() === req.user.id) ||
      req.user.role === 'admin' ||
      req.user.role === 'support';

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    // Validate state transition
    const validTransitions = booking.schema.path('status').enumValues;
    if (!validTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Business logic for specific transitions
    const currentStatus = booking.status;

    // Technician accepts booking
    if (status === 'accepted' && currentStatus === 'awaiting_acceptance') {
      if (req.user.role !== 'technician') {
        return res.status(403).json({
          success: false,
          message: 'Only technician can accept booking'
        });
      }
      booking.acceptedAt = new Date();
    }

    // Start job
    if (status === 'in_progress' && currentStatus === 'accepted') {
      if (req.user.role !== 'technician') {
        return res.status(403).json({
          success: false,
          message: 'Only technician can start the job'
        });
      }
      booking.startedAt = new Date();
    }

    // Complete job
    if (status === 'completed' && currentStatus === 'in_progress') {
      if (req.user.role !== 'technician') {
        return res.status(403).json({
          success: false,
          message: 'Only technician can mark job as completed'
        });
      }
      booking.completedAt = new Date();
      // TODO: Trigger payment release from escrow
    }

    // Cancel booking
    if (status === 'cancelled') {
      booking.cancelledBy = req.user.id;
      booking.cancelledAt = new Date();
      booking.cancellationReason = notes;

      // Calculate cancellation fee if applicable
      const hoursTillStart = (new Date(booking.scheduledDate) - new Date()) / (1000 * 60 * 60);
      if (hoursTillStart < 24 && currentStatus !== 'pending') {
        booking.pricing.cancellationFee = booking.pricing.totalAmount * 0.2; // 20% fee
      }
    }

    booking.status = status;

    // Add to status history
    booking.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user.id,
      notes
    });

    await booking.save();

    // TODO: Send notifications
    // TODO: Update related transaction status

    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      booking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
    });
  }
};

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
    const paymentVerified = ['held', 'paid', 'released'].includes(booking.bookingFee?.status);
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

    // TODO: Send notification to technician

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
      (req.user.role === 'technician' && booking.technician?.toString() === req.user.id) ||
      req.user.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update pricing'
      });
    }

    if (serviceCharge) booking.pricing.serviceCharge = serviceCharge;
    if (materials) booking.materials = materials;
    if (additionalCosts) booking.pricing.additionalCosts = additionalCosts;

    // Calculate totals
    const materialsTotal = booking.materials.reduce((sum, m) => sum + (m.price * m.quantity), 0);
    const additionalTotal = booking.pricing.additionalCosts.reduce((sum, c) => sum + c.amount, 0);
    const subtotal = booking.pricing.serviceCharge + materialsTotal + additionalTotal;
    const platformFee = subtotal * (process.env.PLATFORM_FEE_PERCENTAGE || 0.1); // 10% default
    const totalAmount = subtotal + platformFee;

    booking.pricing.materialsTotal = materialsTotal;
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

    if (booking.technician?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned technician can add QA checkpoints'
      });
    }

    booking.qualityAssurance.checkpoints.push({
      description,
      images: images || [],
      checklist: checklistItems || [],
      timestamp: new Date()
    });

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'QA checkpoint added successfully',
      checkpoint: booking.qualityAssurance.checkpoints[booking.qualityAssurance.checkpoints.length - 1]
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
    const canDispute =
      booking.customer.toString() === req.user.id ||
      booking.technician?.toString() === req.user.id;

    if (!canDispute) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create dispute for this booking'
      });
    }

    if (booking.dispute.isDisputed) {
      return res.status(400).json({
        success: false,
        message: 'Booking already has an active dispute'
      });
    }

    booking.dispute = {
      isDisputed: true,
      reason,
      description,
      initiatedBy: req.user.id,
      initiatedAt: new Date(),
      status: 'open',
      evidence: evidence || []
    };

    booking.status = 'disputed';

    await booking.save();

    // TODO: Notify admin and other party
    // TODO: Hold payment in escrow

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

    if (!booking || !booking.dispute.isDisputed) {
      return res.status(404).json({
        success: false,
        message: 'No active dispute found'
      });
    }

    booking.dispute.status = 'resolved';
    booking.dispute.resolution = resolution;
    booking.dispute.resolutionNotes = resolutionNotes;
    booking.dispute.resolvedBy = req.user.id;
    booking.dispute.resolvedAt = new Date();

    // Update booking status based on resolution
    if (resolution === 'customer_favor') {
      booking.status = 'cancelled';
      // TODO: Process refund
    } else if (resolution === 'technician_favor') {
      booking.status = 'completed';
      // TODO: Release payment
    } else if (resolution === 'partial_refund') {
      booking.status = 'completed';
      // TODO: Process partial refund
    }

    await booking.save();

    // TODO: Notify both parties

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

/**
 * @desc    Get booking statistics
 * @route   GET /api/v1/bookings/stats
 * @access  Private
 */
exports.getBookingStats = async (req, res) => {
  try {
    
    const mongoose = require('mongoose');
    
    const query = {};

    // Filter by user role - Convert string ID to ObjectId for aggregation
    if (req.user.role === 'customer' || req.user.role === 'corporate') {
      query.customer = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user.role === 'technician') {
      query.technician = new mongoose.Types.ObjectId(req.user.id);
    }
    const stats = await Booking.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    // For countDocuments, string IDs work fine, so no conversion needed there
    const countQuery = {};
    if (req.user.role === 'customer' || req.user.role === 'corporate') {
      countQuery.customer = req.user.id;
    } else if (req.user.role === 'technician') {
      countQuery.technician = req.user.id;
    }

    const total = await Booking.countDocuments(countQuery);
    res.status(200).json({
      success: true,
      total,
      stats
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics'
    });
  }
};

/**
 * @desc    Technician requests completion confirmation from customer
 * @route   POST /api/v1/bookings/:id/request-completion
 * @access  Private (Technician)
 */
exports.requestCompletion = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the assigned technician
    if (booking.technician.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned technician can request completion'
      });
    }

    // Check if booking is in correct status
    if (booking.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Can only request completion for jobs in progress'
      });
    }

    // Create completion request
    booking.completionRequest = {
      requestedBy: req.user.id,
      requestedAt: new Date(),
      status: 'pending',
      escalationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    };

    booking.status = 'completed';
    booking.actualEndTime = new Date();
    booking.actualDuration = Math.round((booking.actualEndTime - booking.actualStartTime) / 60000);

    await booking.save();

    await booking.populate([
      { path: 'customer', select: 'firstName lastName email phoneNumber' },
      { path: 'technician', select: 'firstName lastName' }
    ]);

    // TODO: Send notification to customer
    // TODO: Send email/SMS to customer

    res.status(200).json({
      success: true,
      message: 'Completion request sent to customer',
      booking
    });
  } catch (error) {
    console.error('Request completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting completion'
    });
  }
};

/**
 * @desc    Customer responds to completion request
 * @route   POST /api/v1/bookings/:id/respond-completion
 * @access  Private (Customer)
 */
exports.respondToCompletion = async (req, res) => {
  try {
    const { approved, feedback, issues } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the customer
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the customer can respond to completion request'
      });
    }

    // Check if there's a pending completion request
    if (!booking.completionRequest || booking.completionRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending completion request found'
      });
    }

    // Update completion request with customer response
    booking.completionRequest.customerResponse = {
      respondedAt: new Date(),
      approved,
      feedback,
      issues
    };

    if (approved) {
      booking.completionRequest.status = 'approved';
      booking.status = 'verified';
    } else {
      booking.completionRequest.status = 'rejected';
      booking.status = 'in_progress'; // Back to in progress

      // Create a support ticket for the issues
      const SupportTicket = require('../models/SupportTicket');
      await SupportTicket.create({
        customer: booking.customer,
        subject: `Job Completion Dispute - ${booking.bookingNumber}`,
        description: `Customer has rejected job completion. Issues reported: ${issues}`,
        category: 'complaint',
        priority: 'high',
        relatedBooking: booking._id,
        source: 'system'
      });
    }

    await booking.save();

    await booking.populate([
      { path: 'customer', select: 'firstName lastName email phoneNumber' },
      { path: 'technician', select: 'firstName lastName email phoneNumber' }
    ]);

    // TODO: Send notification to technician
    // TODO: If rejected, notify support team

    res.status(200).json({
      success: true,
      message: approved ? 'Job completion confirmed' : 'Completion rejected - support has been notified',
      booking
    });
  } catch (error) {
    console.error('Respond to completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error responding to completion request'
    });
  }
};

/**
 * @desc    Support agent initiates follow-up for unresponsive customer
 * @route   POST /api/v1/bookings/:id/initiate-followup
 * @access  Private (Support/Admin)
 */
exports.initiateFollowUp = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if there's a pending completion request
    if (!booking.completionRequest || booking.completionRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending completion request found'
      });
    }

    // Initialize support follow-up
    booking.completionRequest.status = 'escalated';
    booking.completionRequest.autoEscalated = true;
    booking.completionRequest.supportFollowUp = {
      initiated: true,
      initiatedAt: new Date(),
      supportAgent: req.user.id,
      contactAttempts: []
    };

    await booking.save();

    await booking.populate([
      { path: 'customer', select: 'firstName lastName email phoneNumber' },
      { path: 'technician', select: 'firstName lastName' },
      { path: 'completionRequest.supportFollowUp.supportAgent', select: 'firstName lastName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Follow-up initiated successfully',
      booking
    });
  } catch (error) {
    console.error('Initiate follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating follow-up'
    });
  }
};

/**
 * @desc    Support agent logs contact attempt
 * @route   POST /api/v1/bookings/:id/log-contact
 * @access  Private (Support/Admin)
 */
exports.logContactAttempt = async (req, res) => {
  try {
    const { method, reached, notes } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if support follow-up is initiated
    if (!booking.completionRequest?.supportFollowUp?.initiated) {
      return res.status(400).json({
        success: false,
        message: 'Support follow-up not initiated'
      });
    }

    // Log contact attempt
    booking.completionRequest.supportFollowUp.contactAttempts.push({
      method,
      attemptedAt: new Date(),
      reached,
      notes
    });

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Contact attempt logged',
      contactAttempts: booking.completionRequest.supportFollowUp.contactAttempts
    });
  } catch (error) {
    console.error('Log contact attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging contact attempt'
    });
  }
};

/**
 * @desc    Support agent completes job after follow-up
 * @route   POST /api/v1/bookings/:id/complete-by-support
 * @access  Private (Support/Admin)
 */
exports.completeBySupport = async (req, res) => {
  try {
    const { outcome, notes } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if support follow-up is initiated
    if (!booking.completionRequest?.supportFollowUp?.initiated) {
      return res.status(400).json({
        success: false,
        message: 'Support follow-up not initiated'
      });
    }

    // Complete the job
    booking.completionRequest.supportFollowUp.outcome = outcome;
    booking.completionRequest.supportFollowUp.completedBy = req.user.id;
    booking.completionRequest.supportFollowUp.completedAt = new Date();
    booking.completionRequest.supportFollowUp.notes = notes;

    if (outcome === 'customer_confirmed' || outcome === 'unreachable' || outcome === 'auto_completed') {
      booking.completionRequest.status = 'auto_approved';
      booking.status = 'verified';
    } else if (outcome === 'customer_disputed') {
      booking.status = 'disputed';
    }

    await booking.save();

    await booking.populate([
      { path: 'customer', select: 'firstName lastName' },
      { path: 'technician', select: 'firstName lastName' },
      { path: 'completionRequest.supportFollowUp.completedBy', select: 'firstName lastName' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Job completion processed by support',
      booking
    });
  } catch (error) {
    console.error('Complete by support error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing job'
    });
  }
};

/**
 * @desc    Get bookings pending completion response
 * @route   GET /api/v1/bookings/pending-completion
 * @access  Private (Support/Admin)
 */
exports.getPendingCompletions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find({
      'completionRequest.status': 'pending',
      'completionRequest.escalationDeadline': { $lte: new Date() },
      'completionRequest.autoEscalated': false
    })
      .populate('customer', 'firstName lastName email phoneNumber')
      .populate('technician', 'firstName lastName')
      .populate('completionRequest.requestedBy', 'firstName lastName')
      .sort({ 'completionRequest.requestedAt': 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments({
      'completionRequest.status': 'pending',
      'completionRequest.escalationDeadline': { $lte: new Date() },
      'completionRequest.autoEscalated': false
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      bookings
    });
  } catch (error) {
    console.error('Get pending completions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending completions'
    });
  }
};

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
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm booking fee for this booking'
      });
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

        // TODO: Send notification to assigned technician
        // TODO: Create conversation between customer and technician
      } else {
        // No preferred technician, move to matching status
        booking.status = 'matching';
        booking.statusHistory.push({
          status: 'matching',
          changedBy: req.user.id,
          changedAt: new Date(),
          reason: 'Booking fee confirmed, ready for technician matching'
        });

        // TODO: Trigger AI matching algorithm
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
      .populate('technician', 'firstName lastName');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Only support or system can release booking fee
    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to release booking fee'
      });
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
      .populate('customer', 'firstName lastName');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Only support or admin can refund booking fee
    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to refund booking fee'
      });
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
    const isAuthorized =
      booking.customer.toString() === req.user.id ||
      (booking.technician && booking.technician.toString() === req.user.id) ||
      ['support', 'admin'].includes(req.user.role);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view booking fee status'
      });
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

/**
 * @desc    Accept booking (Technician)
 * @route   POST /api/v1/bookings/:id/accept
 * @access  Private (Technician)
 */
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'firstName lastName email phoneNumber')
      .populate('technician', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify technician is assigned to this booking
    if (booking.technician?._id?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this booking'
      });
    }

    // Verify booking is in assigned status
    if (booking.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept booking in ${booking.status} status`
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

    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'firstName lastName email phoneNumber')
      .populate('technician', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify technician is assigned to this booking
    if (booking.technician?._id?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this booking'
      });
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

    // TODO: Trigger re-matching process to find another technician

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
    const { proposedAmount, reason, additionalNotes } = req.body;

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

    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'firstName lastName email phoneNumber')
      .populate('technician', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify technician is assigned to this booking
    if (booking.technician?._id?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this booking'
      });
    }

    // Verify booking is in assigned status
    if (booking.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Cannot submit counter offer for booking in ${booking.status} status`
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

    // Set counter offer expiration (24 hours from now)
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    // Create counter offer
    booking.counterOffer = {
      proposedBy: req.user.id,
      proposedAt: new Date(),
      status: 'pending',
      proposedPricing,
      reason,
      additionalNotes,
      validUntil
    };

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Counter offer submitted successfully',
      counterOffer: booking.counterOffer,
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
    const { accepted, notes } = req.body;

    if (typeof accepted !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Accepted status is required (true or false)'
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'firstName lastName email phoneNumber')
      .populate('technician', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify user is the customer
    if (booking.customer?._id?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the customer can respond to counter offers'
      });
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
      await booking.save();
      return res.status(400).json({
        success: false,
        message: 'Counter offer has expired'
      });
    }

    // Update counter offer response
    booking.counterOffer.customerResponse = {
      respondedAt: new Date(),
      accepted,
      notes
    };

    if (accepted) {
      // Accept counter offer - update pricing and status
      booking.counterOffer.status = 'accepted';
      booking.pricing = booking.counterOffer.proposedPricing;

      // Recalculate booking fee (20% of new total)
      booking.bookingFee.amount = Math.round(booking.pricing.totalAmount * (booking.bookingFee.percentage / 100));

      // Move to accepted status
      booking.status = 'accepted';
      booking.statusHistory.push({
        status: 'accepted',
        changedBy: req.user.id,
        changedAt: new Date(),
        notes: `Customer accepted counter offer. New price: ${booking.pricing.currency} ${booking.pricing.totalAmount}`
      });
    } else {
      // Reject counter offer
      booking.counterOffer.status = 'rejected';
      booking.statusHistory.push({
        status: 'assigned', // Keep as assigned
        changedBy: req.user.id,
        changedAt: new Date(),
        notes: `Customer rejected counter offer. ${notes || ''}`
      });
    }

    await booking.save();

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
