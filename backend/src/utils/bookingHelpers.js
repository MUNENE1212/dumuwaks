const Booking = require('../models/Booking');

/**
 * Booking Helper Utilities
 * DRY authorization checks and populate presets for booking controllers.
 */

// === POPULATE PRESETS ===
const BOOKING_POPULATES = {
  // Used by status transitions (en_route, arrived, in_progress, requestCompletion)
  statusOps: [
    { path: 'customer', select: 'firstName lastName email phoneNumber' },
    { path: 'technician', select: 'firstName lastName email' }
  ],

  // Used by booking list (getBookings)
  list: [
    { path: 'customer', select: 'firstName lastName phoneNumber profilePicture' },
    { path: 'technician', select: 'firstName lastName phoneNumber profilePicture rating skills kyc.verified kyc.verifiedAt' }
  ],

  // Used by offer operations (accept, reject, counterOffer, respond, withdraw)
  offers: [
    { path: 'customer', select: 'firstName lastName email phoneNumber' },
    { path: 'technician', select: 'firstName lastName email' }
  ],

  // Used by pause, cancel, assign, completion media upload
  minimal: [
    { path: 'customer', select: 'firstName lastName' },
    { path: 'technician', select: 'firstName lastName' }
  ],

  // Used by confirmCompletion (needs phoneNumber on both sides)
  confirmCompletion: [
    { path: 'customer', select: 'firstName lastName email phoneNumber' },
    { path: 'technician', select: 'firstName lastName email phoneNumber' }
  ],

  // Used by getCompletionMedia
  completionMedia: [
    { path: 'customer', select: 'firstName lastName' },
    { path: 'technician', select: 'firstName lastName' },
    { path: 'completionMedia.uploadedBy', select: 'firstName lastName' }
  ],

  // Used by getPendingCompletions
  pendingCompletion: [
    { path: 'customer', select: 'firstName lastName email phoneNumber' },
    { path: 'technician', select: 'firstName lastName' },
    { path: 'completionRequest.requestedBy', select: 'firstName lastName' }
  ],

  // Used by initiateFollowUp
  followUp: [
    { path: 'customer', select: 'firstName lastName email phoneNumber' },
    { path: 'technician', select: 'firstName lastName' }
  ],

  // Used by releaseBookingFee
  feeRelease: [
    { path: 'technician', select: 'firstName lastName' },
    { path: 'customer', select: '_id' }
  ],

  // Used by refundBookingFee
  feeRefund: [
    { path: 'customer', select: 'firstName lastName' }
  ]
};

// === AUTHORIZATION HELPERS ===

/**
 * Check if user is the booking's assigned technician.
 * Works for both populated ({_id: ...}) and raw ObjectId references.
 */
function isTechnician(booking, userId) {
  const techId = booking.technician?._id?.toString() || booking.technician?.toString();
  return techId === userId;
}

/**
 * Check if user is the booking's customer.
 * Works for both populated ({_id: ...}) and raw ObjectId references.
 */
function isCustomer(booking, userId) {
  const custId = booking.customer?._id?.toString() || booking.customer?.toString();
  return custId === userId;
}

/**
 * Check if user has support or admin role.
 */
function isSupportOrAdmin(userRole) {
  return ['support', 'admin'].includes(userRole);
}

/**
 * Determine the user's role relative to a booking.
 * Returns { authorized: boolean, role: string|null }.
 */
function getBookingRole(booking, userId, userRole) {
  if (isCustomer(booking, userId)) return { authorized: true, role: 'customer' };
  if (isTechnician(booking, userId)) return { authorized: true, role: 'technician' };
  if (isSupportOrAdmin(userRole)) return { authorized: true, role: userRole };
  return { authorized: false, role: null };
}

/**
 * Find booking by ID with a named populate preset.
 * Returns null if not found.
 */
async function findBookingPopulated(bookingId, presetName) {
  const populate = BOOKING_POPULATES[presetName];
  if (!populate) {
    throw new Error(`Unknown populate preset: ${presetName}`);
  }
  return Booking.findById(bookingId).populate(populate);
}

/**
 * Standard 404 "Booking not found" response.
 */
function notFound(res) {
  return res.status(404).json({ success: false, message: 'Booking not found' });
}

/**
 * Standard 403 "Not authorized" response.
 */
function notAuthorized(res, message = 'Not authorized for this booking') {
  return res.status(403).json({ success: false, message });
}

module.exports = {
  BOOKING_POPULATES,
  isTechnician,
  isCustomer,
  isSupportOrAdmin,
  getBookingRole,
  findBookingPopulated,
  notFound,
  notAuthorized
};
