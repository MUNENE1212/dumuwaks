/**
 * Mirrors in-app notifications to WhatsApp.
 *
 * notification.service.createNotification() calls deliver() for every
 * notification it stores. Only transactional types are sent — the things a
 * customer or technician would otherwise miss while away from the app — and
 * only to people who have not sent STOP or switched the channel off.
 */

const config = require('../../config/whatsapp');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const WhatsAppSession = require('../../models/WhatsAppSession');
const evolution = require('./evolution.client');
const { toWhatsAppNumber } = require('../../utils/phone');
const logger = require('../../utils/logger');

/** Notification type → preference bucket in User.notificationPreferences.whatsapp */
const BUCKET = {
  booking_created: 'bookings',
  booking_assigned: 'bookings',
  booking_accepted: 'bookings',
  booking_rejected: 'bookings',
  booking_cancelled: 'bookings',
  booking_reminder: 'bookings',
  booking_en_route: 'bookings',
  booking_arrived: 'bookings',
  booking_completed: 'bookings',
  counter_offer_submitted: 'bookings',
  counter_offer_accepted: 'bookings',
  counter_offer_rejected: 'bookings',
  completion_requested: 'bookings',
  completion_confirmed: 'bookings',
  completion_rejected: 'bookings',
  payment_received: 'payments',
  payment_failed: 'payments',
  payout_processed: 'payments',
  refund_processed: 'payments',
  booking_fee_required: 'payments',
  new_message: 'messages',
};

const DEFAULTS = { bookings: true, payments: true, messages: false };

function format(notification, { firstContact }) {
  const id = notification.relatedBooking?._id || notification.relatedBooking;
  const path = id ? `/bookings/${id}` : notification.category === 'payment' ? '/dashboard' : null;
  return [
    `*${notification.title}*`,
    notification.body,
    path ? `\n${config.siteUrl}${path}` : null,
    firstContact ? '\n_Dumuwaks booking updates. Reply STOP to turn them off._' : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function shouldSend(notification, user, session) {
  const bucket = BUCKET[notification.type];
  if (!bucket) return false;
  if (session?.optedOut) return false;
  const pref = user?.notificationPreferences?.whatsapp?.[bucket];
  return pref === undefined ? DEFAULTS[bucket] : Boolean(pref);
}

/**
 * Send one notification to WhatsApp. Never throws: a WhatsApp outage must not
 * break the booking or payment flow that raised the notification.
 */
async function deliver(notification) {
  if (!config.isConfigured() || !notification || !BUCKET[notification.type]) return { sent: false, reason: 'skipped' };

  try {
    const user = await User.findById(notification.recipient).select('phoneNumber notificationPreferences').lean();
    const number = toWhatsAppNumber(user?.phoneNumber, config.defaultCountryCode);
    if (!number) return { sent: false, reason: 'no-phone' };

    const session = await WhatsAppSession.findOne({ phone: number }).select('optedOut lastOutboundAt').lean();
    if (!shouldSend(notification, user, session)) return { sent: false, reason: 'preference' };

    await evolution.sendText(number, format(notification, { firstContact: !session }));

    await Promise.all([
      WhatsAppSession.updateOne(
        { phone: number },
        { $set: { lastOutboundAt: new Date(), user: notification.recipient } },
        { upsert: true }
      ),
      Notification.updateOne(
        { _id: notification._id },
        { $set: { 'deliveryStatus.whatsapp.sent': true, 'deliveryStatus.whatsapp.sentAt': new Date() } }
      ),
    ]);
    return { sent: true };
  } catch (error) {
    logger.warn(`whatsapp: notification ${notification._id} not delivered: ${error.message}`);
    try {
      await Notification.updateOne(
        { _id: notification._id },
        { $set: { 'deliveryStatus.whatsapp.failed': true, 'deliveryStatus.whatsapp.error': error.message } }
      );
    } catch (_) {
      /* recording the failure is best-effort */
    }
    return { sent: false, reason: 'error', error: error.message };
  }
}

module.exports = { deliver, format, shouldSend, BUCKET };
