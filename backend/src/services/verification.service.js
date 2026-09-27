/**
 * Technician ID verification. An admin marks a technician verified after
 * checking their ID; the public sees "ID verified" or "Not yet verified"
 * (User `verification` virtual). Nothing else makes a technician verified.
 */
const User = require('../models/User');

class VerificationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function setVerified(userId, { verified, adminId }) {
  const user = await User.findById(userId).select('role kyc firstName lastName');
  if (!user) throw new VerificationError('User not found', 404);
  if (user.role !== 'technician') throw new VerificationError('Only technicians are verified');
  user.set('kyc.verified', Boolean(verified));
  user.set('kyc.verifiedAt', verified ? new Date() : undefined);
  user.set('kyc.verifiedBy', verified ? adminId : undefined);
  await user.save({ validateModifiedOnly: true });

  try {
    await require('./notification.service').createNotification(user._id, {
      type: verified ? 'account_verified' : 'system_update',
      category: 'system',
      title: verified ? 'Your ID is verified' : 'ID verification removed',
      body: verified
        ? 'Customers now see an "ID verified" badge on your profile.'
        : 'Your profile shows "Not yet verified" again. Contact Dumuwaks if this is unexpected.',
    });
  } catch (_) {
    /* notification is best-effort */
  }
  return { _id: user._id, verification: user.verification };
}

module.exports = { setVerified, VerificationError };
