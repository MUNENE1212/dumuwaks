// Identity facts derive from the vendored brand.registry.json (repo root —
// the estate-wide single source of truth, vendored from ementech-website).
// Display name follows the domain: "Dumuwaks" (wordmark DUMUWAKS). The
// registry aliases "DumuWaks" and "Dumu Waks" to the same product.
import brandRegistry from '../../../brand.registry.json';

const dumuwaks = brandRegistry.brands.dumuwaks;

export const SITE_URL = dumuwaks.domain;
export const SITE_NAME = 'Dumuwaks';
export const SITE_DESCRIPTION =
  'Verified plumbers, electricians, carpenters and more across Kenya. Book on the web or WhatsApp; pay by M-Pesa, held until the job is done.';
export const APP_URL = dumuwaks.domain;

export const SERVICES = [
  {
    name: 'Plumbing',
    slug: 'plumbing',
    description: 'Expert plumbing repairs, installations, and emergency pipe fixes across Kenya.',
    icon: '🔧',
    keywords: ['plumber', 'plumbing', 'pipe repair', 'water heater', 'drain cleaning'],
  },
  {
    name: 'Electrical',
    slug: 'electrical',
    description: 'Electricians for wiring, installations, repairs, and electrical safety checks.',
    icon: '⚡',
    keywords: ['electrician', 'wiring', 'electrical repair', 'socket installation', 'power'],
  },
  {
    name: 'Carpentry',
    slug: 'carpentry',
    description: 'Skilled carpenters for furniture, doors, cabinets, and wood repairs.',
    icon: '🪚',
    keywords: ['carpenter', 'furniture repair', 'door fitting', 'cabinet', 'woodwork'],
  },
  {
    name: 'Appliance Repair',
    slug: 'appliance-repair',
    description: 'Professional appliance repair for fridges, washers, cookers, and electronics.',
    icon: '🔌',
    keywords: ['appliance repair', 'fridge repair', 'washing machine', 'cooker repair'],
  },
  {
    name: 'Painting',
    slug: 'painting',
    description: 'Professional interior and exterior painting services for homes and businesses.',
    icon: '🎨',
    keywords: ['painter', 'house painting', 'interior painting', 'exterior painting'],
  },
  {
    name: 'HVAC',
    slug: 'hvac',
    description: 'Air conditioning installation, repair, and maintenance services.',
    icon: '❄️',
    keywords: ['AC repair', 'air conditioning', 'HVAC', 'cooling', 'heating'],
  },
  {
    name: 'Masonry',
    slug: 'masonry',
    description: 'Brick work, concrete repairs, tiling, and construction services.',
    icon: '🧱',
    keywords: ['mason', 'tiling', 'brick work', 'concrete', 'construction'],
  },
  {
    name: 'Roofing',
    slug: 'roofing',
    description: 'Roof installation, repairs, guttering, and waterproofing services.',
    icon: '🏠',
    keywords: ['roofing', 'roof repair', 'guttering', 'waterproofing', 'leaking roof'],
  },
];

export const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
  'Thika', 'Kiambu', 'Machakos', 'Nyeri', 'Meru',
];

export const FAQS = [
  {
    question: "How do I book a technician on Dumuwaks?",
    answer: "Describe the problem and choose a technician and a time, on the web or by sending BOOK on WhatsApp to +254 799 954 672. When the technician accepts, you pay the agreed price by M-Pesa. Dumuwaks holds it, and the technician is paid only after you confirm the work is done.",
  },
  {
    question: "What happens to my money if something goes wrong?",
    answer: "Your payment is held in escrow until you confirm the job. If the technician cancels, or the job never starts within 14 days, you get it all back. If you report a problem, the money is frozen until the Dumuwaks team has spoken to you both and resolved it.",
  },
  {
    question: "How do I choose a technician?",
    answer: "Each technician has a profile with their skills, ratings from customers who booked them, finished jobs and prices. Every technician is labelled ID verified (Dumuwaks has checked their ID) or Not yet verified, so you can choose. You can also set your preferences to show only ID-verified technicians.",
  },
  {
    question: "What payment methods does Dumuwaks accept?",
    answer: "M-Pesa. You pay the full agreed price once the technician accepts. It is released to the technician when you confirm the work, or 3 days after they mark it done if you report nothing.",
  },
  {
    question: "What if I'm not satisfied with the work?",
    answer: "Tap Report a problem on the booking before confirming. The payment stays frozen while the Dumuwaks team talks to you and the technician; it can be released, refunded, or split depending on what happened.",
  },
  {
    question: "How much does Dumuwaks charge?",
    answer: "Customers pay the price agreed with the technician, nothing added. Dumuwaks takes a 7.5% platform fee (plus VAT) from the technician's payment.",
  },
  {
    question: "Can I cancel a booking?",
    answer: "Yes. More than 24 hours before the scheduled time you get everything back. Closer to the time, part goes to the technician for the slot they kept: 25% within 24 hours, 50% within 6 hours, 75% within 2 hours. If the technician cancels, you get a full refund.",
  },
  {
    question: "Can I get help urgently?",
    answer: "Mark the job urgent when you book and we look for someone available today. Whether someone can come depends on technicians near you; you'll see who accepts before you pay.",
  },
  {
    question: "How do I become a technician on Dumuwaks?",
    answer: "Register as a technician, complete your profile with your skills, service areas and rates, and add your M-Pesa or bank payout details. Joining is free; Dumuwaks takes a 7.5% fee plus VAT from completed jobs.",
  },
  {
    question: "Where does Dumuwaks work?",
    answer: "You can book anywhere in Kenya. Whether a technician is available depends on who is registered near you — you'll see who can take the job when you book.",
  },
  {
    question: "How quickly can I get a technician?",
    answer: "It depends on who is available near you and when they accept. You'll get a WhatsApp message as soon as a technician accepts your job.",
  },
  {
    question: "What services does Dumuwaks offer?",
    answer: "Plumbing, electrical work, carpentry, masonry, painting, AC and fridge repair, welding, and other repairs.",
  },
];
