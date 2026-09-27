/**
 * Dumuwaks WhatsApp bot.
 *
 * Inbound flow: Evolution API → POST /api/v1/whatsapp/webhook/:secret →
 * parseInbound() → handleInbound(). The bot keeps the conversation state in
 * WhatsAppSession and turns finished conversations into WhatsAppRequest rows
 * for the support desk.
 *
 * Commands (any time): MENU, CANCEL, STOP, START. Menu: 1 BOOK · 2 STATUS · 3 HELP · 4 JOIN.
 */

const config = require('../../config/whatsapp');
const WhatsAppSession = require('../../models/WhatsAppSession');
const WhatsAppRequest = require('../../models/WhatsAppRequest');
const User = require('../../models/User');
const Booking = require('../../models/Booking');
const evolution = require('./evolution.client');
const { M, CATEGORIES, WHEN } = require('./messages');
const { fromJid, phoneVariants, toWhatsAppNumber } = require('../../utils/phone');
const logger = require('../../utils/logger');

const FINAL_STATUSES = ['paid', 'cancelled', 'refunded', 'rejected'];

const STATUS_LABEL = {
  pending: 'waiting for a technician',
  matching: 'finding a technician',
  assigned: 'technician assigned, waiting for them to accept',
  accepted: 'accepted',
  en_route: 'technician on the way',
  arrived: 'technician has arrived',
  in_progress: 'work in progress',
  paused: 'work paused',
  completed: 'work done — please confirm',
  verified: 'confirmed, payment next',
  payment_pending: 'waiting for payment',
  disputed: 'under review',
};

const KEYWORDS = {
  menu: ['MENU', 'HI', 'HELLO', 'HEY', 'HABARI', 'JAMBO', 'MAMBO', 'SASA', 'NIAJE', 'HI DUMUWAKS', 'HELLO DUMUWAKS'],
  cancel: ['CANCEL', 'ACHA', 'STOP BOOKING', 'EXIT', 'QUIT'],
  stop: ['STOP', 'UNSUBSCRIBE'],
  start: ['START', 'SUBSCRIBE'],
  book: ['1', 'BOOK', 'BOOKING', 'BOOK A TECHNICIAN', 'FUNDI'],
  status: ['2', 'STATUS', 'TRACK', 'MY BOOKING', 'CHECK MY BOOKING'],
  human: ['3', 'HELP', 'AGENT', 'PERSON', 'HUMAN', 'SUPPORT', 'TALK TO A PERSON'],
  join: ['4', 'JOIN', 'TECHNICIAN', 'REGISTER', 'JOIN AS A TECHNICIAN'],
};

const norm = (text) =>
  String(text || '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const is = (text, list) => list.includes(norm(text));

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Reduce an Evolution webhook body to what the bot needs, or null when the
 * event is not a new message from a person (our own sends, groups, status).
 */
function parseInbound(body) {
  if (!body || body.event !== 'messages.upsert') return null;
  const msg = Array.isArray(body.data) ? body.data[0] : body.data;
  if (!msg || !msg.key || msg.key.fromMe) return null;

  const jid = msg.key.remoteJid || '';
  if (jid.endsWith('@g.us') || jid === 'status@broadcast' || jid.endsWith('@newsletter')) return null;

  // WhatsApp's LID addressing hides the number; Evolution passes it alongside.
  const phoneJid = jid.endsWith('@lid') ? msg.key.remoteJidAlt || msg.key.senderPn || msg.senderPn : jid;
  const phone = fromJid(phoneJid);
  if (!phone) return null;

  const m = msg.message || {};
  const text =
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listResponseMessage?.title ||
    '';

  const loc = m.locationMessage || m.liveLocationMessage;
  const location = loc
    ? {
        lat: loc.degreesLatitude,
        lng: loc.degreesLongitude,
        text: [loc.name, loc.address].filter(Boolean).join(', ') || undefined,
      }
    : null;

  return {
    id: msg.key.id,
    jid,
    phone,
    name: msg.pushName || undefined,
    text: String(text).trim(),
    location,
    hasImage: Boolean(m.imageMessage),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categoryFrom(text) {
  const n = norm(text);
  const num = parseInt(n, 10);
  if (String(num) === n && num >= 1 && num <= CATEGORIES.length) return CATEGORIES[num - 1];
  const lower = n.toLowerCase();
  return (
    CATEGORIES.find((c) => lower === c.key || lower === c.label.toLowerCase()) ||
    CATEGORIES.find(
      (c) =>
        c.key !== 'other' &&
        c.words.some((w) => lower.split(' ').some((word) => word === w || (w.length >= 4 && word.startsWith(w))))
    ) ||
    null
  );
}

function whenFrom(text) {
  const n = norm(text);
  const num = parseInt(n, 10);
  if (String(num) === n && num >= 1 && num <= WHEN.length) return WHEN[num - 1];
  if (/URGENT|NOW|SASA HIVI|EMERGENCY|HARAKA/.test(n)) return WHEN[0];
  if (/TODAY|LEO/.test(n)) return WHEN[1];
  if (/TOMORROW|KESHO|WEEK|WIKI|DAYS|SIKU/.test(n)) return WHEN[2];
  return null;
}

async function findUserByPhone(phone) {
  const variants = phoneVariants(phone, config.defaultCountryCode);
  if (!variants.length) return null;
  return User.findOne({ phoneNumber: { $in: variants } }).select('_id firstName lastName role phoneNumber');
}

async function createRequest(fields) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await WhatsAppRequest.create({ ...fields, reference: WhatsAppRequest.newReference() });
    } catch (error) {
      if (error.code !== 11000) throw error; // reference collision → try another
    }
  }
  throw new Error('Could not allocate a WhatsApp request reference');
}

function announce(request) {
  // The support desk sees it live.
  try {
    const { emitToStaff } = require('../../config/socket');
    emitToStaff('whatsapp:request', {
      _id: request._id,
      reference: request.reference,
      kind: request.kind,
      name: request.name,
      phone: request.phone,
      serviceCategory: request.serviceCategory,
      createdAt: request.createdAt,
    });
  } catch (error) {
    logger.warn(`whatsapp: staff emit failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

function reset(session) {
  session.state = 'idle';
  session.data = {};
  session.markModified('data');
}

async function handleStatus(session) {
  const openRequests = await WhatsAppRequest.find({
    phone: session.phone,
    kind: 'booking',
    status: { $in: ['open', 'in_progress'] },
  })
    .sort('-createdAt')
    .limit(3)
    .lean();
  const requestLines = openRequests.map((r) => ({
    reference: r.reference,
    label: CATEGORIES.find((c) => c.key === r.serviceCategory)?.label || 'Job',
  }));

  if (!session.user) return M.statusNoAccount(requestLines);

  const bookings = await Booking.find({
    $or: [{ customer: session.user }, { technician: session.user }],
    status: { $nin: FINAL_STATUSES },
  })
    .sort('-updatedAt')
    .limit(3)
    .populate('technician', 'firstName lastName')
    .lean();

  if (!bookings.length && !requestLines.length) return M.statusNone();

  const lines = [
    ...bookings.map((b) => {
      const category = CATEGORIES.find((c) => c.key === b.serviceCategory)?.label || 'Job';
      const tech = b.technician?.firstName ? ` · ${b.technician.firstName} ${b.technician.lastName?.[0] || ''}.` : '';
      return `• *${b.bookingNumber || 'Booking'}* — ${category}, ${STATUS_LABEL[b.status] || b.status}${tech}`;
    }),
    ...requestLines.map((r) => `• *${r.reference}* — ${r.label}, waiting for a technician`),
  ];
  return M.statusList(lines);
}

async function handleHuman(session, text) {
  let request = await WhatsAppRequest.findOne({ phone: session.phone, kind: 'human', status: { $in: ['open', 'in_progress'] } });
  if (!request) {
    request = await createRequest({
      kind: 'human',
      phone: session.phone,
      name: session.name,
      user: session.user,
      description: text && !is(text, KEYWORDS.human) ? text : undefined,
    });
    announce(request);
  }
  session.mode = 'human';
  session.humanUntil = new Date(Date.now() + config.humanHandoffMs);
  reset(session);
  return M.human(request.reference);
}

async function handleJoin(session) {
  const request = await createRequest({ kind: 'join', phone: session.phone, name: session.name, user: session.user });
  announce(request);
  reset(session);
  return M.join(request.reference);
}

async function finishBooking(session, when) {
  const d = session.data || {};
  const category = CATEGORIES.find((c) => c.key === d.category) || CATEGORIES[CATEGORIES.length - 1];
  const request = await createRequest({
    kind: 'booking',
    phone: session.phone,
    name: session.name,
    user: session.user,
    serviceCategory: category.key,
    description: d.description,
    hasPhoto: Boolean(d.hasPhoto),
    location: d.location,
    urgency: when.key,
  });
  announce(request);
  reset(session);
  return M.bookingReceived({
    reference: request.reference,
    categoryLabel: category.label,
    locationText: d.location?.text,
    hasAccount: Boolean(session.user),
  });
}

/**
 * Decide the reply for one inbound message. Mutates `session`; returns the
 * text to send, or null to stay silent.
 */
async function respond(session, inbound) {
  const { text, location, hasImage } = inbound;

  // Commands that work from anywhere
  if (is(text, KEYWORDS.stop)) {
    session.optedOut = true;
    return M.stopped();
  }
  if (is(text, KEYWORDS.start)) {
    session.optedOut = false;
    return M.started();
  }
  if (is(text, KEYWORDS.menu)) {
    session.mode = 'bot';
    session.humanUntil = undefined;
    reset(session);
    return M.menu(session.name);
  }
  if (is(text, KEYWORDS.cancel)) {
    reset(session);
    return M.cancelled();
  }

  // A person is handling this chat — stay out of the way
  if (session.mode === 'human') {
    if (session.humanUntil && session.humanUntil > new Date()) {
      if (text) {
        await WhatsAppRequest.updateOne(
          { phone: session.phone, kind: 'human', status: { $in: ['open', 'in_progress'] } },
          { $push: { notes: { text } } }
        );
      }
      return null;
    }
    session.mode = 'bot';
  }

  // Idle too long → start over
  if (session.state !== 'idle' && session.lastInboundAt && Date.now() - session.lastInboundAt.getTime() > config.sessionIdleMs) {
    reset(session);
  }

  const d = session.data || {};
  switch (session.state) {
    case 'book:category': {
      const category = categoryFrom(text);
      if (!category) return `${M.notUnderstood()}\n\n${M.askCategory()}`;
      session.data = { ...d, category: category.key };
      session.state = 'book:describe';
      session.markModified('data');
      return M.askDescription(category.label);
    }

    case 'book:describe': {
      if (!hasImage && text.length < 3) return M.askDescription(CATEGORIES.find((c) => c.key === d.category)?.label || 'Okay');
      session.data = { ...d, description: text || d.description, hasPhoto: d.hasPhoto || hasImage };
      session.state = 'book:location';
      session.markModified('data');
      return M.askLocation();
    }

    case 'book:location': {
      if (location) {
        session.data = { ...d, location };
      } else if (text.length >= 3) {
        session.data = { ...d, location: { text } };
      } else if (hasImage) {
        session.data = { ...d, hasPhoto: true };
        session.markModified('data');
        return `${M.photoNoted()} ${M.askLocation()}`;
      } else {
        return M.askLocation();
      }
      session.state = 'book:when';
      session.markModified('data');
      return M.askWhen();
    }

    case 'book:when': {
      const when = whenFrom(text);
      if (!when) return `${M.notUnderstood()}\n\n${M.askWhen()}`;
      return finishBooking(session, when);
    }

    default:
      break;
  }

  // Idle: menu choices
  if (is(text, KEYWORDS.book)) {
    session.state = 'book:category';
    session.data = {};
    session.markModified('data');
    return M.askCategory();
  }
  if (is(text, KEYWORDS.status)) return handleStatus(session);
  if (is(text, KEYWORDS.human)) return handleHuman(session, text);
  if (is(text, KEYWORDS.join)) return handleJoin(session);

  // Free text that names a trade ("my sink is leaking") → skip straight ahead
  const guessed = text.length > 8 ? categoryFrom(text) : null;
  if (guessed) {
    session.data = { category: guessed.key, description: text, hasPhoto: hasImage };
    session.state = 'book:location';
    session.markModified('data');
    return `${guessed.label} — got it.\n\n${M.askLocation()}`;
  }

  return M.menu(session.name);
}

/**
 * Handle one parsed inbound message end to end: load the session, dedupe,
 * decide the reply, persist, and send.
 */
async function handleInbound(inbound) {
  if (!inbound) return null;

  let session = await WhatsAppSession.findOne({ phone: inbound.phone });
  if (!session) session = new WhatsAppSession({ phone: inbound.phone });
  if (session.seen(inbound.id)) return null;
  session.remember(inbound.id);

  session.jid = inbound.jid;
  if (inbound.name) session.name = inbound.name;
  if (!session.user) {
    const user = await findUserByPhone(inbound.phone);
    if (user) session.user = user._id;
  }

  const reply = await respond(session, inbound);
  session.lastInboundAt = new Date();
  if (reply) session.lastOutboundAt = new Date();
  await session.save();

  if (reply) {
    await evolution.sendText(inbound.phone, reply);
  }
  return reply;
}

/** Support desk reply: sends as the Dumuwaks number and keeps the bot quiet. */
async function sendFromDesk(phone, text) {
  const number = toWhatsAppNumber(phone, config.defaultCountryCode);
  if (!number) throw new Error('Invalid phone number');
  await WhatsAppSession.updateOne(
    { phone: number },
    { $set: { mode: 'human', humanUntil: new Date(Date.now() + config.humanHandoffMs), lastOutboundAt: new Date() } },
    { upsert: true }
  );
  return evolution.sendText(number, text, { delay: 0 });
}

module.exports = {
  parseInbound,
  handleInbound,
  respond,
  sendFromDesk,
  categoryFrom,
  whenFrom,
  STATUS_LABEL,
};
