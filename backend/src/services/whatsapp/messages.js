/**
 * Everything the WhatsApp bot says, in one place.
 *
 * Voice (Emen order): plain and specific. Say what happens next and when.
 * No promises without a number, no exclamation marks, Kiswahili greeting.
 * WhatsApp formatting: *bold*, _italic_.
 */

const config = require('../../config/whatsapp');

const CATEGORIES = [
  { key: 'plumbing', label: 'Plumbing', words: ['plumb', 'pipe', 'water', 'leak', 'bomba', 'maji', 'toilet', 'sink', 'tap'] },
  { key: 'electrical', label: 'Electrical', words: ['electric', 'power', 'socket', 'wiring', 'umeme', 'stima', 'light', 'bulb'] },
  { key: 'carpentry', label: 'Carpentry', words: ['carpent', 'wood', 'door', 'furniture', 'seremala', 'cabinet', 'bed'] },
  { key: 'masonry', label: 'Masonry', words: ['mason', 'wall', 'tiles', 'tile', 'concrete', 'mwashi', 'plaster'] },
  { key: 'painting', label: 'Painting', words: ['paint', 'rangi'] },
  { key: 'hvac', label: 'AC & fridges', words: ['ac', 'aircon', 'fridge', 'friji', 'freezer', 'hvac', 'cooling'] },
  { key: 'welding', label: 'Welding', words: ['weld', 'gate', 'grill', 'metal', 'chomelea'] },
  { key: 'other', label: 'Something else', words: ['other', 'nyingine'] },
];

const WHEN = [
  { key: 'emergency', label: 'Now — it’s urgent' },
  { key: 'high', label: 'Today' },
  { key: 'medium', label: 'In the next few days' },
];

const link = (path) => `${config.siteUrl}${path}`;

const numbered = (items) => items.map((it, i) => `*${i + 1}* ${it.label}`).join('\n');

const M = {
  menu: (name) =>
    [
      `Karibu Dumuwaks${name ? `, ${name.split(' ')[0]}` : ''}.`,
      'Reply with a number:',
      '',
      '*1* Book a technician',
      '*2* Check my booking',
      '*3* Talk to a person',
      '*4* Join as a technician',
    ].join('\n'),

  askCategory: () => ['What needs fixing? Reply with a number.', '', numbered(CATEGORIES)].join('\n'),

  askDescription: (categoryLabel) =>
    `${categoryLabel}. Describe the problem in one message — what broke and where. You can send a photo with a caption.`,

  askLocation: () =>
    'Where is the job? Send your location pin (📎 → Location) or type the estate and town, e.g. _Kilimani, Nairobi_.',

  askWhen: () => ['When do you need someone?', '', numbered(WHEN)].join('\n'),

  bookingReceived: ({ reference, categoryLabel, locationText, hasAccount }) =>
    [
      `Request *${reference}* is open.`,
      '',
      `Job: ${categoryLabel}`,
      locationText ? `Where: ${locationText}` : null,
      '',
      'A Dumuwaks coordinator will match you with a technician and message you in this chat with their name, price and whether their ID is verified, before anyone comes.',
      '',
      hasAccount
        ? `You can also track it online: ${link('/bookings')}`
        : `Payment is by M-Pesa and is held until you confirm the job is done.`,
    ]
      .filter((l) => l !== null)
      .join('\n'),

  notUnderstood: () => 'Sorry, I didn’t get that. Reply with one of the numbers above, or send *MENU* to start again.',

  cancelled: () => 'Okay, cancelled. Send *MENU* whenever you need us.',

  statusNoAccount: (openRequests) =>
    openRequests.length
      ? ['Your open requests:', '', ...openRequests.map((r) => `• *${r.reference}* — ${r.label}, waiting for a technician`)].join(
          '\n'
        )
      : `We couldn’t find a booking for this number. Reply *1* to book, or sign in at ${link('/login')} if you registered with another number.`,

  statusList: (lines) => ['Your current bookings:', '', ...lines, '', `Details: ${link('/bookings')}`].join('\n'),

  statusNone: () => `You have no active bookings. Reply *1* to book a technician.`,

  human: (reference) =>
    `A person from the Dumuwaks team will reply in this chat. Your reference is *${reference}*. Send *MENU* to go back to the menu.`,

  join: (reference) =>
    [
      'Good to hear from you. To take jobs on Dumuwaks:',
      '',
      `1. Register as a technician: ${link('/register?role=technician')}`,
      '2. Complete your profile and ID verification.',
      '3. Set your prices and areas.',
      '',
      `Job offers then arrive in this chat. Reference: *${reference}*.`,
    ].join('\n'),

  stopped: () => 'You won’t get booking updates on WhatsApp any more. Send *START* to turn them back on.',
  started: () => 'Booking updates are back on. Send *MENU* to see what I can do.',

  photoNoted: () => 'Photo received.',
};

module.exports = { M, CATEGORIES, WHEN, link };
