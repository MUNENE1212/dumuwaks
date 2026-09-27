const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Schema = mongoose.Schema;

// Base Location Schema (reusable)
const LocationSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  },
  address: String,
  city: String,
  county: String,
  country: {
    type: String,
    default: 'Kenya'
  }
}, { _id: false });

// Technician-specific schemas
const SkillSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'carpentry', 'masonry', 'painting', 'hvac', 'welding', 'other'],
    required: true
  },
  yearsOfExperience: Number,
  verified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    url: String,
    type: String,
    uploadedAt: Date,
    verifiedAt: Date
  }]
}, { _id: false });

const AvailabilitySchema = new Schema({
  isAvailable: {
    type: Boolean,
    default: false
  },
  schedule: [{
    dayOfWeek: {
      type: Number, // 0 = Sunday, 6 = Saturday
      required: true
    },
    startTime: String, // "09:00"
    endTime: String, // "17:00"
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  // Real-time availability fields for Task #73
  status: {
    type: String,
    enum: ['online', 'busy', 'away', 'offline'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  currentBookingId: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  queuePosition: {
    type: Number,
    default: 0
  }
}, { _id: false });

const PortfolioSchema = new Schema({
  title: String,
  description: String,
  images: [{
    url: String,
    publicId: String
  }],
  category: String,
  completedAt: Date,
  client: {
    name: String,
    testimonial: String
  }
}, { timestamps: true });

// Work Gallery Image Schema (for technician's portfolio showcase)
const WorkGalleryImageSchema = new Schema({
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
    maxlength: 500,
    trim: true
  },
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'carpentry', 'masonry', 'painting', 'hvac', 'welding', 'other'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    trim: true
  },
  isBeforeAfter: {
    type: Boolean,
    default: false
  },
  pairId: {
    type: Schema.Types.ObjectId,
    ref: 'WorkGalleryImage'
  },
  order: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  }
}, { timestamps: true });

/** Fields that must never be sent to any client, the owner included. */
const PRIVATE_FIELDS = [
  'password', 'refreshTokens', 'twoFactorSecret', 'twoFactorAuth', 'emailVerificationToken',
  'emailVerificationExpires', 'phoneVerificationCode', 'phoneVerificationExpires', 'passwordResetToken',
  'passwordResetExpires', 'fcmTokens', 'loginHistory', 'kyc', 'payoutDestination', 'pendingPayoutDestination'
];

function stripPrivate(ret) {
  for (const f of PRIVATE_FIELDS) delete ret[f];
  return ret;
}

// Main User Schema
const UserSchema = new Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^\+?\d{7,15}$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false // Don't return password by default
  },

  // Role Management
  role: {
    type: String,
    enum: ['customer', 'technician', 'admin', 'corporate', 'support'],
    default: 'customer',
    required: true
  },

  // Profile Information
  profilePicture: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },

  // Location (Geospatial)
  location: {
    type: LocationSchema,
    index: '2dsphere' // Enables geospatial queries
  },

  // Authentication & Security
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  phoneVerificationCode: String,
  phoneVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  twoFactorSecret: String,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },

  // Refresh Tokens (for JWT)
  refreshTokens: [{
    token: String,
    createdAt: Date,
    expiresAt: Date,
    device: String
  }],

  // Account Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deactivated', 'banned'],
    default: 'active'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: Date,

  // TECHNICIAN-SPECIFIC FIELDS
  skills: {
    type: [SkillSchema],
    default: undefined // Only for technicians
  },
  availability: {
    type: AvailabilitySchema,
    default: undefined
  },
  portfolio: {
    type: [PortfolioSchema],
    default: undefined
  },
  workGalleryImages: {
    type: [WorkGalleryImageSchema],
    default: []
  },
  hourlyRate: {
    type: Number,
    min: 0
  },
  serviceRadius: {
    type: Number, // in kilometers
    default: 10
  },
  yearsOfExperience: Number,
  businessName: String,
  businessLicense: {
    number: String,
    verified: Boolean,
    documents: [{
      url: String,
      publicId: String
    }]
  },
  insurance: {
    provider: String,
    policyNumber: String,
    expiryDate: Date,
    verified: Boolean
  },

  // KYC Information
  kyc: {
    idType: {
      type: String,
      enum: ['national_id', 'passport', 'drivers_license']
    },
    idNumber: String,
    idFrontImage: {
      url: String,
      publicId: String
    },
    idBackImage: {
      url: String,
      publicId: String
    },
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Ratings & Reviews
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
    }
  },

  // Statistics
  stats: {
    totalBookings: {
      type: Number,
      default: 0
    },
    completedBookings: {
      type: Number,
      default: 0
    },
    cancelledBookings: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    responseTime: Number, // in minutes (average)
    completionRate: {
      type: Number,
      default: 0
    } // percentage
  },

  // Subscription & Pro Features (for technicians)
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'trial'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    trialEndsAt: Date,
    autoRenew: {
      type: Boolean,
      default: true
    },
    paymentMethod: String,
    features: {
      boostedVisibility: {
        type: Boolean,
        default: false
      },
      boostedPosts: {
        type: Boolean,
        default: false
      },
      prioritySupport: {
        type: Boolean,
        default: false
      },
      unlimitedPortfolio: {
        type: Boolean,
        default: false
      },
      advancedAnalytics: {
        type: Boolean,
        default: false
      },
      customBadge: {
        type: Boolean,
        default: false
      },
      featuredListing: {
        type: Boolean,
        default: false
      }
    },
    billingHistory: [{
      amount: Number,
      currency: {
        type: String,
        default: 'KES'
      },
      date: Date,
      transactionId: String,
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded']
      }
    }]
  },

  // CORPORATE-SPECIFIC FIELDS
  companyName: String,
  companyRegistration: String,
  department: String,
  employeeCount: Number,
  corporateAdmin: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  billingInfo: {
    taxId: String,
    billingEmail: String,
    billingAddress: String,
    paymentTerms: String
  },

  // SUPPORT-SPECIFIC FIELDS
  supportInfo: {
    employeeId: String,
    department: {
      type: String,
      enum: ['technical', 'billing', 'general', 'complaints']
    },
    specializations: [String], // e.g., ['bookings', 'payments', 'accounts']
    languages: [{
      type: String,
      default: 'English'
    }],
    availability: {
      status: {
        type: String,
        enum: ['available', 'busy', 'away', 'offline'],
        default: 'offline'
      },
      maxConcurrentTickets: {
        type: Number,
        default: 5
      }
    },
    stats: {
      ticketsHandled: {
        type: Number,
        default: 0
      },
      ticketsClosed: {
        type: Number,
        default: 0
      },
      averageResponseTime: Number, // in minutes
      averageResolutionTime: Number, // in minutes
      satisfactionRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      ratingCount: {
        type: Number,
        default: 0
      }
    },
    shiftSchedule: [{
      dayOfWeek: Number, // 0 = Sunday, 6 = Saturday
      startTime: String, // "09:00"
      endTime: String // "17:00"
    }]
  },

  // Social Features
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  followersCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },
  postsCount: {
    type: Number,
    default: 0
  },

  // Notifications Preferences
  notificationPreferences: {
    email: {
      bookings: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      updates: { type: Boolean, default: true }
    },
    sms: {
      bookings: { type: Boolean, default: true },
      messages: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false }
    },
    push: {
      bookings: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      social: { type: Boolean, default: true },
      updates: { type: Boolean, default: true }
    },
    whatsapp: {
      bookings: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      messages: { type: Boolean, default: false }
    }
  },

  // Where technician payouts go (IntaSend: M-Pesa B2C or PesaLink bank transfer).
  // Changing it needs a code sent to the new destination's phone, and payouts
  // to a destination changed in the last 24 h are held for review.
  payoutDestination: {
    method: { type: String, enum: ['mpesa', 'bank'] },
    phone: String,
    bankCode: String,
    bankName: String,
    accountNumber: String,
    accountName: String,
    verifiedAt: Date,
    changedAt: Date
  },
  pendingPayoutDestination: {
    method: { type: String, enum: ['mpesa', 'bank'] },
    phone: String,
    bankCode: String,
    bankName: String,
    accountNumber: String,
    accountName: String,
    otpHash: { type: String, select: false },
    otpExpires: Date,
    attempts: { type: Number, default: 0 },
    requestedAt: Date
  },

  // FCM Tokens for Push Notifications (Mobile)
  fcmTokens: [{
    token: String,
    device: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Audit Trail
  loginHistory: [{
    timestamp: Date,
    ipAddress: String,
    device: String,
    location: String
  }],

  // GDPR & Compliance
  gdprConsent: {
    marketing: Boolean,
    dataProcessing: Boolean,
    dateSigned: Date
  },

  // Account Deletion (Soft Delete)
  deletedAt: Date,
  deleteReason: String

}, {
  timestamps: true, // Adds createdAt and updatedAt
  // Everything that leaves the server as JSON goes through stripPrivate: no
  // endpoint can leak tokens, ID documents or payout details by forgetting a select.
  toJSON: { virtuals: true, transform: (doc, ret) => stripPrivate(ret) },
  toObject: { virtuals: true }
});

/**
 * Public trust signal: an admin has checked this technician's ID (kyc.verified).
 * Technicians are shown as verified or not yet verified — never "all verified".
 */
UserSchema.virtual('verification').get(function() {
  return {
    isVerified: Boolean(this.kyc && this.kyc.verified),
    verifiedAt: (this.kyc && this.kyc.verifiedAt) || null
  };
});

// ===== INDEXES =====
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ 'skills.category': 1 });
UserSchema.index({ 'rating.average': -1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ isOnline: 1, role: 1 }); // For finding online technicians
UserSchema.index({ 'stats.completedBookings': -1 }); // For leaderboards

// Text Search Index (for searching users by name, skills, bio)
UserSchema.index({
  firstName: 'text',
  lastName: 'text',
  bio: 'text',
  'skills.name': 'text',
  businessName: 'text'
});

// ===== VIRTUAL FIELDS =====
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for reviews
UserSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'technician',
  justOne: false
});

// ===== MIDDLEWARE =====

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update lastSeen on save if isOnline changed to false
UserSchema.pre('save', function(next) {
  if (this.isModified('isOnline') && !this.isOnline) {
    this.lastSeen = new Date();
  }
  next();
});

// Validate work gallery images limit (max 10)
UserSchema.pre('save', function(next) {
  if (this.workGalleryImages && this.workGalleryImages.length > 10) {
    return next(new Error('Maximum 10 work gallery images allowed per technician'));
  }
  next();
});

// ===== METHODS =====

// Compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
UserSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Generate phone verification code
UserSchema.methods.generatePhoneVerificationCode = function() {
  const crypto = require('crypto');
  const code = crypto.randomInt(100000, 1000000).toString(); // cryptographically secure 6-digit code
  this.phoneVerificationCode = code;
  this.phoneVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return code;
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return token;
};

// Check if user is available (for technicians)
UserSchema.methods.isAvailableAt = function(dayOfWeek, time) {
  if (!this.availability || this.role !== 'technician') return false;

  // Check if generally available first
  if (!this.availability.isAvailable) return false;

  // If no schedule defined, assume available if isAvailable flag is true
  if (!this.availability.schedule || this.availability.schedule.length === 0) {
    return this.availability.isAvailable;
  }

  const scheduleSlot = this.availability.schedule.find(a => a.dayOfWeek === dayOfWeek);
  if (!scheduleSlot || !scheduleSlot.isAvailable) return false;

  // Check if time is within range
  const [hours, minutes] = time.split(':').map(Number);
  const [startHours, startMinutes] = scheduleSlot.startTime.split(':').map(Number);
  const [endHours, endMinutes] = scheduleSlot.endTime.split(':').map(Number);

  const timeInMinutes = hours * 60 + minutes;
  const startInMinutes = startHours * 60 + startMinutes;
  const endInMinutes = endHours * 60 + endMinutes;

  return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
};

// Calculate completion rate
UserSchema.methods.calculateCompletionRate = function() {
  if (this.stats.totalBookings === 0) return 0;
  return (this.stats.completedBookings / this.stats.totalBookings * 100).toFixed(2);
};

// Add FCM Token
UserSchema.methods.addFCMToken = function(token, device, platform) {
  // Remove duplicate tokens
  this.fcmTokens = this.fcmTokens.filter(t => t.token !== token);

  // Add new token
  this.fcmTokens.push({
    token,
    device,
    platform,
    addedAt: new Date()
  });

  // Keep only last 5 tokens per user
  if (this.fcmTokens.length > 5) {
    this.fcmTokens = this.fcmTokens.slice(-5);
  }
};

// Remove FCM Token
UserSchema.methods.removeFCMToken = function(token) {
  this.fcmTokens = this.fcmTokens.filter(t => t.token !== token);
};

// Check if user has an active pro subscription
UserSchema.methods.isPro = function() {
  if (!this.subscription) return false;

  const isProOrPremium = ['pro', 'premium'].includes(this.subscription.plan);
  const isActive = this.subscription.status === 'active';
  const notExpired = !this.subscription.endDate || new Date(this.subscription.endDate) > new Date();

  return isProOrPremium && isActive && notExpired;
};

// Check if user has a specific feature
UserSchema.methods.hasFeature = function(featureName) {
  if (!this.subscription || !this.subscription.features) return false;
  return this.subscription.features[featureName] === true;
};

// Get subscription boost multiplier for matching algorithm
UserSchema.methods.getBoostMultiplier = function() {
  if (!this.isPro()) return 1.0;

  switch (this.subscription.plan) {
    case 'premium':
      return 1.5; // 50% boost
    case 'pro':
      return 1.25; // 25% boost
    default:
      return 1.0;
  }
};

// Get public profile (hides sensitive fields unless user has active booking)
UserSchema.methods.getPublicProfile = async function(requestingUserId = null) {
  const userObject = this.toObject();

  // Always remove these fields from public profile
  delete userObject.password;
  delete userObject.refreshTokens;
  delete userObject.emailVerificationToken;
  delete userObject.phoneVerificationCode;
  delete userObject.passwordResetToken;
  delete userObject.twoFactorSecret;
  delete userObject.fcmTokens;
  delete userObject.loginHistory;
  delete userObject.kyc;
  delete userObject.payoutDestination;
  delete userObject.pendingPayoutDestination;

  // If no requesting user or same user, return all visible data
  if (!requestingUserId || requestingUserId.toString() === this._id.toString()) {
    return userObject;
  }

  // Check if users have an active booking together
  const Booking = require('mongoose').model('Booking');
  const hasActiveBooking = await Booking.exists({
    $or: [
      { customer: requestingUserId, technician: this._id },
      { customer: this._id, technician: requestingUserId }
    ],
    status: { $in: ['accepted', 'in_progress', 'completed'] }
  });

  // If no active booking, hide sensitive contact information
  if (!hasActiveBooking) {
    delete userObject.email;
    delete userObject.phoneNumber;
  }

  return userObject;
};

// ===== STATIC METHODS =====

// Find technicians by skill and location
UserSchema.statics.findTechniciansBySkillAndLocation = async function(
  skillCategory,
  longitude,
  latitude,
  maxDistance = 10000 // in meters
) {
  return this.find({
    role: 'technician',
    status: 'active',
    'skills.category': skillCategory,
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  }).select('-password -refreshTokens');
};

// Find top-rated technicians
UserSchema.statics.findTopRatedTechnicians = async function(limit = 10) {
  return this.find({
    role: 'technician',
    status: 'active',
    'rating.count': { $gte: 5 } // At least 5 reviews
  })
  .sort({ 'rating.average': -1 })
  .limit(limit)
  .select('-password -refreshTokens');
};

// Search users (text search)
UserSchema.statics.searchUsers = async function(query, role = null) {
  const searchQuery = { $text: { $search: query } };
  if (role) searchQuery.role = role;

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .select('-password -refreshTokens');
};

module.exports = mongoose.model('User', UserSchema);
