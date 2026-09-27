/**
 * Real escrow on IntaSend — end to end against the test database with a fake
 * IntaSend that keeps a wallet balance, so every scenario can be reconciled.
 */

process.env.PAYMENTS_ENABLED = 'true';
process.env.INTASEND_ENV = 'sandbox';
process.env.INTASEND_SECRET_KEY = 'ISSecretKey_test_fake';
process.env.INTASEND_PUBLISHABLE_KEY = 'ISPubKey_test_fake';
process.env.INTASEND_ESCROW_WALLET_ID = 'ESCROW1';
process.env.INTASEND_SETTLEMENT_WALLET_ID = 'SETTLE1';
process.env.INTASEND_WEBHOOK_CHALLENGE = 'challenge-secret';
process.env.PAYOUT_APPROVAL_THRESHOLD = '50000';

jest.mock('../src/services/notification.service', () => ({ createNotification: jest.fn() }));
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const crypto = require('crypto');
const dbHandler = require('./utils/dbHandler');
const Escrow = require('../src/models/Escrow');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');
const Payout = require('../src/models/Payout');
const LedgerEntry = require('../src/models/LedgerEntry');
const PaymentEvent = require('../src/models/PaymentEvent');
const JobLock = require('../src/models/JobLock');
const notifications = require('../src/services/notification.service');
const intasend = require('../src/services/payments/intasend.client');
const engine = require('../src/services/payments/escrow.engine');
const payouts = require('../src/services/payments/payout.service');
const ledger = require('../src/services/payments/ledger.service');
const webhook = require('../src/services/payments/webhook.service');
const reconciliation = require('../src/services/payments/reconciliation.service');
const destinations = require('../src/services/payments/payoutDestination.service');
const { withLock } = require('../src/utils/jobLock');

// ---------------------------------------------------------------------------
// Fake IntaSend
// ---------------------------------------------------------------------------

function makeFakeIntaSend() {
  const s = {
    invoices: {},
    sends: {},
    wallets: { ESCROW1: 0, SETTLE1: 1000 },
    calls: [],
    payoutCharge: 10,
    failNextSend: null, // Error to throw on next send-money initiate
    n: 0,
  };
  const ok = (data) => Promise.resolve({ data });
  s.http = {
    request: ({ method, url, data }) => {
      s.calls.push({ method, url, data });
      if (url === '/api/v1/payment/mpesa-stk-push/') {
        const id = `INV${++s.n}`;
        s.invoices[id] = { invoice_id: id, state: 'PENDING', value: String(data.amount), charges: '0.00', net_amount: String(data.amount), api_ref: data.api_ref, wallet: data.wallet_id };
        return ok({ invoice: { ...s.invoices[id] } });
      }
      if (url === '/api/v1/payment/status/') return ok({ invoice: { ...s.invoices[data.invoice_id] } });
      if (url === '/api/v1/send-money/initiate/') {
        if (s.failNextSend) {
          const e = s.failNextSend;
          s.failNextSend = null;
          return Promise.reject(e);
        }
        const tx = data.transactions[0];
        const id = `TRK${++s.n}`;
        s.sends[id] = { tracking_id: id, status: 'Processing', transactions: [{ status_code: 'TP102', amount: tx.amount, account: tx.account, provider: data.provider, bank_code: tx.bank_code }] };
        return ok({ tracking_id: id, status: 'Preview and Approve' });
      }
      if (url === '/api/v1/send-money/status/') return ok(s.sends[data.tracking_id]);
      const intra = url.match(/^\/api\/v1\/wallets\/(\w+)\/intra_transfer\/$/);
      if (intra) {
        s.wallets[intra[1]] -= data.amount;
        s.wallets[data.wallet_id] += data.amount;
        return ok({ tracking_id: `INTRA${++s.n}` });
      }
      if (url === '/api/v1/wallets/ESCROW1/') return ok({ wallet_id: 'ESCROW1', available_balance: String(s.wallets.ESCROW1), current_balance: String(s.wallets.ESCROW1) });
      if (url === '/api/v1/send-money/bank-codes/ke/') return ok([{ bank_name: 'KCB', bank_code: '1' }, { bank_name: 'Equity Bank', bank_code: '68' }]);
      return Promise.reject(Object.assign(new Error(`fake: unhandled ${url}`), { response: { status: 404, data: {} } }));
    },
  };
  /** Customer entered their PIN. IntaSend credits value − charges to the escrow wallet. */
  s.pay = (invoiceId, { charges = 0 } = {}) => {
    const inv = s.invoices[invoiceId];
    inv.state = 'COMPLETE';
    inv.charges = String(charges);
    inv.net_amount = String(Number(inv.value) - charges);
    inv.mpesa_reference = `QK${invoiceId}`;
    s.wallets[inv.wallet] += Number(inv.value) - charges;
  };
  s.decline = (invoiceId) => {
    s.invoices[invoiceId].state = 'FAILED';
    s.invoices[invoiceId].failed_reason = 'Request cancelled by user';
  };
  /** M-Pesa confirmed the payout: amount + charge leave the escrow wallet. */
  s.settle = (trackingId, success = true) => {
    const send = s.sends[trackingId];
    const tx = send.transactions[0];
    send.status = 'Completed';
    send.status_code = 'BC100';
    if (success) {
      tx.status_code = 'TS100';
      tx.charge = String(s.payoutCharge);
      tx.provider_reference = `RF${trackingId}`;
      s.wallets.ESCROW1 -= Number(tx.amount) + s.payoutCharge;
    } else {
      tx.status_code = 'TF106';
      tx.status_description = 'Recipient not registered';
    }
  };
  s.lastTracking = () => Object.keys(s.sends).pop();
  s.sendCalls = () => s.calls.filter((c) => c.url === '/api/v1/send-money/initiate/');
  return s;
}

let fake;
let customer;
let technician;

async function acceptedBooking(overrides = {}) {
  return dbHandler.createTestBooking(customer._id, technician._id, { status: 'accepted', ...overrides });
}

async function givePayoutDestination(user, extra = {}) {
  await User.updateOne(
    { _id: user._id },
    { $set: { payoutDestination: { method: 'mpesa', phone: '254711222333', verifiedAt: new Date(Date.now() - 86400000 * 7), ...extra } } }
  );
}

/** Open escrow, STK push, customer pays. Returns the funded escrow. */
async function fundedEscrow(booking, { charges = 0 } = {}) {
  const escrow = await engine.openForBooking(booking._id);
  const started = await engine.startCollection({ escrowId: escrow._id, phone: '0712345678', userId: customer._id });
  fake.pay(started.invoiceId, { charges });
  await engine.confirmCollection(started.invoiceId);
  return Escrow.findById(escrow._id);
}

/** Settle every payout that is waiting on M-Pesa, repeatedly, like the poller would. */
async function settleAll(success = true) {
  for (let i = 0; i < 5; i++) {
    const inflight = await Payout.find({ status: 'processing' });
    if (!inflight.length) break;
    for (const p of inflight) {
      fake.settle(p.trackingId, success);
      await payouts.refresh(p._id);
    }
  }
}

async function heldIs(escrowId, expected) {
  const { held } = await ledger.balance(escrowId);
  expect(held).toBeCloseTo(expected, 2);
}

beforeAll(async () => {
  await dbHandler.connect();
  // Unique indexes are part of the guarantees under test
  await Promise.all([Escrow.init(), Payout.init(), LedgerEntry.init(), PaymentEvent.init(), JobLock.init()]);
});

beforeEach(async () => {
  await dbHandler.clearDatabase();
  fake = makeFakeIntaSend();
  intasend._setHttp(fake.http);
  customer = await dbHandler.createTestUser({ phoneNumber: '+254712345678' });
  technician = await dbHandler.createTestTechnician({ phoneNumber: '+254722000111' });
});

afterAll(async () => {
  await dbHandler.clearDatabase();
  await dbHandler.closeDatabase();
});

// ---------------------------------------------------------------------------

describe('collection', () => {
  it('new bookings go on the IntaSend path when payments are enabled', async () => {
    const booking = await acceptedBooking();
    expect(booking.paymentProvider).toBe('intasend');
  });

  it('holds the full price only after IntaSend itself says COMPLETE', async () => {
    const booking = await acceptedBooking();
    const escrow = await engine.openForBooking(booking._id);
    expect(escrow.totalAmount).toBe(3080);

    const started = await engine.startCollection({ escrowId: escrow._id, phone: '0712 345 678', userId: customer._id });
    const push = fake.calls.find((c) => c.url === '/api/v1/payment/mpesa-stk-push/');
    expect(push.data).toMatchObject({ amount: 3080, phone_number: '254712345678', wallet_id: 'ESCROW1', method: 'M-PESA' });

    // Webhook says complete but IntaSend still says PENDING → nothing recorded
    await webhook.handle({ invoice_id: started.invoiceId, state: 'COMPLETE', challenge: 'challenge-secret' });
    expect((await Escrow.findById(escrow._id)).status).toBe('pending');
    await heldIs(escrow._id, 0);

    fake.pay(started.invoiceId, { charges: 92.4 });
    await engine.confirmCollection(started.invoiceId);
    const funded = await Escrow.findById(escrow._id);
    expect(funded.status).toBe('funded');
    expect(funded.collections[0]).toMatchObject({ state: 'COMPLETE', value: 3080, charges: 92.4, providerRef: `QK${started.invoiceId}` });
    await heldIs(escrow._id, 3080 - 92.4);
    expect((await Booking.findById(booking._id)).payment.status).toBe('processing');
  });

  it('records a collection once even if the webhook and the poller both fire', async () => {
    const booking = await acceptedBooking();
    const escrow = await engine.openForBooking(booking._id);
    const started = await engine.startCollection({ escrowId: escrow._id, phone: '0712345678', userId: customer._id });
    fake.pay(started.invoiceId);
    await Promise.all([
      engine.confirmCollection(started.invoiceId),
      engine.confirmCollection(started.invoiceId),
      webhook.handle({ invoice_id: started.invoiceId, state: 'COMPLETE' }),
      webhook.handle({ invoice_id: started.invoiceId, state: 'COMPLETE' }),
    ]);
    expect(await LedgerEntry.countDocuments({ kind: 'collect' })).toBe(1);
    await heldIs(escrow._id, 3080);
  });

  it('refuses a second STK push while one is on the phone', async () => {
    const booking = await acceptedBooking();
    const escrow = await engine.openForBooking(booking._id);
    await engine.startCollection({ escrowId: escrow._id, phone: '0712345678', userId: customer._id });
    await expect(engine.startCollection({ escrowId: escrow._id, phone: '0712345678', userId: customer._id })).rejects.toMatchObject({ status: 409 });
  });

  it('lets the customer retry after declining the prompt', async () => {
    const booking = await acceptedBooking();
    const escrow = await engine.openForBooking(booking._id);
    const first = await engine.startCollection({ escrowId: escrow._id, phone: '0712345678', userId: customer._id });
    fake.decline(first.invoiceId);
    await engine.confirmCollection(first.invoiceId);
    const second = await engine.startCollection({ escrowId: escrow._id, phone: '0712345678', userId: customer._id });
    expect(second.invoiceId).not.toBe(first.invoiceId);
  });

  it('ignores a payment for less than was asked', async () => {
    const booking = await acceptedBooking();
    const escrow = await engine.openForBooking(booking._id);
    const started = await engine.startCollection({ escrowId: escrow._id, phone: '0712345678', userId: customer._id });
    fake.invoices[started.invoiceId].value = '100';
    fake.pay(started.invoiceId);
    fake.invoices[started.invoiceId].value = '100';
    expect(await engine.confirmCollection(started.invoiceId)).toEqual({ ignored: 'amount short' });
    expect((await Escrow.findById(escrow._id)).status).toBe('pending');
  });

  it('only the customer can pay, and only with a Safaricom number', async () => {
    const booking = await acceptedBooking();
    const escrow = await engine.openForBooking(booking._id);
    await expect(engine.startCollection({ escrowId: escrow._id, phone: '0712345678', userId: technician._id })).rejects.toMatchObject({ status: 403 });
    await expect(engine.startCollection({ escrowId: escrow._id, phone: '12345', userId: customer._id })).rejects.toThrow(/Safaricom/);
  });

  it('rejects the webhook challenge unless it matches', () => {
    expect(webhook.validChallenge('challenge-secret')).toBe(true);
    expect(webhook.validChallenge('nope')).toBe(false);
    expect(webhook.validChallenge(undefined)).toBe(false);
  });
});

describe('release', () => {
  it('pays the technician, sweeps the platform share, and reconciles to zero', async () => {
    await givePayoutDestination(technician);
    const booking = await acceptedBooking();
    const escrow = await fundedEscrow(booking, { charges: 92.4 });

    await engine.onCompletionRequested(booking._id);
    await engine.release(escrow._id, { by: customer._id });

    const techPayout = await Payout.findOne({ kind: 'technician' });
    // 3080 − 7.5% fee (231) − 16% VAT on it (36.96)
    expect(techPayout.amount).toBeCloseTo(2812.04, 2);
    expect(techPayout.status).toBe('processing');
    expect(fake.sendCalls()[0].data).toMatchObject({ provider: 'MPESA-B2C', wallet_id: 'ESCROW1', requires_approval: 'NO' });
    expect(fake.sendCalls()[0].data.transactions[0]).toMatchObject({ account: '254711222333', amount: 2812.04 });
    expect((await Escrow.findById(escrow._id)).status).toBe('release_pending');

    await settleAll();

    const sweep = await Payout.findOne({ kind: 'platform_share' });
    // what is left after collection charge (92.4) and payout charge (10) — absorbed by the platform
    expect(sweep.amount).toBeCloseTo(3080 - 92.4 - 2812.04 - 10, 2);
    expect(sweep.status).toBe('succeeded');
    const closed = await Escrow.findById(escrow._id);
    expect(closed.status).toBe('released');
    await heldIs(escrow._id, 0);
    const b = await Booking.findById(booking._id);
    expect(b.status).toBe('paid');
    expect(b.payment.status).toBe('completed');

    const run = await reconciliation.run();
    expect(run.ok).toBe(true);
    expect(run.drift).toBeCloseTo(0, 2);
    expect(fake.wallets.SETTLE1).toBeCloseTo(1000 + sweep.amount, 2);
  });

  it('is idempotent: releasing twice sends one payout', async () => {
    await givePayoutDestination(technician);
    const escrow = await fundedEscrow(await acceptedBooking());
    await engine.release(escrow._id, { by: customer._id });
    await engine.release(escrow._id, { by: customer._id });
    expect(fake.sendCalls()).toHaveLength(1);
  });

  it('holds the payout for review when the technician has no payout details', async () => {
    const escrow = await fundedEscrow(await acceptedBooking());
    await engine.release(escrow._id, { by: customer._id });
    const p = await Payout.findOne({ kind: 'technician' });
    expect(p.status).toBe('needs_review');
    expect(p.reviewReason).toMatch(/No payout destination/);
    expect(fake.sendCalls()).toHaveLength(0);
    expect(notifications.createNotification).toHaveBeenCalledWith(
      technician._id,
      expect.objectContaining({ title: 'Add your payout details' })
    );
  });

  it('holds payouts above the approval threshold until an admin approves', async () => {
    await givePayoutDestination(technician);
    const admin = await dbHandler.createTestAdmin();
    const escrow = await fundedEscrow(await acceptedBooking({ pricing: { totalAmount: 100000, currency: 'KES' } }));
    await engine.release(escrow._id, { by: customer._id });
    let p = await Payout.findOne({ kind: 'technician' });
    expect(p.status).toBe('needs_review');
    expect(fake.sendCalls()).toHaveLength(0);

    p = await payouts.approve(p._id, admin._id);
    expect(p.status).toBe('processing');
    expect(fake.sendCalls()).toHaveLength(1);
  });

  it('holds payouts to details changed in the last 24 hours', async () => {
    await givePayoutDestination(technician, { changedAt: new Date() });
    const escrow = await fundedEscrow(await acceptedBooking());
    await engine.release(escrow._id, { by: customer._id });
    const p = await Payout.findOne({ kind: 'technician' });
    expect(p.status).toBe('needs_review');
    expect(p.reviewReason).toMatch(/24 hours/);
  });

  it('never re-sends a payout whose outcome was lost to a timeout', async () => {
    await givePayoutDestination(technician);
    const escrow = await fundedEscrow(await acceptedBooking());
    fake.failNextSend = Object.assign(new Error('timeout of 30000ms exceeded'), { code: 'ECONNABORTED' });
    await engine.release(escrow._id, { by: customer._id });
    const p = await Payout.findOne({ kind: 'technician' });
    expect(p.status).toBe('needs_review');
    expect(p.reviewReason).toMatch(/Outcome unknown/);

    await payouts.processPayout(p._id); // poller / retry path
    await engine.onPayoutSettled(escrow._id);
    expect(fake.sendCalls()).toHaveLength(1);
    await heldIs(escrow._id, 3080); // nothing recorded as paid
  });

  it('a failed payout goes to review and can be retried by an admin', async () => {
    await givePayoutDestination(technician);
    const admin = await dbHandler.createTestAdmin();
    const escrow = await fundedEscrow(await acceptedBooking());
    await engine.release(escrow._id, { by: customer._id });
    await settleAll(false);
    let p = await Payout.findOne({ kind: 'technician' });
    expect(p.status).toBe('needs_review');
    expect(p.failureReason).toMatch(/not registered/);

    p = await payouts.approve(p._id, admin._id);
    expect(p.status).toBe('processing');
    expect(fake.sendCalls()[1].data.transactions[0].idempotency_key).toMatch(/:a2$/);
    await settleAll();
    expect((await Escrow.findById(escrow._id)).status).toBe('released');
  });

  it('pays bank destinations through PesaLink with the bank code', async () => {
    await User.updateOne(
      { _id: technician._id },
      { $set: { payoutDestination: { method: 'bank', bankCode: '68', bankName: 'Equity Bank', accountNumber: '0123456789', accountName: 'Brian Mwangi', verifiedAt: new Date(0) } } }
    );
    const escrow = await fundedEscrow(await acceptedBooking());
    await engine.release(escrow._id, { by: customer._id });
    expect(fake.sendCalls()[0].data).toMatchObject({ provider: 'PESALINK' });
    expect(fake.sendCalls()[0].data.transactions[0]).toMatchObject({ account: '0123456789', bank_code: '68', name: 'Brian Mwangi' });
  });
});

describe('refunds, cancellations and disputes', () => {
  it('a technician cancelling refunds the customer in full; the platform covers the charges', async () => {
    const booking = await acceptedBooking();
    const escrow = await fundedEscrow(booking, { charges: 92.4 });
    await engine.cancel(booking._id, { cancelledBy: 'technician', by: technician._id, reason: 'Sick' });

    const refund = await Payout.findOne({ kind: 'refund' });
    expect(refund.amount).toBe(3080);
    expect(refund.destination.phone).toBe('254712345678');
    await settleAll();

    // 3080 in, 92.4 charge + 3080 refund + 10 payout charge out → platform tops up 102.4
    const topup = await Payout.findOne({ kind: 'platform_topup' });
    expect(topup.amount).toBeCloseTo(102.4, 2);
    expect((await Escrow.findById(escrow._id)).status).toBe('refunded');
    await heldIs(escrow._id, 0);
    expect((await reconciliation.run()).ok).toBe(true);
  });

  it('a customer cancelling under 2 hours before pays the 75% tier to the technician', async () => {
    await givePayoutDestination(technician);
    const booking = await acceptedBooking({ timeSlot: { date: new Date(Date.now() + 60 * 60 * 1000), startTime: '09:00', endTime: '11:00' } });
    const escrow = await fundedEscrow(booking);
    await engine.cancel(booking._id, { cancelledBy: 'customer', by: customer._id });

    expect((await Payout.findOne({ kind: 'refund' })).amount).toBe(770);
    // 2310 gross − 7.5% (173.25) − VAT (27.72)
    expect((await Payout.findOne({ kind: 'technician' })).amount).toBeCloseTo(2109.03, 2);
    await settleAll();
    expect((await Escrow.findById(escrow._id)).status).toBe('partially_refunded');
    await heldIs(escrow._id, 0);
  });

  it('cancelling before payment just closes the escrow', async () => {
    const booking = await acceptedBooking();
    await engine.openForBooking(booking._id);
    const res = await engine.cancel(booking._id, { cancelledBy: 'customer', by: customer._id });
    expect(res.status).toBe('cancelled');
    expect(await Payout.countDocuments()).toBe(0);
  });

  it('a dispute freezes release; a 60/40 split pays both sides', async () => {
    await givePayoutDestination(technician);
    const admin = await dbHandler.createTestAdmin();
    const escrow = await fundedEscrow(await acceptedBooking());
    await engine.openDispute(escrow._id, { by: customer._id, reason: 'Leak is back' });
    await expect(engine.release(escrow._id, { by: customer._id })).rejects.toThrow(/disputed/);

    await engine.resolveDispute(escrow._id, { resolution: 'split', technicianShare: 0.6, by: admin._id });
    expect((await Payout.findOne({ kind: 'refund' })).amount).toBe(1232);
    expect((await Payout.findOne({ kind: 'technician' })).amount).toBeCloseTo(calcNet(1848), 2);
    await settleAll();
    expect((await Escrow.findById(escrow._id)).status).toBe('partially_refunded');
    await heldIs(escrow._id, 0);
  });

  it('refunds can never exceed what was collected', async () => {
    const escrow = await fundedEscrow(await acceptedBooking());
    await expect(engine.refund(escrow._id, { refundAmount: 3000, technicianGross: 500 })).rejects.toThrow(/exceeds/);
  });
});

function calcNet(gross) {
  return require('../src/config/fees').calculatePlatformFee(gross).technicianPayout;
}

describe('top-ups and automatic actions', () => {
  it('an approved extra cost is collected into the same escrow and raises the payout', async () => {
    await givePayoutDestination(technician);
    const booking = await acceptedBooking();
    const escrow = await fundedEscrow(booking);
    await engine.proposeTopup(escrow._id, { technicianId: technician._id, amount: 500, reason: 'Extra pipe fitting' });
    const topupId = (await Escrow.findById(escrow._id)).topups[0]._id;
    await engine.decideTopup(escrow._id, topupId, { customerId: customer._id, approve: true });
    const started = await engine.startCollection({ escrowId: escrow._id, phone: '0712345678', userId: customer._id, topupId });
    fake.pay(started.invoiceId);
    await engine.confirmCollection(started.invoiceId);

    const e = await Escrow.findById(escrow._id);
    expect(e.totalAmount).toBe(3580);
    expect(e.topups[0].status).toBe('paid');
    expect((await Booking.findById(booking._id)).pricing.totalAmount).toBe(3580);
    await heldIs(escrow._id, 3580);

    await engine.release(escrow._id, { by: customer._id });
    expect((await Payout.findOne({ kind: 'technician' })).amount).toBeCloseTo(calcNet(3580), 2);
  });

  it('auto-releases 3 days after completion with no response', async () => {
    await givePayoutDestination(technician);
    const booking = await acceptedBooking();
    const escrow = await fundedEscrow(booking);
    await Booking.updateOne({ _id: booking._id }, { $set: { status: 'completed' } });
    await Escrow.updateOne({ _id: escrow._id }, { $set: { completionRequestedAt: new Date(Date.now() - 4 * 86400000), expiresAt: new Date(Date.now() - 86400000) } });
    const res = await engine.runAutoActions();
    expect(res.released).toBe(1);
    expect((await Escrow.findById(escrow._id)).status).toBe('release_pending');
  });

  it('auto-refunds a job that was paid but never started', async () => {
    const booking = await acceptedBooking();
    const escrow = await fundedEscrow(booking);
    await Escrow.updateOne({ _id: escrow._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await engine.runAutoActions();
    expect(res.refunded).toBe(1);
    expect((await Payout.findOne({ kind: 'refund' })).amount).toBe(3080);
  });

  it('does not auto-refund a job that has started', async () => {
    const booking = await acceptedBooking();
    const escrow = await fundedEscrow(booking);
    await Booking.updateOne({ _id: booking._id }, { $set: { status: 'in_progress' } });
    await Escrow.updateOne({ _id: escrow._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await engine.runAutoActions()).refunded).toBe(0);
  });
});

describe('payout details', () => {
  it('saves new details only after the code sent to the receiving number', async () => {
    jest.spyOn(crypto, 'randomInt').mockReturnValue(482913);
    const res = await destinations.requestChange(technician._id, { method: 'mpesa', phone: '0733 444 555' });
    expect(res.sentTo).toMatch(/^\+254733\*\*\*555$/);
    await expect(destinations.verify(technician._id, '000000')).rejects.toThrow(/not right/);
    const saved = await destinations.verify(technician._id, '482913');
    expect(saved.current).toMatchObject({ method: 'mpesa', changedAt: undefined });
    const u = await User.findById(technician._id);
    expect(u.payoutDestination.phone).toBe('254733444555');
    expect(u.payoutDestination.changedAt).toBeUndefined(); // first setup is not held
  });

  it('a change of existing details starts the 24-hour hold', async () => {
    await givePayoutDestination(technician);
    jest.spyOn(crypto, 'randomInt').mockReturnValue(111222);
    await destinations.requestChange(technician._id, { method: 'bank', bankCode: '68', accountNumber: '0123 456 789', accountName: 'Brian Mwangi' });
    await destinations.verify(technician._id, '111222');
    const u = await User.findById(technician._id);
    expect(u.payoutDestination).toMatchObject({ method: 'bank', bankName: 'Equity Bank', accountNumber: '0123456789' });
    expect(u.payoutDestination.changedAt).toBeInstanceOf(Date);
  });

  it('locks after five wrong codes and rejects unknown banks and customers', async () => {
    jest.spyOn(crypto, 'randomInt').mockReturnValue(123456);
    await destinations.requestChange(technician._id, { method: 'mpesa', phone: '0733444555' });
    for (let i = 0; i < 5; i++) await expect(destinations.verify(technician._id, '999999')).rejects.toThrow();
    await expect(destinations.verify(technician._id, '123456')).rejects.toThrow(/Too many/);
    await expect(destinations.requestChange(technician._id, { method: 'bank', bankCode: '999', accountNumber: '123456', accountName: 'X Y Z' })).rejects.toThrow(/bank/);
    await expect(destinations.requestChange(customer._id, { method: 'mpesa', phone: '0733444555' })).rejects.toMatchObject({ status: 403 });
  });
});

describe('safety rails', () => {
  it('the ledger cannot be edited or deleted', async () => {
    const escrow = await fundedEscrow(await acceptedBooking());
    await expect(LedgerEntry.updateOne({ escrow: escrow._id }, { amount: 1 })).rejects.toThrow(/append-only/);
    await expect(LedgerEntry.deleteMany({})).rejects.toThrow(/append-only/);
  });

  it('a job lock lets only one worker run', async () => {
    let runs = 0;
    const job = () => withLock('test.job', 60000, async () => {
      runs++;
      await new Promise((r) => setTimeout(r, 50));
    });
    await Promise.all([job(), job(), job()]);
    expect(runs).toBe(1);
  });

  it('reconciliation flags drift when the wallet and ledger disagree', async () => {
    const escrow = await fundedEscrow(await acceptedBooking());
    fake.wallets.ESCROW1 -= 500; // money left the wallet without a ledger entry
    const run = await reconciliation.run();
    expect(run.ok).toBe(false);
    expect(run.drift).toBe(-500);
    expect(run.ledgerHeld).toBe(3080);
    await heldIs(escrow._id, 3080);
  });

  it('refuses sandbox keys in production', () => {
    const cfg = require('../src/config/payments');
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => cfg.assertSafe()).toThrow(/production must use INTASEND_ENV=live/);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

describe('HTTP', () => {
  const express = require('express');
  const request = require('supertest');
  const app = express();
  app.use(express.json());
  app.use('/api/v1/payments', require('../src/routes/payments.routes'));
  app.use('/api/v1/bookings', require('../src/routes/booking.routes'));
  const auth = (u) => ({ Authorization: `Bearer ${dbHandler.generateTestToken(u._id)}` });

  it('rejects webhooks without the dashboard challenge', async () => {
    const res = await request(app).post('/api/v1/payments/intasend/webhook').send({ invoice_id: 'X', state: 'COMPLETE', challenge: 'guess' });
    expect(res.status).toBe(401);
  });

  it('shows an unpaid booking as due, and only the customer can pay', async () => {
    const booking = await acceptedBooking();
    const view = await request(app).get(`/api/v1/payments/bookings/${booking._id}/escrow`).set(auth(customer));
    expect(view.body.data).toMatchObject({ status: 'unpaid', amountDue: 3080, canPay: true });

    const tech = await request(app).post(`/api/v1/payments/bookings/${booking._id}/escrow/pay`).set(auth(technician)).send({ phone: '0712345678' });
    expect(tech.status).toBe(403);

    const pay = await request(app).post(`/api/v1/payments/bookings/${booking._id}/escrow/pay`).set(auth(customer)).send({ phone: '0712345678' });
    expect(pay.status).toBe(202);
    expect(pay.body.message).toMatch(/M-Pesa PIN/);
  });

  it('the technician cannot start travel until the money is held', async () => {
    const booking = await acceptedBooking();
    const blocked = await request(app).post(`/api/v1/bookings/${booking._id}/status/en-route`).set(auth(technician)).send({});
    expect(blocked.status).toBe(402);

    await fundedEscrow(booking);
    const ok = await request(app).post(`/api/v1/bookings/${booking._id}/status/en-route`).set(auth(technician)).send({});
    expect(ok.status).toBe(200);
  });

  it('finance endpoints are staff-only', async () => {
    const res = await request(app).get('/api/v1/payments/admin/overview').set(auth(customer));
    expect(res.status).toBe(403);
  });
});
