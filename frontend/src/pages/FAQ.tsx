import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Keep in step with seo/src/lib/constants.ts FAQS — facts only, each backed by the code
  const faqs = [
    {
      question: 'How do I book a technician on Dumuwaks?',
      answer: 'Describe the problem and choose a technician and a time, on the web or by sending BOOK on WhatsApp to +254 799 954 672. When the technician accepts, you pay the agreed price by M-Pesa. Dumuwaks holds it, and the technician is paid only after you confirm the work is done.',
    },
    {
      question: 'What happens to my money if something goes wrong?',
      answer: 'Your payment is held in escrow until you confirm the job. If the technician cancels, or the job never starts within 14 days, you get it all back. If you report a problem, the money is frozen until the Dumuwaks team has spoken to you both and resolved it.',
    },
    {
      question: 'How do I choose a technician?',
      answer: 'Each technician has a profile with their skills, ratings from customers who booked them, finished jobs and prices. Every technician is labelled ID verified (Dumuwaks has checked their ID) or Not yet verified, so you can choose. You can also set your preferences to show only ID-verified technicians.',
    },
    {
      question: 'What payment methods does Dumuwaks accept?',
      answer: 'M-Pesa. You pay the full agreed price once the technician accepts. It is released to the technician when you confirm the work, or 3 days after they mark it done if you report nothing.',
    },
    {
      question: 'What if I\'m not satisfied with the work?',
      answer: 'Tap Report a problem on the booking before confirming. The payment stays frozen while the Dumuwaks team talks to you and the technician; it can be released, refunded, or split depending on what happened.',
    },
    {
      question: 'How much does Dumuwaks charge?',
      answer: 'Customers pay the price agreed with the technician, nothing added. Dumuwaks takes a 7.5% platform fee (plus VAT) from the technician\'s payment.',
    },
    {
      question: 'Can I cancel a booking?',
      answer: 'Yes. More than 24 hours before the scheduled time you get everything back. Closer to the time, part goes to the technician for the slot they kept: 25% within 24 hours, 50% within 6 hours, 75% within 2 hours. If the technician cancels, you get a full refund.',
    },
    {
      question: 'Can I get help urgently?',
      answer: 'Mark the job urgent when you book and we look for someone available today. Whether someone can come depends on technicians near you; you\'ll see who accepts before you pay.',
    },
    {
      question: 'How do I become a technician on Dumuwaks?',
      answer: 'Register as a technician, complete your profile with your skills, service areas and rates, and add your M-Pesa or bank payout details. Joining is free; Dumuwaks takes a 7.5% fee plus VAT from completed jobs.',
    },
    {
      question: 'Where does Dumuwaks work?',
      answer: 'You can book anywhere in Kenya. Whether a technician is available depends on who is registered near you — you\'ll see who can take the job when you book.',
    },
    {
      question: 'How quickly can I get a technician?',
      answer: 'It depends on who is available near you and when they accept. You\'ll get a WhatsApp message as soon as a technician accepts your job.',
    },
    {
      question: 'What services does Dumuwaks offer?',
      answer: 'Plumbing, electrical work, carpentry, masonry, painting, AC and fridge repair, welding, and other repairs.',
    },
  ];

  return (
    <div className="min-h-screen bg-surface-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-primary-900/30 p-4 rounded-full">
              <HelpCircle className="h-12 w-12 text-primary-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-ink mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-ink-muted">
            Find answers to common questions about Dumuwaks
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-surface-300 transition-colors"
              >
                <h3 className="text-lg font-semibold text-ink pr-4">
                  {faq.question}
                </h3>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-primary-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-ink-muted flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-ink-muted">
                    {faq.answer}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Still Have Questions */}
        <Card className="mt-12 p-8 bg-surface-200 text-center">
          <h2 className="text-2xl font-bold text-ink mb-4">
            Still have questions?
          </h2>
          <p className="text-ink-muted mb-6">
            We're here to help! Contact our support team anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/support"
              className="bg-primary-600 text-on-lumen px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Contact Support
            </a>
            <a
              href="/whatsapp-support"
              className="bg-green-600 text-on-lumen px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              WhatsApp Us
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
