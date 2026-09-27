const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * Escrow Milestone Schema
 * Tracks individual milestone payments within an escrow
 */
const EscrowMilestoneSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'released', 'refunded'],
    default: 'pending'
  },
  releasedAt: Date,
  refundedAt: Date,
  mpesaReference: String
}, { _id: true, timestamps: true });

/**
 * Escrow Funding Schema
 * Tracks funding details from customer
 */
const EscrowFundingSchema = new Schema({
  mpesaReference: {
    type: String,
    sparse: true
  },
  checkoutRequestID: {
    type: String,
    sparse: true
  },
  fundedAt: Date,
  amount: {
    type: Number,
    min: 0
  },
  phoneNumber: String
}, { _id: false });

/**
 * Escrow Payout Schema
 * Tracks payout details to technician
 */
const EscrowPayoutSchema = new Schema({
  mpesaReference: String,
  transactionID: String,
  paidOutAt: Date,
  amount: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  failureReason: String
}, { _id: false });

/**
 * Escrow Refund Schema
 * Tracks refund details to customer
 */
const EscrowRefundSchema = new Schema({
  reason: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    min: 0
  },
  refundedAt: Date,
  mpesaReference: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  failureReason: String,
  initiatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: false });

/**
 * Escrow Dispute Schema
 * Tracks dispute details and resolution
 */
const EscrowDisputeSchema = new Schema({
  reason: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  openedAt: {
    type: Date,
    default: Date.now
  },
  openedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resolvedAt: Date,
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: {
    type: String,
    enum: ['customer_favor', 'technician_favor', 'split', 'no_action']
  },
  resolutionNotes: String,
  customerShare: {
    type: Number,
    min: 0,
    max: 100
  },
  technicianShare: {
    type: Number,
    min: 0,
    max: 100
  },
  evidence: [{
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'text']
    },
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, { _id: false });

/**
 * Escrow History Schema
 * Audit trail of all escrow actions
 */
const EscrowHistorySchema = new Schema({
  action: {
    type: String,
    required: true
  },
  fromStatus: String,
  toStatus: String,
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: String,
  metadata: Schema.Types.Mixed
}, { _id: false });

/**
 * One STK push into the IntaSend escrow wallet (initial payment or a top-up).
 */
const EscrowCollectionSchema = new Schema({
  kind: { type: String, enum: ['initial', 'topup'], default: 'initial' },
  topupIndex: Number,
  apiRef: { type: String, required: true },
  invoiceId: String,
  phone: String,
  amount: { type: Number, required: true, min: 0 },
  state: {
    type: String,
    enum: ['REQUESTING', 'PENDING', 'PROCESSING', 'COMPLETE', 'FAILED'],
    default: 'REQUESTING'
  },
  value: Number,
  netAmount: Number,
  charges: Number,
  providerRef: String,
  failedReason: String,
  requestedAt: { type: Date, default: Date.now },
  confirmedAt: Date
}, { _id: true });

/**
 * Extra cost agreed on site: proposed by the technician, approved by the customer,
 * then collected into the same escrow.
 */
const EscrowTopupSchema = new Schema({
  amount: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true, maxlength: 500 },
  proposedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  proposedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['proposed', 'approved', 'rejected', 'paid'], default: 'proposed' },
  decidedAt: Date
}, { _id: true });

/**
 * Main Escrow Schema
 * Holds payment in escrow until job completion
 */
const EscrowSchema = new Schema({
  // Reference to booking
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
  },

  // User references
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  technician: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Amount breakdown
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  technicianPayout: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'KES'
  },

  // Where the money actually is. `legacy` escrows (before IntaSend) are status-only.
  provider: {
    type: String,
    enum: ['legacy', 'intasend'],
    default: 'legacy'
  },
  collections: [EscrowCollectionSchema],
  topups: [EscrowTopupSchema],
  // When the technician asked the customer to confirm the work; auto-release counts from here
  completionRequestedAt: Date,

  // Status management
  status: {
    type: String,
    enum: [
      'pending',        // Created but not funded
      'funded',         // Customer has deposited funds
      'partial_release', // Some milestones released
      'released',       // All funds released to technician
      'refunded',       // Funds returned to customer
      'disputed',       // Under dispute
      'cancelled',      // Cancelled before funding
      'release_pending', // Payout to technician under way
      'refunding',      // Refund to customer under way
      'partially_refunded' // Refunded in part, rest paid to the technician
    ],
    default: 'pending'
  },

  // Milestone tracking for phased payments
  milestones: [EscrowMilestoneSchema],

  // Funding details
  funding: EscrowFundingSchema,

  // Payout details
  payout: EscrowPayoutSchema,

  // Refund details
  refund: EscrowRefundSchema,

  // Dispute details
  dispute: EscrowDisputeSchema,

  // Timestamps
  expiresAt: Date,        // Auto-release or refund deadline
  fundedAt: Date,         // When escrow was funded
  releasedAt: Date,       // When funds were released
  refundedAt: Date,       // When funds were refunded
  cancelledAt: Date,      // When escrow was cancelled

  // Auto-action flags
  autoReleaseEnabled: {
    type: Boolean,
    default: true
  },
  autoReleaseAfterDays: {
    type: Number,
    default: 3
  },

  // Notes
  notes: {
    customer: String,
    technician: String,
    admin: String
  },

  // History log
  history: [EscrowHistorySchema],

  // Metadata
  metadata: Schema.Types.Mixed

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== INDEXES =====
// booking already has a unique index from the field definition
EscrowSchema.index({ customer: 1, status: 1 });
EscrowSchema.index({ technician: 1, status: 1 });
EscrowSchema.index({ status: 1, expiresAt: 1 });
// funding.checkoutRequestID already has a sparse index from the field definition
EscrowSchema.index({ createdAt: -1 });

// ===== VIRTUALS =====

/**
 * Check if escrow is active (funded and awaiting release)
 */
EscrowSchema.virtual('isActive').get(function() {
  return ['funded', 'partial_release'].includes(this.status);
});

/**
 * Check if escrow is completed
 */
EscrowSchema.virtual('isCompleted').get(function() {
  return ['released', 'refunded'].includes(this.status);
});

/**
 * Check if escrow can be released
 */
EscrowSchema.virtual('canRelease').get(function() {
  return this.status === 'funded' || this.status === 'partial_release';
});

/**
 * Check if escrow can be refunded
 */
EscrowSchema.virtual('canRefund').get(function() {
  return ['pending', 'funded', 'partial_release'].includes(this.status);
});

/**
 * Check if escrow can be disputed
 */
EscrowSchema.virtual('canDispute').get(function() {
  return ['funded', 'partial_release', 'released'].includes(this.status);
});

/**
 * Get total released amount
 */
EscrowSchema.virtual('totalReleased').get(function() {
  if (this.status === 'released') {
    return this.technicianPayout;
  }
  if (this.status === 'partial_release' && this.milestones.length > 0) {
    return this.milestones
      .filter(m => m.status === 'released')
      .reduce((sum, m) => sum + m.amount, 0);
  }
  return 0;
});

/**
 * Get remaining balance
 */
EscrowSchema.virtual('remainingBalance').get(function() {
  return this.totalAmount - this.totalReleased;
});

// ===== MIDDLEWARE =====

/**
 * Pre-save middleware to set expiration date
 */
EscrowSchema.pre('save', function(next) {
  // Set expiresAt for new escrows
  if (this.isNew && !this.expiresAt) {
    const days = this.autoReleaseAfterDays || 3;
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  next();
});

/**
 * Post-save middleware to log history
 */
EscrowSchema.post('save', function(doc) {
  // Log status changes
  if (doc.isModified('status') && doc._previousStatus) {
    // History entry is added manually in service layer
  }
});

// ===== METHODS =====

/**
 * Add history entry
 *
 * @param {Object} entry - History entry details
 * @param {string} entry.action - Action performed
 * @param {ObjectId} entry.performedBy - User who performed action
 * @param {string} entry.fromStatus - Previous status
 * @param {string} entry.toStatus - New status
 * @param {string} entry.notes - Additional notes
 */
EscrowSchema.methods.addHistory = function(entry) {
  this.history.push({
    action: entry.action,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    performedBy: entry.performedBy,
    notes: entry.notes,
    timestamp: new Date()
  });
  return this;
};

/**
 * Check if escrow is expired
 *
 * @returns {boolean} True if expired
 */
EscrowSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

/**
 * Calculate time until expiry
 *
 * @returns {number|null} Milliseconds until expiry or null if no expiry
 */
EscrowSchema.methods.timeUntilExpiry = function() {
  if (!this.expiresAt) return null;
  return Math.max(0, this.expiresAt.getTime() - Date.now());
};

/**
 * Get milestone by index
 *
 * @param {number} index - Milestone index
 * @returns {Object|null} Milestone object
 */
EscrowSchema.methods.getMilestone = function(index) {
  return this.milestones[index] || null;
};

/**
 * Get total pending milestone amount
 *
 * @returns {number} Total pending amount
 */
EscrowSchema.methods.getPendingMilestoneTotal = function() {
  return this.milestones
    .filter(m => m.status === 'pending')
    .reduce((sum, m) => sum + m.amount, 0);
};

/**
 * Get total released milestone amount
 *
 * @returns {number} Total released amount
 */
EscrowSchema.methods.getReleasedMilestoneTotal = function() {
  return this.milestones
    .filter(m => m.status === 'released')
    .reduce((sum, m) => sum + m.amount, 0);
};

/**
 * Validate transition to new status
 *
 * @param {string} newStatus - Target status
 * @returns {boolean} True if transition is valid
 */
EscrowSchema.methods.canTransitionTo = function(newStatus) {
  const validTransitions = {
    'pending': ['funded', 'cancelled'],
    'funded': ['partial_release', 'released', 'refunded', 'disputed', 'release_pending', 'refunding'],
    'partial_release': ['released', 'refunded', 'disputed'],
    'released': ['disputed'],
    'refunded': [],
    'disputed': ['released', 'refunded', 'release_pending', 'refunding'],
    'cancelled': [],
    'release_pending': ['released'],
    'refunding': ['refunded', 'partially_refunded'],
    'partially_refunded': []
  };

  return validTransitions[this.status]?.includes(newStatus) || false;
};

// ===== STATIC METHODS =====

/**
 * Find escrow by booking ID
 *
 * @param {ObjectId} bookingId - Booking ID
 * @returns {Promise<Object>} Escrow document
 */
EscrowSchema.statics.findByBooking = function(bookingId) {
  return this.findOne({ booking: bookingId })
    .populate('customer', 'firstName lastName phoneNumber email')
    .populate('technician', 'firstName lastName phoneNumber email');
};

/**
 * Find active escrows for technician
 *
 * @param {ObjectId} technicianId - Technician ID
 * @returns {Promise<Array>} Array of escrows
 */
EscrowSchema.statics.findActiveByTechnician = function(technicianId) {
  return this.find({
    technician: technicianId,
    status: { $in: ['funded', 'partial_release'] }
  })
    .populate('booking', 'bookingNumber serviceType status')
    .populate('customer', 'firstName lastName phoneNumber')
    .sort({ createdAt: -1 });
};

/**
 * Find escrows expiring soon
 *
 * @param {number} hoursWithin - Hours until expiry
 * @returns {Promise<Array>} Array of expiring escrows
 */
EscrowSchema.statics.findExpiringWithin = function(hoursWithin) {
  const threshold = new Date(Date.now() + hoursWithin * 60 * 60 * 1000);
  return this.find({
    status: { $in: ['funded', 'partial_release'] },
    expiresAt: { $lte: threshold, $gt: new Date() },
    autoReleaseEnabled: true
  })
    .populate('booking', 'bookingNumber')
    .populate('customer technician');
};

/**
 * Get escrow statistics
 *
 * @param {Date} startDate - Start date filter
 * @param {Date} endDate - End date filter
 * @returns {Promise<Object>} Statistics object
 */
EscrowSchema.statics.getStats = async function(startDate, endDate) {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalPlatformFee: { $sum: '$platformFee' },
        totalPayout: { $sum: '$technicianPayout' }
      }
    }
  ]);

  const totals = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        totalVolume: { $sum: '$totalAmount' },
        totalFees: { $sum: '$platformFee' },
        totalPayouts: { $sum: '$technicianPayout' }
      }
    }
  ]);

  return {
    byStatus: stats,
    totals: totals[0] || {
      totalCount: 0,
      totalVolume: 0,
      totalFees: 0,
      totalPayouts: 0
    }
  };
};

EscrowSchema.index({ 'collections.invoiceId': 1 });
EscrowSchema.index({ provider: 1, status: 1 });

module.exports = mongoose.model('Escrow', EscrowSchema);
