require('dotenv').config();
const { CohereClientV2 } = require('cohere-ai');
const FAQ = require('../models/FAQ');

const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY
});

/**
 * DumuBot - Intelligent AI Assistant for Dumu Waks
 * Powered by Cohere AI (Command R Plus)
 */
class DumuBot {
  constructor() {
    this.chatHistory = new Map(); // Store conversation history per user
  }

  /**
   * Main chat function using Cohere Chat API V2
   */
  async chat(message, userId, context = {}) {
    try {
      // Get or create chat history for this user
      let history = this.chatHistory.get(userId.toString()) || [];

      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(context);

      // Build messages array for Cohere V2 API
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...history,
        {
          role: 'user',
          content: message
        }
      ];

      // Call Cohere Chat API V2
      const response = await cohere.chat({
        model: process.env.COHERE_MODEL || 'command-r-plus',
        messages: messages,
        temperature: 0.7,
        maxTokens: 500
      });

      // Extract bot response
      const botMessage = response.message?.content?.[0]?.text || response.text || "I'm sorry, I couldn't generate a response.";

      // Add conversation to history
      history.push(
        { role: 'user', content: message },
        { role: 'assistant', content: botMessage }
      );

      // Keep last 10 messages to manage context window (excluding system prompt)
      if (history.length > 10) {
        history = history.slice(-10);
      }

      // Save updated history
      this.chatHistory.set(userId.toString(), history);

      return {
        success: true,
        response: botMessage,
        sources: response.documents || []
      };
    } catch (error) {
      console.error('DumuBot error:', error);
      return {
        success: false,
        response: "I'm having trouble right now. Please try again or contact dumuwaks@ementech.co.ke",
      };
    }
  }

  /**
   * Build system prompt with platform knowledge
   */
  buildSystemPrompt(context) {
    const { userName, userRole, bookings } = context;

    let prompt = `You are DumuBot, the friendly and intelligent AI assistant for Dumu Waks - Kenya's trusted maintenance and repair platform.

🇰🇪 PLATFORM OVERVIEW:
- Name: Dumuwaks (book technicians for repairs in Kenya; an Emen Tech product)
- Services: Plumbing, Electrical, Carpentry, Masonry, Painting, AC & fridges, Welding
- Payment: the customer pays the full agreed price by M-Pesa after the technician accepts; Dumuwaks holds it and releases it when the customer confirms the work (or 3 days after completion with no problem reported)
- Coverage: bookable anywhere in Kenya; availability depends on technicians registered nearby
- Language: English and Swahili

YOUR CAPABILITIES:
- Help users find technicians
- Explain how Dumu Waks works
- Assist with booking tracking
- Provide pricing information
- Answer FAQs
- Offer tips and advice
- Be friendly, helpful, and professional
- Use emojis occasionally to add warmth 🌟

FACTS YOU MAY STATE (nothing beyond these):
- Each technician is labelled "ID verified" (Dumuwaks checked their ID) or "Not yet verified". Never say all technicians are verified.
- The customer pays the price agreed with the technician; the 7.5% platform fee (+VAT) comes out of the technician's share.
- M-Pesa payment is held in escrow until the customer confirms; "Report a problem" freezes it while support reviews.
- Cancelling more than 24 h ahead is a full refund; 25% / 50% / 75% goes to the technician within 24 h / 6 h / 2 h. Technician cancels: full refund.
- Reviews can only be left after a completed booking.
- Book on WhatsApp by sending BOOK to +254 799 954 672.
Never promise response times, guarantees, refunds beyond these rules, background checks, insurance, or numbers of customers or technicians.

`;

    // Add personalized context
    if (userName) {
      prompt += `\nUSER CONTEXT:\n- Talking to: ${userName}\n- Role: ${userRole || 'customer'}`;
    }

    // Add booking context if available
    if (bookings && bookings.length > 0) {
      prompt += `\n- Recent bookings: ${bookings.map(b => `${b.serviceCategory} (${b.status})`).join(', ')}`;
    }

    prompt += `\n\nGUIDELINES:
- Be concise but helpful
- If you don't know something, be honest
- For complex issues, suggest contacting human support
- Always maintain a positive, professional tone
- If user asks about pricing, explain it depends on the job
- If asked, point out which technicians are ID verified; never claim a technician is verified unless their profile says so
- Escalate safety concerns immediately
- Support both English and basic Swahili`;

    return prompt;
  }

  /**
   * Search FAQ database for quick answers
   */
  async searchFAQ(question) {
    try {
      const keywords = question.toLowerCase().split(' ');

      const faq = await FAQ.findOne({
        $or: [
          { question: { $regex: question, $options: 'i' } },
          { keywords: { $in: keywords } },
          { category: { $regex: question, $options: 'i' } }
        ],
        isActive: true
      });

      if (faq) {
        return {
          found: true,
          answer: faq.answer,
          category: faq.category
        };
      }

      return { found: false };
    } catch (error) {
      console.error('FAQ search error:', error);
      return { found: false };
    }
  }

  /**
   * Get technician recommendations
   */
  async getTechnicianRecommendations(service, location) {
    try {
      const axios = require('axios');

      const response = await axios.post('/api/v1/matching/find', {
        serviceCategory: service,
        location: location,
        limit: 3,
        sortBy: 'rating'
      });

      if (response.data.success && response.data.data.technicians.length > 0) {
        const techs = response.data.data.technicians;
        return {
          found: true,
          technicians: techs.map(t => ({
            name: `${t.firstName} ${t.lastName}`,
            rating: t.rating?.average || 0,
            specialties: t.skills?.slice(0, 3).join(', ') || 'General',
            location: t.location?.city || 'Kenya'
          }))
        };
      }

      return { found: false };
    } catch (error) {
      console.error('Technician recommendation error:', error);
      return { found: false };
    }
  }

  /**
   * Get booking status
   */
  async getBookingStatus(bookingId, userId) {
    try {
      const axios = require('axios');
      const Booking = require('../models/Booking');

      const booking = await Booking.findOne({
        _id: bookingId,
        $or: [
          { customer: userId },
          { technician: userId }
        ]
      }).populate('technician customer').populate('serviceCategory');

      if (booking) {
        return {
          found: true,
          status: booking.status,
          serviceType: booking.serviceCategory?.name || booking.serviceType,
          scheduledDate: booking.scheduledDate,
          technician: booking.technician ? `${booking.technician.firstName} ${booking.technician.lastName}` : null
        };
      }

      return { found: false };
    } catch (error) {
      console.error('Booking status error:', error);
      return { found: false };
    }
  }

  /**
   * Clear chat history (for logout or privacy)
   */
  clearHistory(userId) {
    this.chatHistory.delete(userId.toString());
  }
}

module.exports = DumuBot;
