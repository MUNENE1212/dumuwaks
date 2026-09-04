// Identity facts derive from the vendored brand.registry.json (repo root —
// the estate-wide single source of truth, vendored from ementech-website).
// Display name keeps the public "Dumu Waks" spelling; the registry's
// canonical name is "DumuWaks" (both forms are aliased there).
import brandRegistry from '../../../brand.registry.json';

const dumuwaks = brandRegistry.brands.dumuwaks;

export const SITE_URL = dumuwaks.domain;
export const SITE_NAME = 'Dumu Waks';
export const SITE_DESCRIPTION =
  'Professional maintenance & repair services in Kenya. Find verified plumbers, electricians, carpenters & more. Book in 60 seconds, pay via M-Pesa.';
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
    description: 'Licensed electricians for wiring, installations, repairs, and electrical safety inspections.',
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
    question: 'How do I book a technician on Dumu Waks?',
    answer: "Simply describe your problem, get matched with verified technicians in under 60 seconds, see the exact pricing in KES, choose your preferred date/time, and pay the 20% booking fee via M-Pesa. Your technician will arrive at the scheduled time.",
  },
  {
    question: 'Is the booking fee refundable?',
    answer: "Yes! The 20% booking fee is fully refundable if the technician doesn't show up or if you're not satisfied with the service. Dumu Waks holds funds in escrow for your protection.",
  },
  {
    question: 'How are technicians verified on Dumu Waks?',
    answer: "All technicians undergo background checks, ID verification, and skills assessment. They're also continuously rated by customers after each job, ensuring only the best serve you.",
  },
  {
    question: 'What payment methods does Dumu Waks accept?',
    answer: "We accept M-Pesa for all payments. It's fast, secure, and the most trusted payment method in Kenya. You pay 20% upfront and 80% after satisfactory service completion.",
  },
  {
    question: "What if I'm not satisfied with the service?",
    answer: "Contact Dumu Waks support immediately. We'll mediate the dispute and can refund your payment if the issue isn't resolved. Your satisfaction is guaranteed.",
  },
  {
    question: 'How much does Dumu Waks charge?',
    answer: "Dumu Waks charges a small platform fee on completed jobs. You'll see the exact cost breakdown before booking - no hidden fees or surprises.",
  },
  {
    question: 'Can I cancel a booking on Dumu Waks?',
    answer: 'Yes, you can cancel up to 24 hours before the scheduled time for a full refund. Cancellations within 24 hours may incur a small cancellation fee.',
  },
  {
    question: 'Does Dumu Waks offer emergency services?',
    answer: 'Yes! We have technicians available 24/7 for emergency plumbing, electrical issues, and other urgent repairs across Kenya.',
  },
  {
    question: 'How do I become a technician on Dumu Waks?',
    answer: "Register as a technician, verify your skills and national ID, complete your profile with your service areas and rates, and start receiving job requests. It's free to join!",
  },
  {
    question: 'What areas does Dumu Waks serve in Kenya?',
    answer: 'Dumu Waks serves all 47 counties in Kenya, including Nairobi, Mombasa, Kisumu, Nakuru, and all major towns.',
  },
  {
    question: 'How quickly can I get a technician?',
    answer: 'Our AI-powered matching system connects you with the right technician in under 60 seconds. Many same-day bookings are completed within hours.',
  },
  {
    question: 'What types of services does Dumu Waks offer?',
    answer: 'Dumu Waks offers plumbing, electrical work, carpentry, appliance repair, painting, HVAC, masonry, roofing, and more - covering 99+ service categories.',
  },
];
