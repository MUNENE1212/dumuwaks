const Booking = require('../models/Booking');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');

/**
 * Auto-escalate completion requests that have passed the deadline
 * Run this job every hour
 */
async function autoEscalateCompletionRequests() {
  try {
    // Find bookings with pending completion requests that have passed the deadline
    const bookingsToEscalate = await Booking.find({
      'completionRequest.status': 'pending',
      'completionRequest.escalationDeadline': { $lte: new Date() },
      'completionRequest.autoEscalated': false
    })
      .populate('customer', 'firstName lastName email phoneNumber')
      .populate('technician', 'firstName lastName');

    for (const booking of bookingsToEscalate) {
      // Mark as auto-escalated
      booking.completionRequest.autoEscalated = true;
      booking.completionRequest.status = 'escalated';

      // Create a support ticket for follow-up
      const ticket = await SupportTicket.create({
        customer: booking.customer._id,
        subject: `Completion Follow-up Required - ${booking.bookingNumber}`,
        description: `Customer has not responded to completion request for booking ${booking.bookingNumber}. Technician completed work on ${booking.actualEndTime?.toLocaleString()}. Please contact customer to verify completion.`,
        category: 'booking',
        priority: 'medium',
        relatedBooking: booking._id,
        source: 'system',
        tags: ['completion-followup', 'auto-escalated']
      });

      // Initialize support follow-up
      booking.completionRequest.supportFollowUp = {
        initiated: true,
        initiatedAt: new Date(),
        contactAttempts: []
      };

      await booking.save();

      // Notify support team and send reminder to customer
      try {
        const notificationService = require('../services/notification.service');
        const { emitToUser } = require('../config/socket');

        // Notify support team
        const supportAgents = await User.find({ role: 'support' }).select('_id');
        for (const agent of supportAgents) {
          await notificationService.createNotification(agent._id, {
            type: 'system_update',
            title: 'Completion Follow-up Required',
            body: `Booking #${booking.bookingNumber} needs follow-up — customer unresponsive`,
            category: 'system',
            relatedBooking: booking._id,
            priority: 'high'
          });
          emitToUser(agent._id.toString(), 'ticket:new', { ticketId: ticket._id });
        }

        // Send reminder to customer
        const customerId = (booking.customer._id || booking.customer).toString();
        await notificationService.notifyCompletionRequested(booking, booking.technician?.firstName || 'Your technician');
        emitToUser(customerId, 'booking:completion_reminder', { bookingId: booking._id });
      } catch (notifError) {
        console.error('Escalation notification error:', notifError);
      }
    }

    return {
      success: true,
      escalatedCount: bookingsToEscalate.length
    };
  } catch (error) {
    console.error('Auto-escalation job error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send reminders to customers with pending completion requests (before escalation)
 * Run this job every 12 hours
 */
async function sendCompletionReminders() {
  try {
    // Find bookings with pending completion requests that will escalate in the next 24 hours
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const bookings = await Booking.find({
      'completionRequest.status': 'pending',
      'completionRequest.escalationDeadline': {
        $gte: now,
        $lte: next24Hours
      },
      'completionRequest.autoEscalated': false
    })
      .populate('customer', 'firstName lastName email phoneNumber')
      .populate('technician', 'firstName lastName');

    for (const booking of bookings) {
      try {
        const notificationService = require('../services/notification.service');
        const { emitToUser } = require('../config/socket');
        const customerId = (booking.customer._id || booking.customer).toString();
        const hoursLeft = Math.round((booking.completionRequest.escalationDeadline - now) / (1000 * 60 * 60));

        await notificationService.createNotification(customerId, {
          type: 'completion_requested',
          title: 'Action Required — Confirm Job Completion',
          body: `Please confirm completion of booking #${booking.bookingNumber}. ${hoursLeft} hours remaining before auto-escalation.`,
          category: 'booking',
          relatedBooking: booking._id,
          priority: 'urgent',
          actionData: { bookingId: booking._id, action: 'confirm_completion' }
        });
        emitToUser(customerId, 'booking:completion_reminder', { bookingId: booking._id, hoursLeft });

        // Attempt email reminder if email service is configured
        try {
          const emailService = require('../services/email.service');
          if (booking.customer.email) {
            await emailService.sendEmail({
              to: booking.customer.email,
              subject: `Action Required: Confirm Job Completion — ${booking.bookingNumber}`,
              text: `Hi ${booking.customer.firstName}, please confirm the completion of your booking #${booking.bookingNumber}. You have ${hoursLeft} hours remaining.`
            });
          }
        } catch (emailError) {
          console.error('Email reminder error:', emailError);
        }
      } catch (notifError) {
        console.error('Completion reminder notification error:', notifError);
      }
    }

    return {
      success: true,
      remindersSent: bookings.length
    };
  } catch (error) {
    console.error('Completion reminder job error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Auto-complete bookings where support has confirmed completion after follow-up
 * Run this job daily
 */
async function autoCompleteUnreachable() {
  try {
    // Find bookings with escalated status and multiple failed contact attempts
    const bookings = await Booking.find({
      'completionRequest.status': 'escalated',
      'completionRequest.supportFollowUp.initiated': true,
      'completionRequest.supportFollowUp.outcome': { $exists: false }
    });

    let autoCompletedCount = 0;

    for (const booking of bookings) {
      const contactAttempts = booking.completionRequest.supportFollowUp.contactAttempts || [];
      const unsuccessfulAttempts = contactAttempts.filter(a => !a.reached).length;

      // If 3+ unsuccessful attempts over 7+ days, auto-complete
      const daysSinceEscalation = Math.floor(
        (new Date() - booking.completionRequest.supportFollowUp.initiatedAt) / (1000 * 60 * 60 * 24)
      );

      if (unsuccessfulAttempts >= 3 && daysSinceEscalation >= 7) {
        booking.completionRequest.supportFollowUp.outcome = 'unreachable';
        booking.completionRequest.supportFollowUp.completedAt = new Date();
        booking.completionRequest.supportFollowUp.notes = 'Auto-completed after multiple unsuccessful contact attempts';
        booking.completionRequest.status = 'auto_approved';
        booking.status = 'verified';

        await booking.save();
        autoCompletedCount++;

        // Send final notification to customer and technician
        try {
          const notificationService = require('../services/notification.service');
          const customerId = (booking.customer?._id || booking.customer)?.toString();
          const technicianId = (booking.technician?._id || booking.technician)?.toString();

          if (customerId) {
            await notificationService.notifyStatusChange(booking, 'verified', customerId,
              `Booking #${booking.bookingNumber} has been auto-completed after follow-up period.`);
          }
          if (technicianId) {
            await notificationService.notifyStatusChange(booking, 'verified', technicianId,
              `Booking #${booking.bookingNumber} has been verified. Payment will be processed.`);
          }
        } catch (notifError) {
          console.error('Auto-complete notification error:', notifError);
        }
      }
    }

    return {
      success: true,
      autoCompletedCount
    };
  } catch (error) {
    console.error('Auto-complete job error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  autoEscalateCompletionRequests,
  sendCompletionReminders,
  autoCompleteUnreachable
};
