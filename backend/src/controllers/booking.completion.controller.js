const Booking = require('../models/Booking');
const cloudinaryService = require('../services/cloudinary.service');
const mongoose = require('mongoose');
const {
  BOOKING_POPULATES,
  findBookingPopulated,
  isTechnician,
  isCustomer,
  isSupportOrAdmin,
  getBookingRole,
  notFound,
  notAuthorized
} = require('../utils/bookingHelpers');

// Maximum number of completion media items allowed per booking
const MAX_COMPLETION_MEDIA = 5;

/**
 * Validate file type for completion media
 * @param {Object} file - File object from multer
 * @returns {boolean} - Whether file is valid
 */
const validateMediaType = (file) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

  return allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype);
};

/**
 * Determine media type from mimetype
 * @param {string} mimetype - File MIME type
 * @returns {string} - 'image' or 'video'
 */
const getMediaType = (mimetype) => {
  return mimetype.startsWith('video/') ? 'video' : 'image';
};

/**
 * @desc    Support agent initiates follow-up for unresponsive customer
 * @route   POST /api/v1/bookings/:id/followup/initiate
 * @access  Private (Support/Admin)
 */
exports.initiateFollowUp = async (req, res) => {
  try {
    const booking = await findBookingPopulated(req.params.id, 'followUp');

    if (!booking) return notFound(res);

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

    await booking.populate('completionRequest.supportFollowUp.supportAgent', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Follow-up initiated successfully',
      booking
    });
  } catch (error) {
    console.error('Initiate follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating follow-up',
    });
  }
};

/**
 * @desc    Support agent logs contact attempt
 * @route   POST /api/v1/bookings/:id/followup/log-contact
 * @access  Private (Support/Admin)
 */
exports.logContactAttempt = async (req, res) => {
  try {
    const { method, reached, notes } = req.body;

    if (!method || !['call', 'sms', 'email', 'in_app'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Valid contact method is required (call, sms, email, in_app)'
      });
    }

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
      reached: reached || false,
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
      message: 'Error logging contact attempt',
    });
  }
};

/**
 * @desc    Support agent completes job after follow-up
 * @route   POST /api/v1/bookings/:id/followup/complete
 * @access  Private (Support/Admin)
 */
exports.completeBySupport = async (req, res) => {
  try {
    const { outcome, notes } = req.body;

    if (!outcome || !['customer_confirmed', 'customer_disputed', 'unreachable', 'auto_completed'].includes(outcome)) {
      return res.status(400).json({
        success: false,
        message: 'Valid outcome is required (customer_confirmed, customer_disputed, unreachable, auto_completed)'
      });
    }

    const booking = await findBookingPopulated(req.params.id, 'minimal');

    if (!booking) return notFound(res);

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
      booking.statusHistory.push({
        status: 'verified',
        changedBy: req.user.id,
        changedAt: new Date(),
        notes: `Completion approved by support after follow-up. Outcome: ${outcome}`
      });
    } else if (outcome === 'customer_disputed') {
      booking.status = 'disputed';
      booking.statusHistory.push({
        status: 'disputed',
        changedBy: req.user.id,
        changedAt: new Date(),
        notes: 'Customer disputed completion after support contact'
      });
    }

    await booking.save();

    // Real escrow: support approval pays the technician; a dispute freezes the money
    if (booking.paymentProvider === 'intasend' && booking.escrow) {
      try {
        const engine = require('../services/payments/escrow.engine');
        if (booking.status === 'verified') await engine.release(booking.escrow, { by: req.user.id });
        if (booking.status === 'disputed') await engine.openDispute(booking.escrow, { by: req.user.id, reason: notes || 'Customer disputed completion' });
      } catch (escrowError) {
        console.error('Escrow action after support follow-up failed:', escrowError);
      }
    }

    await booking.populate('completionRequest.supportFollowUp.completedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Job completion processed by support',
      booking
    });
  } catch (error) {
    console.error('Complete by support error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing job',
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
      .populate(BOOKING_POPULATES.pendingCompletion)
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
      message: 'Error fetching pending completions',
    });
  }
};

// ===== COMPLETION MEDIA MANAGEMENT =====

/**
 * @desc    Upload completion media (photos/videos) for a booking
 * @route   POST /api/v1/bookings/:id/completion-media
 * @access  Private (Technician only - assigned to booking)
 */
exports.uploadCompletionMedia = async (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const { caption } = req.body;
    const files = req.files;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    // Find the booking
    const booking = await findBookingPopulated(bookingId, 'minimal');

    if (!booking) return notFound(res);

    if (!isTechnician(booking, req.user.id)) {
      return notAuthorized(res, 'Only the assigned technician can upload completion media');
    }

    // Verify booking is in a valid status for uploading completion media
    // Allow uploads when: in_progress, completed (pending verification), or paused
    const allowedStatuses = ['in_progress', 'completed', 'paused'];
    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot upload completion media for booking in ${booking.status} status. ` +
          'Media can only be uploaded when job is in progress, completed, or paused.'
      });
    }

    // Check if files were uploaded
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image or video file'
      });
    }

    // Check current media count and new uploads don't exceed limit
    const currentMediaCount = booking.completionMedia?.length || 0;
    const newMediaCount = files.length;

    if (currentMediaCount + newMediaCount > MAX_COMPLETION_MEDIA) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_COMPLETION_MEDIA} completion media items allowed. ` +
          `Current: ${currentMediaCount}, Attempting to add: ${newMediaCount}`,
        currentCount: currentMediaCount,
        maxAllowed: MAX_COMPLETION_MEDIA
      });
    }

    // Validate each file
    for (const file of files) {
      if (!validateMediaType(file)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type: ${file.originalname}. ` +
            'Only images (jpeg, jpg, png, gif, webp) and videos (mp4, webm, ogg) are allowed.'
        });
      }
    }

    // Upload files to Cloudinary
    const uploadPromises = files.map(async (file) => {
      try {
        const uploadResult = await cloudinaryService.uploadFile(
          {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype
          },
          'completion-media',
          {
            resource_type: getMediaType(file.mimetype) === 'video' ? 'video' : 'image',
            transformation: getMediaType(file.mimetype) === 'image'
              ? [{ width: 1280, height: 720, crop: 'limit', quality: 'auto' }, { fetch_format: 'auto' }]
              : [{ quality: 'auto' }]
          }
        );

        return {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          type: getMediaType(file.mimetype),
          caption: caption || '',
          uploadedAt: new Date(),
          uploadedBy: req.user.id
        };
      } catch (uploadError) {
        console.error('Cloudinary upload error for file:', file.originalname, uploadError);
        throw new Error(`Failed to upload ${file.originalname}: ${uploadError.message}`);
      }
    });

    const uploadedMedia = await Promise.all(uploadPromises);

    // Initialize completionMedia array if needed
    if (!booking.completionMedia) {
      booking.completionMedia = [];
    }

    // Add new media to booking
    booking.completionMedia.push(...uploadedMedia);

    await booking.save();

    // Populate the uploadedBy field for response
    await booking.populate('completionMedia.uploadedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedMedia.length} completion media file(s)`,
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        completionMedia: booking.completionMedia,
        totalMedia: booking.completionMedia.length,
        remainingSlots: MAX_COMPLETION_MEDIA - booking.completionMedia.length
      }
    });

  } catch (error) {
    console.error('Upload completion media error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading completion media',
    });
  }
};

/**
 * @desc    Get all completion media for a booking
 * @route   GET /api/v1/bookings/:id/completion-media
 * @access  Private (Customer, Technician, Support, Admin)
 */
exports.getCompletionMedia = async (req, res) => {
  try {
    const { id: bookingId } = req.params;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    // Find the booking
    const booking = await findBookingPopulated(bookingId, 'completionMedia');

    if (!booking) return notFound(res);

    // Check authorization
    const { authorized } = getBookingRole(booking, req.user.id, req.user.role);

    if (!authorized) {
      return notAuthorized(res, 'Not authorized to view completion media for this booking');
    }

    // Get completion media with additional context
    const completionMedia = booking.completionMedia || [];

    // Also get problem images for before/after comparison
    const problemImages = booking.images || [];

    res.status(200).json({
      success: true,
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        completionMedia,
        problemImages,
        totalCompletionMedia: completionMedia.length,
        totalProblemImages: problemImages.length,
        maxAllowed: MAX_COMPLETION_MEDIA,
        remainingSlots: MAX_COMPLETION_MEDIA - completionMedia.length
      }
    });

  } catch (error) {
    console.error('Get completion media error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching completion media',
    });
  }
};

/**
 * @desc    Delete a specific completion media item
 * @route   DELETE /api/v1/bookings/:id/completion-media/:mediaId
 * @access  Private (Technician who uploaded, or Support/Admin)
 */
exports.deleteCompletionMedia = async (req, res) => {
  try {
    const { id: bookingId, mediaId } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media ID format'
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Find the media item
    const mediaIndex = booking.completionMedia?.findIndex(
      (media) => media._id.toString() === mediaId
    );

    if (mediaIndex === -1 || mediaIndex === undefined) {
      return res.status(404).json({
        success: false,
        message: 'Completion media not found'
      });
    }

    const mediaItem = booking.completionMedia[mediaIndex];

    // Check authorization - only uploader, support, or admin can delete
    const isUploader = mediaItem.uploadedBy?.toString() === req.user.id;

    if (!isUploader && !isSupportOrAdmin(req.user.role)) {
      return notAuthorized(res, 'Not authorized to delete this media item');
    }

    // Delete from Cloudinary
    try {
      await cloudinaryService.deleteFile(mediaItem.publicId, mediaItem.type);
    } catch (cloudinaryError) {
      console.warn('Failed to delete from Cloudinary:', cloudinaryError.message);
      // Continue with database deletion even if Cloudinary fails
    }

    // Remove from array
    booking.completionMedia.splice(mediaIndex, 1);

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Completion media deleted successfully',
      data: {
        bookingId: booking._id,
        remainingMedia: booking.completionMedia.length,
        remainingSlots: MAX_COMPLETION_MEDIA - booking.completionMedia.length
      }
    });

  } catch (error) {
    console.error('Delete completion media error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting completion media',
    });
  }
};

/**
 * @desc    Update caption for a completion media item
 * @route   PATCH /api/v1/bookings/:id/completion-media/:mediaId
 * @access  Private (Technician who uploaded, or Support/Admin)
 */
exports.updateCompletionMediaCaption = async (req, res) => {
  try {
    const { id: bookingId, mediaId } = req.params;
    const { caption } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid media ID format'
      });
    }

    // Validate caption length
    if (caption && caption.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Caption must be 500 characters or less'
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Find the media item
    const mediaItem = booking.completionMedia?.find(
      (media) => media._id.toString() === mediaId
    );

    if (!mediaItem) {
      return res.status(404).json({
        success: false,
        message: 'Completion media not found'
      });
    }

    // Check authorization
    const isUploader = mediaItem.uploadedBy?.toString() === req.user.id;

    if (!isUploader && !isSupportOrAdmin(req.user.role)) {
      return notAuthorized(res, 'Not authorized to update this media item');
    }

    // Update caption
    mediaItem.caption = caption || '';

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Caption updated successfully',
      data: {
        mediaId: mediaItem._id,
        caption: mediaItem.caption
      }
    });

  } catch (error) {
    console.error('Update completion media caption error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating caption',
    });
  }
};
