/**
 * WhatsApp channel: phone parsing, webhook parsing, the bot's conversation
 * state machine, notification rules and webhook authentication.
 * Models and the Evolution client are mocked — no database or network.
 */

process.env.WHATSAPP_ENABLED = 'true';
process.env.EVOLUTION_API_URL = 'http://evolution.test';
process.env.EVOLUTION_API_KEY = 'test-key';
process.env.EVOLUTION_INSTANCE = 'dumuwaks';
process.env.WHATSAPP_WEBHOOK_SECRET = 's3cret-path-token';
process.env.SITE_URL = 'https://dumuwaks.co.ke';

jest.mock('../src/models/WhatsAppRequest', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
  newReference: jest.fn(),
}));
jest.mock('../src/models/WhatsAppSession', () => ({ findOne: jest.fn(), updateOne: jest.fn() }));
jest.mock('../src/models/Booking', () => ({ find: jest.fn() }));
jest.mock('../src/models/User', () => ({ findOne: jest.fn(), findById: jest.fn() }));
jest.mock('../src/models/Notification', () => ({ updateOne: jest.fn() }));
jest.mock('../src/services/whatsapp/evolution.client', () => ({
  sendText: jest.fn(),
  WEBHOOK_EVENTS: [],
}));
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const express = require('express');
const request = require('supertest');
const WhatsAppRequest = require('../src/models/WhatsAppRequest');
const WhatsAppSession = require('../src/models/WhatsAppSession');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');
const evolution = require('../src/services/whatsapp/evolution.client');
const { toWhatsAppNumber, fromJid, phoneVariants } = require('../src/utils/phone');
const bot = require('../src/services/whatsapp/bot.service');
const notifier = require('../src/services/whatsapp/notifier.service');

const chain = (value) => {
  const q = {
    sort: () => q,
    limit: () => q,
    populate: () => q,
    select: () => q,
    lean: () => Promise.resolve(value),
    then: (res, rej) => Promise.resolve(value).then(res, rej),
  };
  return q;
};

function fakeSession(extra = {}) {
  return {
    phone: '254712345678',
    name: 'Achieng Otieno',
    state: 'idle',
    data: {},
    mode: 'bot',
    optedOut: false,
    markModified: jest.fn(),
    ...extra,
  };
}

const say = (session, text, more = {}) => bot.respond(session, { text, location: null, hasImage: false, ...more });

beforeEach(() => {
  WhatsAppRequest.newReference.mockReturnValue('WR-260926-1234');
  WhatsAppRequest.create.mockImplementation(async (doc) => ({ _id: 'req1', createdAt: new Date(), ...doc }));
  WhatsAppRequest.find.mockReturnValue(chain([]));
  WhatsAppRequest.findOne.mockResolvedValue(null);
  WhatsAppRequest.updateOne.mockResolvedValue({});
  Booking.find.mockReturnValue(chain([]));
});

describe('phone utils', () => {
  it.each([
    ['0712 345 678', '254712345678'],
    ['+254712345678', '254712345678'],
    ['254712345678', '254712345678'],
    ['712345678', '254712345678'],
    ['0110 123 456', '254110123456'],
    ['00254712345678', '254712345678'],
  ])('normalises %s', (input, out) => expect(toWhatsAppNumber(input)).toBe(out));

  it('rejects junk', () => {
    expect(toWhatsAppNumber('')).toBeNull();
    expect(toWhatsAppNumber('12345')).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
  });

  it('reads a JID and ignores groups', () => {
    expect(fromJid('254712345678@s.whatsapp.net')).toBe('254712345678');
    expect(fromJid('254712345678:12@s.whatsapp.net')).toBe('254712345678');
    expect(fromJid('120363@g.us')).toBeNull();
  });

  it('lists every stored form of a number', () => {
    expect(phoneVariants('0712345678')).toEqual(['254712345678', '+254712345678', '0712345678']);
  });
});

describe('parseInbound', () => {
  const base = (message, key = {}) => ({
    event: 'messages.upsert',
    instance: 'dumuwaks',
    data: { key: { remoteJid: '254712345678@s.whatsapp.net', fromMe: false, id: 'M1', ...key }, pushName: 'Achieng', message },
  });

  it('reads plain and extended text', () => {
    expect(bot.parseInbound(base({ conversation: ' BOOK ' }))).toMatchObject({ phone: '254712345678', text: 'BOOK', name: 'Achieng' });
    expect(bot.parseInbound(base({ extendedTextMessage: { text: 'hello' } })).text).toBe('hello');
  });

  it('reads a location pin', () => {
    const p = bot.parseInbound(base({ locationMessage: { degreesLatitude: -1.29, degreesLongitude: 36.78, name: 'Yaya Centre' } }));
    expect(p.location).toEqual({ lat: -1.29, lng: 36.78, text: 'Yaya Centre' });
  });

  it('reads an image caption and flags the photo', () => {
    const p = bot.parseInbound(base({ imageMessage: { caption: 'burst pipe' } }));
    expect(p).toMatchObject({ text: 'burst pipe', hasImage: true });
  });

  it('resolves LID chats through remoteJidAlt', () => {
    const p = bot.parseInbound(base({ conversation: 'hi' }, { remoteJid: '9988776655@lid', remoteJidAlt: '254700000001@s.whatsapp.net' }));
    expect(p.phone).toBe('254700000001');
  });

  it('ignores our own messages, groups and other events', () => {
    expect(bot.parseInbound(base({ conversation: 'x' }, { fromMe: true }))).toBeNull();
    expect(bot.parseInbound(base({ conversation: 'x' }, { remoteJid: '1203@g.us' }))).toBeNull();
    expect(bot.parseInbound({ event: 'connection.update', data: {} })).toBeNull();
  });
});

describe('bot conversation', () => {
  it('greets with the menu', async () => {
    const reply = await say(fakeSession(), 'Hi Dumuwaks');
    expect(reply).toMatch(/Karibu Dumuwaks, Achieng/);
    expect(reply).toMatch(/\*1\* Book a technician/);
  });

  it('runs the booking flow end to end and opens a request', async () => {
    const s = fakeSession();
    expect(await say(s, '1')).toMatch(/What needs fixing/);
    expect(s.state).toBe('book:category');

    expect(await say(s, '1')).toMatch(/^Plumbing\. Describe/);
    expect(s.state).toBe('book:describe');

    expect(await say(s, 'Kitchen sink pipe burst')).toMatch(/Where is the job/);
    expect(await say(s, '', { location: { lat: -1.29, lng: 36.78, text: 'Kilimani' } })).toMatch(/When do you need/);

    const done = await say(s, '2');
    expect(done).toMatch(/Request \*WR-260926-1234\* is open/);
    expect(done).toMatch(/Where: Kilimani/);
    expect(WhatsAppRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'booking',
        phone: '254712345678',
        serviceCategory: 'plumbing',
        description: 'Kitchen sink pipe burst',
        urgency: 'high',
        location: { lat: -1.29, lng: 36.78, text: 'Kilimani' },
      })
    );
    expect(s.state).toBe('idle');
  });

  it('asks again when the category is not understood', async () => {
    const s = fakeSession({ state: 'book:category' });
    expect(await say(s, 'banana')).toMatch(/didn’t get that/);
    expect(s.state).toBe('book:category');
  });

  it('matches trade words, not substrings', () => {
    expect(bot.categoryFrom('my socket sparks').key).toBe('electrical');
    expect(bot.categoryFrom('fridge not cooling').key).toBe('hvac');
    expect(bot.categoryFrom('account problem')).toBeNull(); // "ac" must not match "account"
  });

  it('jumps ahead when the first message already names the trade', async () => {
    const s = fakeSession();
    expect(await say(s, 'my kitchen sink is leaking')).toMatch(/^Plumbing — got it/);
    expect(s.state).toBe('book:location');
    expect(s.data.description).toBe('my kitchen sink is leaking');
  });

  it('CANCEL abandons a flow', async () => {
    const s = fakeSession({ state: 'book:location', data: { category: 'plumbing' } });
    expect(await say(s, 'cancel')).toMatch(/cancelled/);
    expect(s.state).toBe('idle');
  });

  it('STOP and START toggle updates', async () => {
    const s = fakeSession();
    await say(s, 'STOP');
    expect(s.optedOut).toBe(true);
    await say(s, 'start');
    expect(s.optedOut).toBe(false);
  });

  it('hands over to a person and then stays quiet', async () => {
    const s = fakeSession();
    expect(await say(s, '3')).toMatch(/A person from the Dumuwaks team/);
    expect(s.mode).toBe('human');
    expect(await say(s, 'are you there?')).toBeNull();
    expect(WhatsAppRequest.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'human' }),
      { $push: { notes: { text: 'are you there?' } } }
    );
    expect(await say(s, 'menu')).toMatch(/Karibu/);
    expect(s.mode).toBe('bot');
  });

  it('reports status for a registered user', async () => {
    Booking.find.mockReturnValue(
      chain([
        { bookingNumber: 'BK-1001', serviceCategory: 'electrical', status: 'en_route', technician: { firstName: 'Brian', lastName: 'Mwangi' } },
      ])
    );
    const reply = await say(fakeSession({ user: 'u1' }), 'STATUS');
    expect(reply).toMatch(/\*BK-1001\* — Electrical, technician on the way · Brian M\./);
    expect(reply).toMatch(/https:\/\/dumuwaks\.co\.ke\/bookings/);
  });

  it('points an unknown number to booking', async () => {
    expect(await say(fakeSession(), '2')).toMatch(/couldn’t find a booking for this number/);
  });

  it('JOIN opens a technician request with the register link', async () => {
    const reply = await say(fakeSession(), 'join');
    expect(reply).toMatch(/register\?role=technician/);
    expect(WhatsAppRequest.create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'join' }));
  });
});

describe('handleInbound', () => {
  it('ignores a redelivered message id', async () => {
    const session = {
      ...fakeSession(),
      seen: jest.fn().mockReturnValue(true),
      remember: jest.fn(),
      save: jest.fn(),
    };
    WhatsAppSession.findOne.mockResolvedValue(session);
    const out = await bot.handleInbound({ id: 'M1', phone: '254712345678', text: 'hi' });
    expect(out).toBeNull();
    expect(evolution.sendText).not.toHaveBeenCalled();
  });

  it('links the session to a registered user and replies', async () => {
    const session = {
      ...fakeSession(),
      seen: jest.fn().mockReturnValue(false),
      remember: jest.fn(),
      save: jest.fn().mockResolvedValue(),
    };
    WhatsAppSession.findOne.mockResolvedValue(session);
    User.findOne.mockReturnValue(chain({ _id: 'u42' }));
    await bot.handleInbound({ id: 'M2', phone: '254712345678', jid: 'x@s.whatsapp.net', text: 'hi' });
    expect(session.user).toBe('u42');
    expect(session.save).toHaveBeenCalled();
    expect(evolution.sendText).toHaveBeenCalledWith('254712345678', expect.stringMatching(/Karibu/));
  });
});

describe('notifier', () => {
  const n = { _id: 'n1', type: 'booking_en_route', category: 'booking', title: 'Technician on the way', body: 'Brian is 10 minutes out.', relatedBooking: 'b1', recipient: 'u1' };

  it('formats with a deep link and a first-contact footer', () => {
    const text = notifier.format(n, { firstContact: true });
    expect(text).toMatch(/^\*Technician on the way\*/);
    expect(text).toMatch(/https:\/\/dumuwaks\.co\.ke\/bookings\/b1/);
    expect(text).toMatch(/Reply STOP/);
    expect(notifier.format(n, { firstContact: false })).not.toMatch(/Reply STOP/);
  });

  it('respects STOP, preferences and the type allowlist', () => {
    expect(notifier.shouldSend(n, {}, null)).toBe(true);
    expect(notifier.shouldSend(n, {}, { optedOut: true })).toBe(false);
    expect(notifier.shouldSend(n, { notificationPreferences: { whatsapp: { bookings: false } } }, null)).toBe(false);
    expect(notifier.shouldSend({ ...n, type: 'post_liked' }, {}, null)).toBe(false);
    expect(notifier.shouldSend({ ...n, type: 'new_message' }, {}, null)).toBe(false); // messages off by default
  });

  it('sends to the user’s normalised number', async () => {
    User.findById.mockReturnValue(chain({ phoneNumber: '0712345678' }));
    WhatsAppSession.findOne.mockReturnValue(chain(null));
    WhatsAppSession.updateOne.mockResolvedValue({});
    const out = await notifier.deliver(n);
    expect(out).toEqual({ sent: true });
    expect(evolution.sendText).toHaveBeenCalledWith('254712345678', expect.stringContaining('Technician on the way'));
  });

  it('never throws when Evolution is down', async () => {
    User.findById.mockReturnValue(chain({ phoneNumber: '0712345678' }));
    WhatsAppSession.findOne.mockReturnValue(chain(null));
    evolution.sendText.mockRejectedValue(new Error('ECONNREFUSED'));
    const out = await notifier.deliver(n);
    expect(out).toMatchObject({ sent: false, reason: 'error' });
  });
});

describe('webhook route', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/whatsapp', require('../src/routes/whatsapp.routes'));

  it('rejects a wrong secret', async () => {
    const res = await request(app).post('/api/v1/whatsapp/webhook/wrong').send({ event: 'messages.upsert' });
    expect(res.status).toBe(401);
  });

  it('acknowledges events for another instance without processing them', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/webhook/s3cret-path-token')
      .send({ event: 'messages.upsert', instance: 'someone-else', data: {} });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/other instance/);
  });

  it('accepts a valid event', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/webhook/s3cret-path-token')
      .send({ event: 'connection.update', instance: 'dumuwaks', data: { state: 'open' } });
    expect(res.status).toBe(200);
  });

  it('protects the desk endpoints', async () => {
    const res = await request(app).get('/api/v1/whatsapp/requests');
    expect(res.status).toBe(401);
  });
});
