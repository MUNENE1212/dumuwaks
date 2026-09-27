const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * TechnicianService Schema
 * Links technicians to services they offer with custom pricing and details
 * This is the technician's offering of a service from the WORD BANK
 */
const TechnicianServiceSchema = new Schema({
  // Reference to the technician (User with role 'technician')
  technician: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Technician reference is required'],
    index: true
  },

  // Reference to the service from WORD BANK
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service reference is required'],
    index: true
  },

  // Reference to the category (denormalized for faster queries)
  category: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceCategory',
    required: [true, 'Category reference is required'],
    index: true
  },

  // Custom pricing (can override base price)
  pricing: {
    // Custom minimum price (overrides service base price)
    minPrice: {
      type: Number,
      min: 0
    },
    // Custom maximum price (overrides service base price)
    maxPrice: {
      type: Number,
      min: 0,
      validate: {
        validator: function(value) {
          return !this.pricing.minPrice || value >= this.pricing.minPrice;
        },
        message: 'Maximum price must be greater than or equal to minimum price'
      }
    },
    // Whether to use custom pricing or service default
    useCustomPricing: {
      type: Boolean,
      default: false
    },
    // Price negotiation allowed
    negotiable: {
      type: Boolean,
      default: true
    },
    // Call-out fee
    callOutFee: {
      type: Number,
      default: 0,
      min: 0
    },
    // Currency
    currency: {
      type: String,
      default: 'KES'
    }
  },

  // Technician's custom description for this service
  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },

  // Portfolio images for this specific service (max 15)
  portfolioImages: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      maxlength: 200
    },
    order: {
      type: Number,
      default: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Availability status for this service
  availability: {
    // Currently offering this service
    isActive: {
      type: Boolean,
      default: true
    },
    // Available for emergency calls
    emergencyAvailable: {
      type: Boolean,
      default: false
    },
    // Emergency premium (percentage markup)
    emergencyPremium: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // Custom availability schedule for this service
    schedule: [{
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        required: true
      },
      startTime: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      endTime: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      isAvailable: {
        type: Boolean,
        default: true
      }
    }],
    // Service radius in kilometers
    serviceRadius: {
      type: Number,
      default: 10,
      min: 1,
      max: 100
    }
  },

  // Rating specific to this service
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    // Rating breakdown
    breakdown: {
      five: { type: Number, default: 0 },
      four: { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      two: { type: Number, default: 0 },
      one: { type: Number, default: 0 }
    }
  },

  // Job statistics for this service
  stats: {
    // Total jobs completed for this service
    jobsCompleted: {
      type: Number,
      default: 0
    },
    // Jobs in progress
    jobsInProgress: {
      type: Number,
      default: 0
    },
    // Total jobs cancelled
    jobsCancelled: {
      type: Number,
      default: 0
    },
    // Total revenue from this service
    totalRevenue: {
      type: Number,
      default: 0
    },
    // Average completion time (in minutes)
    averageCompletionTime: {
      type: Number,
      default: 0
    },
    // Repeat customer rate
    repeatCustomerRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // Response time (in minutes)
    averageResponseTime: {
      type: Number,
      default: 0
    }
  },

  // Skills and certifications for this service
  qualifications: {
    // Years of experience in this specific service
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: 0
    },
    // Relevant certifications
    certifications: [{
      name: String,
      issuer: String,
      dateObtained: Date,
      expiryDate: Date,
      documentUrl: String,
      verified: {
        type: Boolean,
        default: false
      }
    }],
    // Special equipment owned
    equipment: [String]
  },

  // Service-specific notes (visible to customers)
  customerNotes: {
    type: String,
    maxlength: 500
  },

  // Internal notes (only visible to technician)
  internalNotes: {
    type: String,
    maxlength: 500
  },

  // Verification status
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    verificationDocuments: [{
      url: String,
      publicId: String,
      type: String,
      uploadedAt: Date
    }]
  },

  // Promotion/boost status
  promotion: {
    isPromoted: {
      type: Boolean,
      default: false
    },
    promotedAt: Date,
    promotedUntil: Date,
    promotionType: {
      type: String,
      enum: ['none', 'featured', 'highlighted', 'priority'],
      default: 'none'
    }
  },

  // Soft delete
  deletedAt: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== COMPOUND INDEXES =====
TechnicianServiceSchema.index({ technician: 1, service: 1 }, { unique: true });
TechnicianServiceSchema.index({ technician: 1, category: 1 });
TechnicianServiceSchema.index({ category: 1, 'rating.average': -1 });
TechnicianServiceSchema.index({ service: 1, 'rating.average': -1 });
TechnicianServiceSchema.index({ 'availability.isActive': 1, 'rating.average': -1 });
TechnicianServiceSchema.index({ 'promotion.isPromoted': 1, 'promotion.promotedUntil': 1 });

// Text search index
TechnicianServiceSchema.index({
  description: 'text',
  customerNotes: 'text'
});

// ===== VIRTUAL FIELDS =====

// Virtual for effective price range
TechnicianServiceSchema.virtual('effectivePriceRange').get(function() {
  const currency = this.pricing.currency || 'KES';

  // If custom pricing is set and enabled, use it
  if (this.pricing.useCustomPricing && this.pricing.minPrice !== undefined) {
    if (this.pricing.minPrice === this.pricing.maxPrice) {
      return `${currency} ${this.pricing.minPrice.toLocaleString()}`;
    }
    return `${currency} ${this.pricing.minPrice.toLocaleString()} - ${this.pricing.maxPrice.toLocaleString()}`;
  }

  // Otherwise, return null (use service default)
  return null;
});

// Virtual for completion rate
TechnicianServiceSchema.virtual('completionRate').get(function() {
  const totalJobs = this.stats.jobsCompleted + this.stats.jobsCancelled;
  if (totalJobs === 0) return 0;
  return ((this.stats.jobsCompleted / totalJobs) * 100).toFixed(1);
});

// ===== MIDDLEWARE =====

// Validate portfolio images limit (max 15)
TechnicianServiceSchema.pre('save', function(next) {
  if (this.portfolioImages && this.portfolioImages.length > 15) {
    return next(new Error('Maximum 15 portfolio images allowed per service'));
  }
  next();
});

// Update technician's service count when creating/deleting
TechnicianServiceSchema.post('save', async function() {
  try {
    const Service = mongoose.model('Service');
    await Service.findByIdAndUpdate(this.service, {
      $inc: { 'stats.techniciansOffering': 1 }
    });
  } catch (error) {
    console.error('Error updating service stats:', error);
  }
});

TechnicianServiceSchema.post('remove', async function() {
  try {
    const Service = mongoose.model('Service');
    await Service.findByIdAndUpdate(this.service, {
      $inc: { 'stats.techniciansOffering': -1 }
    });
  } catch (error) {
    console.error('Error updating service stats:', error);
  }
});

// ===== STATIC METHODS =====

/**
 * Find all services offered by a technician
 * @param {ObjectId} technicianId - Technician user ID
 * @returns {Promise<Array>} List of technician services
 */
TechnicianServiceSchema.statics.findByTechnician = function(technicianId) {
  return this.find({
    technician: technicianId,
    'availability.isActive': true,
    deletedAt: null
  })
    .populate('service', 'name slug icon description basePrice estimatedDuration')
    .populate('category', 'name slug color')
    .sort({ 'rating.average': -1, createdAt: -1 });
};

/**
 * Find technicians offering a specific service
 * @param {ObjectId} serviceId - Service ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of technician services
 */
TechnicianServiceSchema.statics.findByService = function(serviceId, options = {}) {
  const { limit = 20, minRating = 0, sortBy = 'rating' } = options;

  const sortOptions = {
    rating: { 'rating.average': -1, 'stats.jobsCompleted': -1 },
    jobs: { 'stats.jobsCompleted': -1 },
    recent: { createdAt: -1 },
    price: { 'pricing.minPrice': 1 }
  };

  return this.find({
    service: serviceId,
    'availability.isActive': true,
    'rating.average': { $gte: minRating },
    deletedAt: null
  })
    .populate('technician', 'firstName lastName profilePicture rating location kyc.verified kyc.verifiedAt')
    .sort(sortOptions[sortBy] || sortOptions.rating)
    .limit(limit);
};

/**
 * Find top-rated technician services in a category
 * @param {ObjectId} categoryId - Category ID
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} Top-rated technician services
 */
TechnicianServiceSchema.statics.findTopInCategory = function(categoryId, limit = 10) {
  return this.find({
    category: categoryId,
    'availability.isActive': true,
    'rating.count': { $gte: 3 },
    deletedAt: null
  })
    .populate('technician', 'firstName lastName profilePicture rating')
    .populate('service', 'name slug icon')
    .sort({ 'rating.average': -1, 'stats.jobsCompleted': -1 })
    .limit(limit);
};

/**
 * Find nearby technicians for a service
 * @param {ObjectId} serviceId - Service ID
 * @param {Array} coordinates - [longitude, latitude]
 * @param {number} maxDistance - Maximum distance in km
 * @returns {Promise<Array>} Nearby technician services
 */
TechnicianServiceSchema.statics.findNearbyForService = async function(
  serviceId,
  coordinates,
  maxDistance = 10
) {
  const User = mongoose.model('User');

  // First get all technicians offering this service
  const technicianServices = await this.find({
    service: serviceId,
    'availability.isActive': true,
    deletedAt: null
  })
    .select('technician pricing rating stats availability.serviceRadius')
    .lean();

  if (technicianServices.length === 0) return [];

  const technicianIds = technicianServices.map(ts => ts.technician);

  // Find nearby technicians
  const nearbyTechnicians = await User.find({
    _id: { $in: technicianIds },
    status: 'active',
    role: 'technician',
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance * 1000 // Convert to meters
      }
    }
  })
    .select('firstName lastName profilePicture rating location')
    .lean();

  // Combine technician data with service data
  const technicianMap = new Map(
    nearbyTechnicians.map(t => [t._id.toString(), t])
  );

  return technicianServices
    .filter(ts => technicianMap.has(ts.technician.toString()))
    .map(ts => ({
      ...ts,
      technician: technicianMap.get(ts.technician.toString())
    }))
    .sort((a, b) => b.rating.average - a.rating.average);
};

/**
 * Get statistics for a technician's services
 * @param {ObjectId} technicianId - Technician user ID
 * @returns {Promise<Object>} Aggregated statistics
 */
TechnicianServiceSchema.statics.getTechnicianStats = async function(technicianId) {
  const stats = await this.aggregate([
    {
      $match: {
        technician: mongoose.Types.ObjectId(technicianId),
        deletedAt: null
      }
    },
    {
      $group: {
        _id: null,
        totalServices: { $sum: 1 },
        totalJobsCompleted: { $sum: '$stats.jobsCompleted' },
        totalRevenue: { $sum: '$stats.totalRevenue' },
        averageRating: { $avg: '$rating.average' },
        totalRatings: { $sum: '$rating.count' }
      }
    }
  ]);

  return stats[0] || {
    totalServices: 0,
    totalJobsCompleted: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalRatings: 0
  };
};

// ===== INSTANCE METHODS =====

/**
 * Add a portfolio image
 * @param {Object} imageData - Image data
 * @returns {Promise<Object>} Updated technician service
 */
TechnicianServiceSchema.methods.addPortfolioImage = async function(imageData) {
  if (this.portfolioImages.length >= 15) {
    throw new Error('Maximum 15 portfolio images allowed');
  }

  this.portfolioImages.push({
    ...imageData,
    order: this.portfolioImages.length,
    uploadedAt: new Date()
  });

  return this.save();
};

/**
 * Remove a portfolio image
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Updated technician service
 */
TechnicianServiceSchema.methods.removePortfolioImage = async function(publicId) {
  this.portfolioImages = this.portfolioImages.filter(
    img => img.publicId !== publicId
  );

  // Reorder remaining images
  this.portfolioImages.forEach((img, index) => {
    img.order = index;
  });

  return this.save();
};

/**
 * Update rating after a new review
 * @param {number} rating - New rating (1-5)
 * @returns {Promise<Object>} Updated technician service
 */
TechnicianServiceSchema.methods.updateRating = async function(rating) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Update breakdown
  const ratingKey = ['one', 'two', 'three', 'four', 'five'][rating - 1];
  this.rating.breakdown[ratingKey] += 1;

  // Recalculate average
  const totalRatings = this.rating.count + 1;
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.average = (currentTotal + rating) / totalRatings;
  this.rating.count = totalRatings;

  // Round to 2 decimal places
  this.rating.average = Math.round(this.rating.average * 100) / 100;

  return this.save();
};

/**
 * Record a completed job
 * @param {Object} jobData - Job completion data
 * @returns {Promise<Object>} Updated technician service
 */
TechnicianServiceSchema.methods.recordCompletedJob = async function(jobData) {
  const { revenue, completionTime } = jobData;

  this.stats.jobsCompleted += 1;
  this.stats.jobsInProgress = Math.max(0, this.stats.jobsInProgress - 1);

  if (revenue) {
    this.stats.totalRevenue += revenue;
  }

  if (completionTime) {
    const currentAvg = this.stats.averageCompletionTime;
    const completedJobs = this.stats.jobsCompleted;

    // Calculate new rolling average
    this.stats.averageCompletionTime = Math.round(
      ((currentAvg * (completedJobs - 1)) + completionTime) / completedJobs
    );
  }

  return this.save();
};

/**
 * Toggle availability
 * @param {boolean} isActive - New availability status
 * @returns {Promise<Object>} Updated technician service
 */
TechnicianServiceSchema.methods.setAvailability = async function(isActive) {
  this.availability.isActive = isActive;
  return this.save();
};

/**
 * Promote the service
 * @param {string} promotionType - Type of promotion
 * @param {number} durationDays - Duration in days
 * @returns {Promise<Object>} Updated technician service
 */
TechnicianServiceSchema.methods.promote = async function(promotionType, durationDays = 7) {
  this.promotion = {
    isPromoted: true,
    promotedAt: new Date(),
    promotedUntil: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
    promotionType
  };

  return this.save();
};

/**
 * Soft delete the technician service
 * @returns {Promise<void>}
 */
TechnicianServiceSchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  this.availability.isActive = false;
  await this.save();
};

module.exports = mongoose.model('TechnicianService', TechnicianServiceSchema);
