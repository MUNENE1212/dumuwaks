require('dotenv').config();
const mongoose = require('mongoose');
const FAQ = require('../models/FAQ');

// Same facts as frontend/src/pages/FAQ.tsx and seo/src/lib/constants.ts — nothing the system doesn't do.
const faqs = [
  {
    question: 'How do I book a technician on Dumuwaks?',
    answer: 'Describe the problem and choose a technician and a time, on the web or by sending BOOK on WhatsApp to +254 799 954 672. When the technician accepts, you pay the agreed price by M-Pesa. Dumuwaks holds it, and the technician is paid only after you confirm the work is done.',
    category: 'booking',
    keywords: ['book', 'booking', 'how to', 'start', 'whatsapp'],
  },
  {
    question: 'What happens to my money if something goes wrong?',
    answer: 'Your payment is held in escrow until you confirm the job. If the technician cancels, or the job never starts within 14 days, you get it all back. If you report a problem, the money is frozen until the Dumuwaks team has spoken to you both and resolved it.',
    category: 'payment',
    keywords: ['refund', 'money', 'escrow', 'wrong', 'cancel', 'problem'],
  },
  {
    question: 'How do I choose a technician?',
    answer: 'Each technician has a profile with their skills, ratings from customers who booked them, finished jobs and prices. Every technician is labelled ID verified (Dumuwaks has checked their ID) or Not yet verified, so you can choose. You can also set your preferences to show only ID-verified technicians.',
    category: 'technicians',
    keywords: ['verified', 'choose', 'technician', 'id', 'profile', 'rating'],
  },
  {
    question: 'What payment methods does Dumuwaks accept?',
    answer: 'M-Pesa. You pay the full agreed price once the technician accepts. It is released to the technician when you confirm the work, or 3 days after they mark it done if you report nothing.',
    category: 'payment',
    keywords: ['payment', 'pay', 'mpesa', 'method'],
  },
  {
    question: 'What if I\'m not satisfied with the work?',
    answer: 'Tap Report a problem on the booking before confirming. The payment stays frozen while the Dumuwaks team talks to you and the technician; it can be released, refunded, or split depending on what happened.',
    category: 'support',
    keywords: ['unsatisfied', 'problem', 'issue', 'dispute', 'quality', 'report'],
  },
  {
    question: 'How much does Dumuwaks charge?',
    answer: 'Customers pay the price agreed with the technician, nothing added. Dumuwaks takes a 7.5% platform fee (plus VAT) from the technician\'s payment.',
    category: 'pricing',
    keywords: ['price', 'cost', 'fee', 'charges', 'commission'],
  },
  {
    question: 'Can I cancel a booking?',
    answer: 'Yes. More than 24 hours before the scheduled time you get everything back. Closer to the time, part goes to the technician for the slot they kept: 25% within 24 hours, 50% within 6 hours, 75% within 2 hours. If the technician cancels, you get a full refund.',
    category: 'booking',
    keywords: ['cancel', 'cancellation', 'reschedule'],
  },
  {
    question: 'Can I get help urgently?',
    answer: 'Mark the job urgent when you book and we look for someone available today. Whether someone can come depends on technicians near you; you\'ll see who accepts before you pay.',
    category: 'services',
    keywords: ['urgent', 'emergency', 'asap', 'today'],
  },
  {
    question: 'How do I become a technician on Dumuwaks?',
    answer: 'Register as a technician, complete your profile with your skills, service areas and rates, and add your M-Pesa or bank payout details. Joining is free; Dumuwaks takes a 7.5% fee plus VAT from completed jobs.',
    category: 'account',
    keywords: ['become', 'join', 'technician', 'register', 'sign up'],
  },
  {
    question: 'Where does Dumuwaks work?',
    answer: 'You can book anywhere in Kenya. Whether a technician is available depends on who is registered near you — you\'ll see who can take the job when you book.',
    category: 'general',
    keywords: ['where', 'area', 'location', 'cover', 'county'],
  },
  {
    question: 'How quickly can I get a technician?',
    answer: 'It depends on who is available near you and when they accept. You\'ll get a WhatsApp message as soon as a technician accepts your job.',
    category: 'services',
    keywords: ['how long', 'quick', 'fast', 'time', 'when'],
  },
  {
    question: 'What services does Dumuwaks offer?',
    answer: 'Plumbing, electrical work, carpentry, masonry, painting, AC and fridge repair, welding, and other repairs.',
    category: 'services',
    keywords: ['services', 'offer', 'types', 'plumbing', 'electrical'],
  },
];

async function seedFAQs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop the entire FAQ collection to remove all indexes
    await FAQ.collection.drop();
    console.log('🗑️  Dropped FAQ collection');

    // Insert new FAQs (indexes will be recreated automatically)
    const insertedFAQs = await FAQ.insertMany(faqs);
    console.log(`✅ Inserted ${insertedFAQs.length} FAQs`);

    console.log('\n📚 FAQs successfully seeded!');
    process.exit(0);
  } catch (error) {
    if (error.code === 26) {
      // Namespace not found - collection doesn't exist yet
      console.log('ℹ️  Collection does not exist yet, creating it...');
      const insertedFAQs = await FAQ.insertMany(faqs);
      console.log(`✅ Inserted ${insertedFAQs.length} FAQs`);
      console.log('\n📚 FAQs successfully seeded!');
      process.exit(0);
    } else {
      console.error('❌ Error seeding FAQs:', error);
      process.exit(1);
    }
  }
}

seedFAQs();
