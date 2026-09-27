const express = require('express');
const router = express.Router();
const DumuBotController = require('../controllers/dumubot.controller');
const { protect } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Instantiate DumuBot
const DumuBot = new DumuBotController();

// Chat endpoint (public - no auth required)
router.post('/chat', async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { message } = req.body;
    const user = req.user || null; // User may be null for public requests

    // Check for FAQ match first (faster than AI)
    const faqResult = await DumuBot.searchFAQ(message);

    if (faqResult.found) {
      return res.json({
        success: true,
        response: faqResult.answer,
        source: 'faq',
        category: faqResult.category
      });
    }

    // Check for technician recommendation request
    if (message.toLowerCase().includes('find') &&
        (message.toLowerCase().includes('technician') || message.toLowerCase().includes('plumber') ||
         message.toLowerCase().includes('electrician') || message.toLowerCase().includes('carpenter'))) {

      // Extract service type from message
      const serviceMatch = message.match(/plumber|electrical|carpenter|painter|cleaner|appliance/i);
      const service = serviceMatch ? serviceMatch[0].charAt(0).toUpperCase() + serviceMatch[0].slice(1) : null;

      if (service) {
        const techResult = await DumuBot.getTechnicianRecommendations(service, user?.location?.city || 'Nairobi');

        if (techResult.found) {
          const techList = techResult.technicians.map(t =>
            `• ${t.name} (${t.specialties}) - ${t.rating}★`
          ).join('\n');

          return res.json({
            success: true,
            response: `Here are ${service}s with the highest ratings in ${user?.location?.city || 'your area'}:\n\n${techList}\n\nWould you like me to help you book one of them?`,
            source: 'technician-search',
            technicians: techResult.technicians
          });
        }
      }
    }

    // Build user context (handle both authenticated and public users)
    const context = {
      userName: user?.firstName || 'Guest',
      userRole: user?.role || 'guest',
      userId: user?._id || 'guest',
      location: user?.location || null,
      bookings: user?.role === 'customer'
        ? await require('../models/Booking').find({ customer: user._id }).limit(3).select('serviceCategory status')
        : null
    };

    // Use AI for general conversation
    const result = await DumuBot.chat(message, user?._id || 'guest', context);

    return res.json(result);

  } catch (error) {
    console.error('DumuBot chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Sorry, DumuBot is having trouble right now. Please try again or contact dumuwaks@ementech.co.ke'
    });
  }
});

// Quick action endpoints
router.post('/action/:action', protect, async (req, res) => {
  try {
    const { action } = req.params;
    const user = req.user;

    switch (action) {
      case 'find-technician':
        return res.json({
          success: true,
          response: "I'll help you find a technician! 🔧\n\nWhat service do you need? (e.g., 'I need a plumber in Nairobi')\n\nI can search for:\n• Plumbers\n• Electricians\n• Carpenters\n• Painters\n• Appliance Repair Technicians",
          source: 'action',
          action: 'technician-search'
        });

      case 'track-booking':
        const Booking = require('../models/Booking');
        const latestBooking = await Booking.findOne({
          $or: [
            { customer: user._id },
            { technician: user._id }
          ]
        }).sort({ createdAt: -1 });

        if (latestBooking) {
          const status = latestBooking.status === 'completed' ? '✅ Completed' :
                       latestBooking.status === 'pending' ? '⏳ Pending' :
                       latestBooking.status === 'confirmed' ? '✓ Confirmed' :
                       latestBooking.status === 'in-progress' ? '🔧 In Progress' : latestBooking.status;

          return res.json({
            success: true,
            response: `Your latest booking:\n\n📋 Service: ${latestBooking.serviceCategory || 'General'}\n${status}\n📅 Scheduled: ${latestBooking.scheduledDate ? new Date(latestBooking.scheduledDate).toLocaleDateString() : 'To be scheduled'}\n\nNeed more details? I can help with that!`,
          });
        } else {
          return res.json({
            success: true,
            response: "You don't have any bookings yet. Would you like me to help you find a technician and create your first booking? 🔧",
          });
        }

      case 'how-it-works':
        return res.json({
          success: true,
          response: `Here's how Dumuwaks works:\n\n1️⃣ **Describe the job**\nWhat needs fixing and where — on the web, or send BOOK on WhatsApp to +254 799 954 672.\n\n2️⃣ **Choose a technician**\nCompare ratings, finished jobs, prices, and whether their ID is verified.\n\n3️⃣ **Pay into escrow**\nWhen the technician accepts, pay the agreed price by M-Pesa. Dumuwaks holds it.\n\n4️⃣ **Confirm the work**\nThe technician is paid when you confirm — or 3 days after they mark it done if you report nothing.\n\nSomething wrong? Tap Report a problem and the payment stays frozen while we sort it out.`,
          source: 'action'
        });

      case 'pricing':
        return res.json({
          success: true,
          response: `How pricing works 💰\n\n• Technicians set their own rates; you see the price before you book\n• You pay exactly that price by M-Pesa once the technician accepts\n• Dumuwaks holds it until you confirm the work\n• Our 7.5% fee (+VAT) comes out of the technician's share, not yours\n\nThe price depends on the job — describe it and compare technicians' prices.`,
          source: 'action'
        });

      case 'get-support':
        return res.json({
          success: true,
          response: "Here's how to reach the Dumuwaks team 🆘\n\n💬 WhatsApp: send HELP to +254 799 954 672\n📱 Phone: +254 799 954 672\n📧 Email: dumuwaks@ementech.co.ke\n\nFor a problem with a job in progress, tap Report a problem on the booking — that freezes the payment until it's resolved.",
          source: 'action'
        });

      case 'become-technician':
        return res.json({
          success: true,
          response: "Good to have you 🛠️\n\n**To join:**\n1. Register as a technician\n2. Add your skills, service areas and rates\n3. Add your M-Pesa or bank payout details\n4. Optional: have Dumuwaks check your ID to show an \"ID verified\" badge\n\n**How you're paid:** the customer pays into escrow before you travel; when they confirm the work you receive the price minus the 7.5% fee and its VAT, by M-Pesa or bank.\n\nRegister at: /register?role=technician",
          source: 'action'
        });

      default:
        return res.status(400).json({
          success: false,
          message: 'Unknown action'
        });
    }
  } catch (error) {
    console.error('DumuBot action error:', error);
    res.status(500).json({
      success: false,
      message: 'Sorry, something went wrong'
    });
  }
});

// Get conversation history
router.get('/history', protect, async (req, res) => {
  const user = req.user;
  const history = DumuBot.chatHistory.get(user._id.toString()) || [];

  res.json({
    success: true,
    data: {
      messages: history,
      count: history.length
    }
  });
});

// Clear conversation history
router.delete('/history', protect, async (req, res) => {
  const user = req.user;
  DumuBot.clearHistory(user._id);

  res.json({
    success: true,
    message: 'Conversation history cleared'
  });
});

module.exports = router;
