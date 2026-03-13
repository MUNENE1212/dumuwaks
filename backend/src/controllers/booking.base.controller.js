const Booking = require('../models/Booking');
const User = require('../models/User');
const pricingService = require('../services/pricing.service');
const {
  BOOKING_POPULATES,
  isCustomer,
  isTechnician,
  getBookingRole,
  notAuthorized
} = require('../utils/bookingHelpers');

// Service and PaymentPlan models (will be created if they exist)
let Service, PaymentPlan, Escrow;
try {
  Service = require('../models/Service');
} catch (e) {
  Service = null;
}
try {
  PaymentPlan = require('../models/PaymentPlan');
} catch (e) {
  PaymentPlan = null;
}
try {
  Escrow = require('../models/Escrow');
} catch (e) {
  Escrow = null;
}

/**
 * @desc    Create a new booking with WORD BANK integration
 * @route   POST /api/v1/bookings
 * @access  Private (Customer/Corporate)
 */
exports.createBooking = async (req, res) => {
  try {
    const {
      // WORD BANK integration fields
      service,           // Service ID from WORD BANK
      paymentPlan,       // Selected payment plan ID
      escrowDeposit,     // Escrow deposit amount

      // Legacy/standard fields
      serviceCategory,
      serviceType,
      description,
      scheduledDate,
      scheduledTime,
      serviceLocation,
      location,          // New location format
      technician,
      preferredTechnician,
      urgency,
      timeSlot,
      quantity,
      attachments
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

    // Determine service location (support both old and new format)
    const finalLocation = location || serviceLocation;

    // Validate WORD BANK service if provided
    let serviceData = null;
    if (service && Service) {
      serviceData = await Service.findById(service);
      if (!serviceData) {
        return res.status(400).json({
          success: false,
          message: 'Invalid service selected from WORD BANK'
        });
      }
      if (!serviceData.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Selected service is not currently available'
        });
      }
    }

    // Validate technician offers the service
    if (technician && service) {
      const tech = await User.findById(technician);
      if (!tech || tech.role !== 'technician') {
        return res.status(400).json({
          success: false,
          message: 'Invalid technician'
        });
      }

      // Check if technician offers this service
      // This would typically check a TechnicianService join table
      // For now, we assume all technicians can offer any service
    }

    // Validate payment plan if provided
    let paymentPlanData = null;
    if (paymentPlan && PaymentPlan) {
      paymentPlanData = await PaymentPlan.findById(paymentPlan);
      if (!paymentPlanData) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment plan selected'
        });
      }
      if (!paymentPlanData.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Selected payment plan is not currently available'
        });
      }
    }

    // Calculate pricing estimate
    const pricingResult = await pricingService.getEstimate({
      serviceCategory: serviceCategory || serviceData?.category,
      serviceType: serviceType || serviceData?.name,
      urgency: urgency || 'medium',
      serviceLocation: finalLocation,
      customerLocation: customer.location || finalLocation,
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

    // Calculate deposit amount (use provided escrowDeposit or default 20%)
    const depositAmount = escrowDeposit || pricingResult.breakdown.bookingFee;

    // Validate booking fee is calculated
    if (!depositAmount || depositAmount <= 0) {
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
      serviceCategory: serviceCategory || serviceData?.category || 'other',
      serviceType: serviceType || serviceData?.name || 'General Service',
      description,
      serviceLocation: {
        type: 'Point',
        coordinates: finalLocation?.coordinates || [0, 0],
        address: finalLocation?.address || ''
      },
      timeSlot: timeSlot || {
        date: scheduledDate,
        startTime: scheduledTime || new Date(scheduledDate).toTimeString().slice(0, 5),
        endTime: new Date(new Date(scheduledDate).getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5)
      },
      status: 'pending',
      urgency: urgency || 'medium',
      pricing: pricingResult.breakdown,
      bookingFee: {
        required: true,
        percentage: paymentPlanData?.depositPercentage || 20,
        amount: depositAmount,
        status: 'pending'
      },

      // WORD BANK integration fields
      service: service || null,
      paymentPlan: paymentPlan || null,
      depositAmount: depositAmount,
      depositPaid: false
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
        serviceCategory: bookingData.serviceCategory,
        serviceType: bookingData.serviceType,
        urgency: urgency || 'medium',
        serviceLocation: finalLocation,
        technicianLocation: tech.location,
        technicianId: technician,
        scheduledDateTime: scheduledDate,
        customerId: req.user.id,
        quantity: quantity || 1
      });

      if (techPricingResult.success) {
        bookingData.pricing = techPricingResult.breakdown;
        bookingData.bookingFee.amount = depositAmount;
      }

      bookingData.technician = technician;
      bookingData.preferredTechnician = technician;
    } else if (preferredTechnician) {
      bookingData.preferredTechnician = preferredTechnician;
    }

    const booking = await Booking.create(bookingData);

    // Create escrow record if Escrow model exists
    if (Escrow && booking) {
      try {
        const escrowRecord = await Escrow.create({
          bookingId: booking._id,
          customerId: req.user.id,
          technicianId: technician || null,
          totalAmount: pricingResult.breakdown.totalAmount,
          depositAmount: depositAmount,
          status: 'pending',
          releaseConditions: 'job_verified'
        });

        // Link escrow to booking
        booking.escrow = escrowRecord._id;
        await booking.save();
      } catch (escrowError) {
        console.error('Failed to create escrow record:', escrowError);
        // Continue without escrow - not critical for booking creation
      }
    }

    // Populate data for response
    await booking.populate([
      { path: 'customer', select: 'firstName lastName phoneNumber profilePicture' },
      { path: 'technician', select: 'firstName lastName phoneNumber profilePicture rating experience skills' },
      { path: 'service', select: 'name description basePriceMin basePriceMax estimatedDuration' },
      { path: 'paymentPlan', select: 'name description depositPercentage frequency' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Please pay the escrow deposit to proceed.',
      booking,
      nextSteps: {
        action: 'pay_escrow_deposit',
        amount: depositAmount,
        currency: booking.pricing?.currency || 'KES',
        description: `${paymentPlanData?.depositPercentage || 20}% refundable escrow deposit required`,
        endpoint: `/api/v1/bookings/${booking._id}/booking-fee/confirm`
      },
      escrow: {
        depositAmount,
        depositPercentage: paymentPlanData?.depositPercentage || 20,
        status: 'pending',
        fundedAt: null
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
      .populate(BOOKING_POPULATES.list)
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
    const populateOptions = [
      { path: 'customer', select: 'firstName lastName email phoneNumber profilePicture location' },
      { path: 'technician', select: 'firstName lastName email phoneNumber profilePicture rating skills location' }
    ];

    // Add WORD BANK service and payment plan population if models exist
    if (Service) {
      populateOptions.push({ path: 'service', select: 'name description basePriceMin basePriceMax estimatedDuration categoryId' });
    }
    if (PaymentPlan) {
      populateOptions.push({ path: 'paymentPlan', select: 'name description depositPercentage frequency installments milestones' });
    }
    if (Escrow) {
      populateOptions.push({ path: 'escrow', select: 'status totalAmount depositAmount fundedAt releasedAt' });
    }

    const booking = await Booking.findById(req.params.id)
      .populate(populateOptions);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    const { authorized } = getBookingRole(booking, req.user.id, req.user.role);

    if (!authorized) {
      return notAuthorized(res, 'Not authorized to view this booking');
    }

    // Hide contact information until payment is verified
    const paymentVerified = ['held', 'paid', 'released'].includes(booking.bookingFee?.status);
    const isAdminOrSupport = req.user.role === 'admin' || req.user.role === 'support';

    const safeBooking = booking.toObject();

    if (!paymentVerified && !isAdminOrSupport) {
      // Hide customer contact info from technician
      if (safeBooking.customer && req.user.id === booking.technician?._id?.toString()) {
        safeBooking.customer = {
          _id: safeBooking.customer._id,
          firstName: safeBooking.customer.firstName,
          lastName: safeBooking.customer.lastName,
          profilePicture: safeBooking.customer.profilePicture,
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
          email: '[Hidden until payment verified]',
          phoneNumber: '[Hidden until payment verified]',
          location: { type: 'Point', coordinates: [0, 0], address: '[Hidden until payment verified]' }
        };
      }

      safeBooking.contactsHidden = true;
      safeBooking.contactsHiddenReason = 'Payment verification required. Complete payment to view contact information.';
    }

    res.status(200).json({
      success: true,
      booking: safeBooking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
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
    const query = {};

    // Filter by user role
    if (req.user.role === 'customer' || req.user.role === 'corporate') {
      query.customer = req.user.id;
    } else if (req.user.role === 'technician') {
      query.technician = req.user.id;
    }

    // Get counts by status
    const totalBookings = await Booking.countDocuments(query);
    const activeBookings = await Booking.countDocuments({
      ...query,
      status: { $in: ['pending', 'awaiting_acceptance', 'accepted', 'in_progress'] }
    });
    const completedBookings = await Booking.countDocuments({
      ...query,
      status: 'completed'
    });
    const cancelledBookings = await Booking.countDocuments({
      ...query,
      status: 'cancelled'
    });
    const pendingBookings = await Booking.countDocuments({
      ...query,
      status: { $in: ['pending', 'awaiting_acceptance'] }
    });

    // Get earnings/spending data
    const revenueData = await Booking.aggregate([
      {
        $match: {
          ...query,
          status: 'completed',
          'payment.status': 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    const totalEarningsOrSpent = revenueData.length > 0 ? revenueData[0].totalAmount : 0;

    // Get average rating
    const Review = require('../models/Review');
    let averageRating = 0;

    if (req.user.role === 'technician') {
      const ratingData = await Review.aggregate([
        { $match: { technician: req.user._id } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]);
      averageRating = ratingData.length > 0 ? ratingData[0].avgRating : 0;
    } else if (req.user.role === 'customer') {
      const ratingData = await Review.aggregate([
        { $match: { customer: req.user._id } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]);
      averageRating = ratingData.length > 0 ? ratingData[0].avgRating : 0;
    }

    // Get unread message count
    const Conversation = require('../models/Conversation');
    const conversations = await Conversation.find({
      'participants.user': req.user.id,
      'participants.leftAt': { $exists: false },
      deletedFor: { $ne: req.user.id }
    });

    let unreadMessages = 0;
    conversations.forEach(conv => {
      const participant = conv.participants.find(p => p.user.toString() === req.user.id.toString());
      if (participant) {
        unreadMessages += participant.unreadCount || 0;
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalBookings,
        activeBookings,
        completedBookings,
        cancelledBookings,
        pendingBookings,
        ...(req.user.role === 'technician' ? { totalEarnings: totalEarningsOrSpent } : { totalSpent: totalEarningsOrSpent }),
        averageRating: averageRating > 0 ? parseFloat(averageRating.toFixed(1)) : null,
        unreadMessages
      }
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics'
    });
  }
};
