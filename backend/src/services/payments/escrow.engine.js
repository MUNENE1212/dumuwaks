/**
 * Escrow engine — real money on IntaSend.
 *
 *   customer STK push ──▶ ESCROW wallet ──▶ technician (B2C / PesaLink)
 *                                      ├──▶ platform share (SETTLEMENT wallet)
 *                                      └──▶ refund to the paying number
 *
 * Every step is idempotent: status changes are compare-and-set on the escrow
 * document, money facts go to the append-only ledger with unique keys, and
 * payouts are created once per key. IntaSend webhooks are only a trigger — the
 * state is always re-read from IntaSend before anything is recorded.
 */

const config = require('../../config/payments');
const Escrow = require('../../models/Escrow');
const Booking = require('../../models/Booking');
const User = require('../../models/User');
const Payout = require('../../models/Payout');
const intasend = require('./intasend.client');
const ledger = require('./ledger.service');
const payouts = require('./payout.service');
const feeConfig = require('../../config/fees');
const { calculatePlatformFee, calculateCancellationFee, getAutoReleaseDate, getAutoRefundDate } = feeConfig;
const { toWhatsAppNumber } = require('../../utils/phone');
const logger = require('../../utils/logger');

const round = ledger.round;
const ACTIVE_COLLECTION = ['REQUESTING', 'PENDING', 'PROCESSING'];
const COLLECTION_LOCK_MS = 3 * 60 * 1000;

class EscrowError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// side effects (never fail the money path)
// ---------------------------------------------------------------------------

function emit(userIds, event, data) {
  try {
    const { emitToUser } = require('../../config/socket');
    userIds.filter(Boolean).forEach((id) => emitToUser(String(id), event, data));
  } catch (_) {
    /* socket not initialised */
  }
}

async function notify(recipient, fields) {
  try {
    await require('../notification.service').createNotification(recipient, fields);
  } catch (error) {
    logger.warn(`payments: notification failed: ${error.message}`);
  }
}

const kes = (n) => `KES ${Number(n).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function fees(total) {
  return calculatePlatformFee(round(total));
}

function collectedTotal(escrow) {
  return round(escrow.collections.filter((c) => c.state === 'COMPLETE').reduce((s, c) => s + (c.value ?? c.amount), 0));
}

function payerPhone(escrow) {
  const paid = escrow.collections.find((c) => c.state === 'COMPLETE' && c.phone);
  return paid?.phone || null;
}

async function loadIntaSendEscrow(escrowId) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new EscrowError('Escrow not found', 404);
  if (escrow.provider !== 'intasend') throw new EscrowError('This booking uses the legacy payment path');
  return escrow;
}

/** Compare-and-set the escrow status; returns the updated doc or null if someone else moved it. */
function transition(escrowId, from, to, set = {}, history) {
  const update = { $set: { status: to, ...set } };
  if (history) update.$push = { history: { ...history, fromStatus: Array.isArray(from) ? undefined : from, toStatus: to, timestamp: new Date() } };
  return Escrow.findOneAndUpdate({ _id: escrowId, status: { $in: [].concat(from) } }, update, { new: true });
}

async function technicianDestination(technicianId) {
  const tech = await User.findById(technicianId).select('firstName lastName payoutDestination');
  const d = tech?.payoutDestination;
  const name = d?.accountName || [tech?.firstName, tech?.lastName].filter(Boolean).join(' ') || 'Technician';
  if (!d?.method || !d.verifiedAt) return { name, destination: null, changedAt: null };
  return {
    name,
    changedAt: d.changedAt,
    destination:
      d.method === 'bank'
        ? { method: 'bank', bankCode: d.bankCode, bankName: d.bankName, accountNumber: d.accountNumber, accountName: d.accountName }
        : { method: 'mpesa', phone: d.phone },
  };
}

async function queueTechnicianPayout(escrow, amount, key, narrative) {
  const { name, destination, changedAt } = await technicianDestination(escrow.technician);
  const payout = await payouts.create({
    escrow: escrow._id,
    booking: escrow.booking,
    kind: 'technician',
    recipient: escrow.technician,
    name,
    narrative,
    destination: destination || undefined,
    destinationChangedAt: changedAt || undefined,
    amount: round(amount),
    idempotencyKey: key,
  });
  if (!destination) {
    await notify(escrow.technician, {
      type: 'payout_processed',
      category: 'payment',
      title: 'Add your payout details',
      body: `${kes(amount)} is ready for you. Add your M-Pesa or bank details in Settings so we can send it.`,
      relatedBooking: escrow.booking,
      priority: 'high',
    });
  }
  return payout;
}

// ---------------------------------------------------------------------------
// open & collect
// ---------------------------------------------------------------------------

/** Create (once) the IntaSend escrow for an accepted booking, for its full agreed price. */
async function openForBooking(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new EscrowError('Booking not found', 404);
  if (!booking.technician) throw new EscrowError('A technician must accept the booking before payment');
  const total = round(booking.pricing?.totalAmount);
  if (!(total > 0)) throw new EscrowError('This booking has no agreed price yet');
  if (total < config.minJobAmount) throw new EscrowError(`The minimum job value is ${kes(config.minJobAmount)}`);

  const existing = await Escrow.findOne({ booking: booking._id });
  if (existing) {
    if (existing.provider !== 'intasend') throw new EscrowError('This booking uses the legacy payment path');
    return existing;
  }

  const f = fees(total);
  try {
    const escrow = await Escrow.create({
      booking: booking._id,
      customer: booking.customer,
      technician: booking.technician,
      totalAmount: total,
      platformFee: f.platformFee,
      tax: f.tax,
      technicianPayout: f.technicianPayout,
      currency: 'KES',
      provider: 'intasend',
      status: 'pending',
      history: [{ action: 'escrow_created', performedBy: booking.customer, toStatus: 'pending', notes: `Full price ${kes(total)}` }],
    });
    await Booking.updateOne({ _id: booking._id }, { $set: { escrow: escrow._id, paymentProvider: 'intasend' } });
    return escrow;
  } catch (error) {
    if (error.code === 11000) return Escrow.findOne({ booking: booking._id });
    throw error;
  }
}

/**
 * Send an STK push for the escrow (initial payment) or an approved top-up.
 * Only one prompt at a time, so a customer tapping twice is not charged twice.
 */
async function startCollection({ escrowId, phone, userId, topupId }) {
  if (!config.isConfigured()) throw new EscrowError('M-Pesa payments are being switched on. Please try again shortly.', 503);
  const escrow = await loadIntaSendEscrow(escrowId);
  if (String(escrow.customer) !== String(userId)) throw new EscrowError('Only the customer can pay for this booking', 403);

  let amount;
  let topup;
  if (topupId) {
    topup = escrow.topups.id(topupId);
    if (!topup || topup.status !== 'approved') throw new EscrowError('This extra cost is not approved');
    if (escrow.status !== 'funded') throw new EscrowError('Extra costs can only be added to a funded job');
    amount = topup.amount;
  } else {
    if (escrow.status !== 'pending') throw new EscrowError('This booking is already paid');
    amount = escrow.totalAmount;
  }

  const number = toWhatsAppNumber(phone);
  if (!number || !/^254[17]\d{8}$/.test(number)) throw new EscrowError('Enter a Safaricom M-Pesa number, e.g. 0712 345 678');

  const inFlight = escrow.collections.find(
    (c) => ACTIVE_COLLECTION.includes(c.state) && Date.now() - new Date(c.requestedAt).getTime() < COLLECTION_LOCK_MS
  );
  if (inFlight) throw new EscrowError('A payment request is already on your phone. Enter your M-Pesa PIN, or wait 3 minutes to try again.', 409);

  const apiRef = `${escrow._id}-${escrow.collections.length + 1}`;
  // Record the request first (atomic push guarded by the same in-flight rule)
  const updated = await Escrow.findOneAndUpdate(
    {
      _id: escrow._id,
      collections: {
        $not: { $elemMatch: { state: { $in: ACTIVE_COLLECTION }, requestedAt: { $gt: new Date(Date.now() - COLLECTION_LOCK_MS) } } },
      },
    },
    {
      $push: {
        collections: { kind: topup ? 'topup' : 'initial', topupIndex: topup ? escrow.topups.indexOf(topup) : undefined, apiRef, phone: number, amount, state: 'REQUESTING' },
      },
    },
    { new: true }
  );
  if (!updated) throw new EscrowError('A payment request is already on your phone.', 409);
  const collection = updated.collections[updated.collections.length - 1];

  const booking = await Booking.findById(escrow.booking).select('bookingNumber');
  try {
    const res = await intasend.stkPush({
      amount,
      phone: number,
      apiRef,
      walletId: config.escrowWalletId,
      narrative: `Dumuwaks ${booking?.bookingNumber || ''}`.trim(),
    });
    const inv = res?.invoice || res || {};
    await Escrow.updateOne(
      { _id: escrow._id, 'collections._id': collection._id },
      { $set: { 'collections.$.invoiceId': inv.invoice_id || inv.id, 'collections.$.state': inv.state || 'PENDING' } }
    );
    return { escrowId: escrow._id, collectionId: collection._id, invoiceId: inv.invoice_id || inv.id, amount, phone: number };
  } catch (error) {
    await Escrow.updateOne(
      { _id: escrow._id, 'collections._id': collection._id },
      { $set: { 'collections.$.state': 'FAILED', 'collections.$.failedReason': error.message } }
    );
    throw new EscrowError('M-Pesa request could not be sent. Please try again in a moment.', 502);
  }
}

/**
 * Record the true state of a collection. Called by the webhook and the poller;
 * the webhook body is never trusted — IntaSend is asked again here.
 */
async function confirmCollection(invoiceId) {
  const escrow = await Escrow.findOne({ 'collections.invoiceId': invoiceId });
  if (!escrow) return { ignored: 'unknown invoice' };
  const collection = escrow.collections.find((c) => c.invoiceId === invoiceId);
  if (collection.state === 'COMPLETE' || collection.state === 'FAILED') return { state: collection.state };

  const res = await intasend.collectionStatus(invoiceId);
  const inv = res?.invoice || res || {};
  const state = String(inv.state || '').toUpperCase();

  if (state === 'FAILED') {
    await Escrow.updateOne(
      { _id: escrow._id, 'collections._id': collection._id, 'collections.state': { $ne: 'COMPLETE' } },
      { $set: { 'collections.$.state': 'FAILED', 'collections.$.failedReason': inv.failed_reason || 'Payment failed' } }
    );
    emit([escrow.customer], 'escrow:collection_failed', { escrowId: escrow._id, reason: inv.failed_reason || 'Payment was not completed' });
    return { state: 'FAILED' };
  }
  if (state !== 'COMPLETE') {
    if (['PENDING', 'PROCESSING'].includes(state)) {
      await Escrow.updateOne({ _id: escrow._id, 'collections._id': collection._id }, { $set: { 'collections.$.state': state } });
    }
    return { state };
  }

  const value = round(inv.value);
  const charges = round(inv.charges || 0);
  const net = inv.net_amount !== undefined ? round(inv.net_amount) : round(value - charges);
  if (inv.api_ref && inv.api_ref !== collection.apiRef) {
    logger.error(`payments: invoice ${invoiceId} api_ref ${inv.api_ref} ≠ ${collection.apiRef}`);
    return { ignored: 'reference mismatch' };
  }
  if (value + 0.01 < collection.amount) {
    logger.error(`payments: invoice ${invoiceId} paid ${value}, expected ${collection.amount}`);
    return { ignored: 'amount short' };
  }

  // Claim the confirmation exactly once
  const claimed = await Escrow.findOneAndUpdate(
    { _id: escrow._id, collections: { $elemMatch: { _id: collection._id, state: { $ne: 'COMPLETE' } } } },
    {
      $set: {
        'collections.$.state': 'COMPLETE',
        'collections.$.value': value,
        'collections.$.netAmount': net,
        'collections.$.charges': charges,
        'collections.$.providerRef': inv.mpesa_reference || inv.provider_reference || invoiceId,
        'collections.$.confirmedAt': new Date(),
      },
    },
    { new: true }
  );
  if (!claimed) return { state: 'COMPLETE' };

  const base = { escrow: escrow._id, booking: escrow.booking, providerRef: invoiceId };
  await ledger.post({ ...base, kind: 'collect', amount: value, idempotencyKey: `collect:${invoiceId}` });
  await ledger.post({ ...base, kind: 'collection_charge', amount: charges || round(value - net), idempotencyKey: `collection_charge:${invoiceId}` });

  if (collection.kind === 'topup') {
    const topup = claimed.topups[collection.topupIndex];
    const total = round(claimed.totalAmount + collection.amount);
    const f = fees(total);
    await Escrow.updateOne(
      { _id: escrow._id },
      {
        $set: {
          totalAmount: total,
          platformFee: f.platformFee,
          tax: f.tax,
          technicianPayout: f.technicianPayout,
          [`topups.${collection.topupIndex}.status`]: 'paid',
        },
        $push: { history: { action: 'topup_funded', performedBy: escrow.customer, notes: `${kes(collection.amount)} — ${topup?.reason || ''}` } },
      }
    );
    await Booking.updateOne({ _id: escrow.booking }, { $set: { 'pricing.totalAmount': total } });
  } else {
    await transition(escrow._id, 'pending', 'funded', { fundedAt: new Date(), expiresAt: getAutoRefundDate() }, {
      action: 'escrow_funded',
      performedBy: escrow.customer,
      notes: `M-Pesa ${inv.mpesa_reference || invoiceId}: ${kes(value)}`,
    });
    await Booking.updateOne(
      { _id: escrow.booking },
      { $set: { 'payment.status': 'processing', 'payment.method': 'mpesa', 'payment.paidAt': new Date() } }
    );
  }

  const amountText = kes(collection.amount);
  emit([escrow.customer, escrow.technician], 'escrow:funded', { escrowId: escrow._id, bookingId: escrow.booking, amount: collection.amount });
  await notify(escrow.customer, {
    type: 'payment_received',
    category: 'payment',
    title: 'Payment received and held',
    body: `${amountText} is held by Dumuwaks. The technician is paid only after you confirm the job is done.`,
    relatedBooking: escrow.booking,
  });
  await notify(escrow.technician, {
    type: 'booking_fee_held',
    category: 'payment',
    title: 'Customer has paid',
    body: `${amountText} is held for this job. You'll be paid when the customer confirms the work.`,
    relatedBooking: escrow.booking,
  });
  return { state: 'COMPLETE', funded: true };
}

/** Re-check STK pushes nobody has heard back about. */
async function pollPendingCollections() {
  const cutoff = new Date(Date.now() - config.collectionPollAfterMs);
  const stale = await Escrow.find({
    provider: 'intasend',
    collections: { $elemMatch: { state: { $in: ['PENDING', 'PROCESSING'] }, requestedAt: { $lt: cutoff }, invoiceId: { $exists: true } } },
  })
    .select('collections')
    .limit(50);
  let checked = 0;
  for (const e of stale) {
    for (const c of e.collections) {
      if (['PENDING', 'PROCESSING'].includes(c.state) && c.invoiceId && c.requestedAt < cutoff) {
        try {
          await confirmCollection(c.invoiceId);
          checked++;
        } catch (error) {
          logger.warn(`payments: poll ${c.invoiceId} failed: ${error.message}`);
        }
      }
    }
  }
  return checked;
}

// ---------------------------------------------------------------------------
// completion, release, refund, disputes
// ---------------------------------------------------------------------------

/** The technician marked the work done: the 3-day auto-release clock starts. */
async function onCompletionRequested(bookingId) {
  const escrow = await Escrow.findOne({ booking: bookingId, provider: 'intasend', status: 'funded' });
  if (!escrow) return null;
  const now = new Date();
  await Escrow.updateOne({ _id: escrow._id }, { $set: { completionRequestedAt: now, expiresAt: getAutoReleaseDate(now) } });
  return escrow._id;
}

/** Pay the technician. Customer confirmation, auto-release, or a dispute resolved for the technician. */
async function release(escrowId, { by, auto = false, fromDispute = false } = {}) {
  const escrow = await loadIntaSendEscrow(escrowId);
  const moved = await transition(escrowId, fromDispute ? 'disputed' : 'funded', 'release_pending', { releasedAt: new Date() }, {
    action: auto ? 'auto_released' : 'escrow_released',
    performedBy: by || escrow.customer,
    notes: auto ? `No response within ${feeConfig.AUTO_RELEASE_DAYS} days of completion` : 'Released to technician',
  });
  if (!moved) {
    const current = await Escrow.findById(escrowId).select('status');
    if (['release_pending', 'released'].includes(current?.status)) return current; // already done
    throw new EscrowError(`Cannot release an escrow that is ${current?.status}`);
  }

  const collected = collectedTotal(moved);
  const f = fees(collected);
  const payout = await queueTechnicianPayout(moved, f.technicianPayout, `release:${escrowId}`, `Dumuwaks job payment`);
  await payouts.processPayout(payout._id);
  return Escrow.findById(escrowId);
}

/**
 * Return money to the customer, optionally paying the technician part of it
 * (cancellation fee or a split dispute). Amounts are gross (before platform fee).
 */
async function refund(escrowId, { refundAmount, technicianGross = 0, reason, by, from = ['funded', 'disputed'] }) {
  const escrow = await loadIntaSendEscrow(escrowId);
  const collected = collectedTotal(escrow);
  refundAmount = round(refundAmount ?? collected - technicianGross);
  technicianGross = round(technicianGross);
  if (refundAmount < 0 || technicianGross < 0 || refundAmount + technicianGross > collected + 0.01) {
    throw new EscrowError(`Refund ${kes(refundAmount)} + technician ${kes(technicianGross)} exceeds the ${kes(collected)} held`);
  }
  const phone = payerPhone(escrow);
  if (refundAmount > 0 && !phone) throw new EscrowError('No paying number on record for the refund');

  const moved = await transition(escrowId, from, 'refunding', {}, {
    action: 'escrow_refund_started',
    performedBy: by || escrow.customer,
    notes: `${reason || 'Refund'} — ${kes(refundAmount)} to customer, ${kes(technicianGross)} (gross) to technician`,
  });
  if (!moved) throw new EscrowError(`Cannot refund an escrow that is ${escrow.status}`);
  await Escrow.updateOne({ _id: escrowId }, { $set: { refund: { reason, amount: refundAmount, status: 'processing', initiatedBy: by } } });

  const queued = [];
  if (refundAmount > 0) {
    queued.push(
      await payouts.create({
        escrow: escrowId,
        booking: escrow.booking,
        kind: 'refund',
        recipient: escrow.customer,
        name: 'Dumuwaks customer',
        narrative: `Dumuwaks refund`,
        destination: { method: 'mpesa', phone },
        amount: refundAmount,
        idempotencyKey: `refund:${escrowId}`,
      })
    );
  }
  if (technicianGross > 0) {
    const net = fees(technicianGross).technicianPayout;
    if (net > 0) queued.push(await queueTechnicianPayout(moved, net, `refund-tech:${escrowId}`, 'Dumuwaks cancellation compensation'));
  }
  for (const p of queued) await payouts.processPayout(p._id);
  if (!queued.length) await onPayoutSettled(escrowId);
  return Escrow.findById(escrowId);
}

/**
 * Cancellation of a funded booking. A technician or admin cancelling means a
 * full refund; a customer cancelling pays the tiered fee to the technician.
 */
async function cancel(bookingId, { cancelledBy, by, reason }) {
  const escrow = await Escrow.findOne({ booking: bookingId, provider: 'intasend' });
  if (!escrow) return null;
  if (escrow.status === 'pending') {
    await transition(escrow._id, 'pending', 'cancelled', { cancelledAt: new Date() }, { action: 'escrow_cancelled', performedBy: by, notes: reason });
    return Escrow.findById(escrow._id);
  }
  if (escrow.status !== 'funded') return escrow;

  const collected = collectedTotal(escrow);
  let technicianGross = 0;
  if (cancelledBy === 'customer') {
    const booking = await Booking.findById(bookingId).select('scheduledDate timeSlot');
    const when = booking?.timeSlot?.date || booking?.scheduledDate || new Date();
    technicianGross = calculateCancellationFee(collected, when).fee;
  }
  return refund(escrow._id, { refundAmount: round(collected - technicianGross), technicianGross, reason: reason || 'Booking cancelled', by, from: ['funded'] });
}

async function openDispute(escrowId, { by, reason }) {
  const escrow = await loadIntaSendEscrow(escrowId);
  const moved = await transition(escrowId, 'funded', 'disputed', { dispute: { reason, openedAt: new Date(), openedBy: by } }, {
    action: 'dispute_opened',
    performedBy: by,
    notes: reason,
  });
  if (!moved) throw new EscrowError(`Cannot dispute an escrow that is ${escrow.status}`);
  return moved;
}

/** resolution: customer_favor | technician_favor | split (technicianShare 0..1 of the amount held) */
async function resolveDispute(escrowId, { resolution, technicianShare, by, notes }) {
  const escrow = await loadIntaSendEscrow(escrowId);
  if (escrow.status !== 'disputed') throw new EscrowError('Escrow is not in dispute');
  const collected = collectedTotal(escrow);
  await Escrow.updateOne({ _id: escrowId }, { $set: { 'dispute.resolution': resolution, 'dispute.resolvedBy': by, 'dispute.resolvedAt': new Date(), 'notes.admin': notes } });

  if (resolution === 'technician_favor') return release(escrowId, { by, fromDispute: true });
  if (resolution === 'customer_favor') return refund(escrowId, { refundAmount: collected, technicianGross: 0, reason: 'Dispute resolved for customer', by, from: ['disputed'] });
  if (resolution === 'split') {
    const share = Number(technicianShare);
    if (!(share > 0 && share < 1)) throw new EscrowError('technicianShare must be between 0 and 1');
    const technicianGross = round(collected * share);
    return refund(escrowId, { refundAmount: round(collected - technicianGross), technicianGross, reason: 'Dispute split', by, from: ['disputed'] });
  }
  throw new EscrowError('Unknown resolution');
}

// ---------------------------------------------------------------------------
// top-ups (extra costs agreed on site)
// ---------------------------------------------------------------------------

async function proposeTopup(escrowId, { technicianId, amount, reason }) {
  const escrow = await loadIntaSendEscrow(escrowId);
  if (String(escrow.technician) !== String(technicianId)) throw new EscrowError('Only the assigned technician can propose extra costs', 403);
  if (escrow.status !== 'funded') throw new EscrowError('Extra costs can be added only while the job is funded');
  amount = round(amount);
  if (!(amount >= 1)) throw new EscrowError('Enter an amount');
  if (escrow.topups.some((t) => t.status === 'proposed')) throw new EscrowError('There is already an extra cost waiting for the customer');
  await Escrow.updateOne({ _id: escrowId }, { $push: { topups: { amount, reason, proposedBy: technicianId } } });
  await notify(escrow.customer, {
    type: 'counter_offer_submitted',
    category: 'booking',
    title: 'Extra cost proposed',
    body: `The technician asks for ${kes(amount)} more: ${reason}. Approve or decline in the booking.`,
    relatedBooking: escrow.booking,
    priority: 'high',
  });
  return Escrow.findById(escrowId);
}

async function decideTopup(escrowId, topupId, { customerId, approve }) {
  const escrow = await loadIntaSendEscrow(escrowId);
  if (String(escrow.customer) !== String(customerId)) throw new EscrowError('Only the customer can decide', 403);
  const res = await Escrow.findOneAndUpdate(
    { _id: escrowId, topups: { $elemMatch: { _id: topupId, status: 'proposed' } } },
    { $set: { 'topups.$.status': approve ? 'approved' : 'rejected', 'topups.$.decidedAt': new Date() } },
    { new: true }
  );
  if (!res) throw new EscrowError('This extra cost was already decided');
  await notify(escrow.technician, {
    type: approve ? 'counter_offer_accepted' : 'counter_offer_rejected',
    category: 'booking',
    title: approve ? 'Extra cost approved' : 'Extra cost declined',
    body: approve ? 'The customer approved the extra cost and is paying it into escrow.' : 'The customer declined the extra cost.',
    relatedBooking: escrow.booking,
  });
  return res;
}

// ---------------------------------------------------------------------------
// settlement
// ---------------------------------------------------------------------------

/**
 * Called whenever a payout for this escrow succeeds. When every payout has
 * gone through, sweep what is left (the platform's share) to the settlement
 * wallet — or top the escrow up from settlement if charges made it negative —
 * then close the escrow.
 */
async function onPayoutSettled(escrowId) {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow || !['release_pending', 'refunding'].includes(escrow.status)) return;

  const all = await Payout.find({ escrow: escrowId, status: { $ne: 'cancelled' } }).lean();
  if (all.some((p) => p.status !== 'succeeded')) return; // something still moving or waiting for review

  const { held } = await ledger.balance(escrowId);
  if (held > 0.004) {
    const sweep = await payouts.create({
      escrow: escrowId,
      booking: escrow.booking,
      kind: 'platform_share',
      amount: held,
      narrative: `Dumuwaks fee ${escrowId}`,
      destination: { method: 'wallet' },
      idempotencyKey: `sweep:${escrowId}`,
    });
    if (sweep.status === 'queued') await payouts.processPayout(sweep._id);
    return; // the sweep's own success calls back here
  }
  if (held < -0.004) {
    logger.warn(`payments: escrow ${escrowId} short by ${-held} after charges — topping up from settlement`);
    const topup = await payouts.create({
      escrow: escrowId,
      booking: escrow.booking,
      kind: 'platform_topup',
      amount: round(-held),
      narrative: `Cover charges ${escrowId}`,
      destination: { method: 'wallet' },
      idempotencyKey: `platform_topup:${escrowId}`,
    });
    if (topup.status === 'queued') await payouts.processPayout(topup._id);
    return;
  }

  // Held is zero: close it
  const releasing = escrow.status === 'release_pending';
  const techPaid = all.some((p) => p.kind === 'technician');
  const final = releasing ? 'released' : techPaid ? 'partially_refunded' : 'refunded';
  const closed = await transition(escrowId, escrow.status, final, releasing ? {} : { refundedAt: new Date(), 'refund.status': 'completed' }, {
    action: releasing ? 'payout_completed' : 'refund_completed',
    notes: all.map((p) => `${p.kind} ${kes(p.amount)} ${p.providerRef || ''}`).join('; '),
  });
  if (!closed) return;

  const techPayout = all.find((p) => p.kind === 'technician');
  const refundPayout = all.find((p) => p.kind === 'refund');
  if (releasing) {
    await Booking.updateOne(
      { _id: escrow.booking },
      {
        $set: { status: 'paid', 'payment.status': 'completed' },
        $push: { statusHistory: { status: 'paid', changedBy: escrow.customer, changedAt: new Date(), reason: 'Escrow released to technician' } },
      }
    );
  } else {
    await Booking.updateOne({ _id: escrow.booking }, { $set: { 'payment.status': 'refunded' } });
  }
  emit([escrow.customer, escrow.technician], 'escrow:closed', { escrowId, status: final });
  if (techPayout) {
    await notify(escrow.technician, {
      type: 'payout_processed',
      category: 'payment',
      title: 'You have been paid',
      body: `${kes(techPayout.amount)} sent to your ${techPayout.destination?.method === 'bank' ? 'bank account' : 'M-Pesa'}. Ref ${techPayout.providerRef || '—'}.`,
      relatedBooking: escrow.booking,
    });
  }
  if (refundPayout) {
    await notify(escrow.customer, {
      type: 'refund_processed',
      category: 'payment',
      title: 'Refund sent',
      body: `${kes(refundPayout.amount)} returned to your M-Pesa. Ref ${refundPayout.providerRef || '—'}.`,
      relatedBooking: escrow.booking,
    });
  } else if (releasing) {
    await notify(escrow.customer, {
      type: 'payment_received',
      category: 'payment',
      title: 'Technician paid',
      body: 'Your payment has been released to the technician. Thank you for using Dumuwaks.',
      relatedBooking: escrow.booking,
    });
  }
}

/** Auto-release after silence, auto-refund for jobs paid but never started. */
async function runAutoActions(now = new Date()) {
  const results = { released: 0, refunded: 0, errors: 0 };

  const toRelease = await Escrow.find({
    provider: 'intasend',
    status: 'funded',
    completionRequestedAt: { $exists: true },
    expiresAt: { $lte: now },
    autoReleaseEnabled: { $ne: false },
  }).select('_id booking');
  for (const e of toRelease) {
    try {
      const booking = await Booking.findById(e.booking).select('status completionRequest');
      if (booking?.status === 'disputed' || booking?.completionRequest?.customerResponse?.approved === false) continue;
      await release(e._id, { auto: true });
      results.released++;
    } catch (error) {
      results.errors++;
      logger.error(`payments: auto-release ${e._id} failed: ${error.message}`);
    }
  }

  const toRefund = await Escrow.find({
    provider: 'intasend',
    status: 'funded',
    completionRequestedAt: { $exists: false },
    expiresAt: { $lte: now },
  }).select('_id booking');
  for (const e of toRefund) {
    try {
      const booking = await Booking.findById(e.booking).select('status');
      if (!['accepted', 'assigned', 'cancelled'].includes(booking?.status)) continue; // work started
      await refund(e._id, { technicianGross: 0, reason: `Job not started within ${feeConfig.AUTO_REFUND_DAYS} days`, from: ['funded'] });
      results.refunded++;
    } catch (error) {
      results.errors++;
      logger.error(`payments: auto-refund ${e._id} failed: ${error.message}`);
    }
  }
  return results;
}

/** What the booking page shows. Staff also see platform movements. */
async function summary(escrowId, { staff = false } = {}) {
  const escrow = await Escrow.findById(escrowId).lean();
  if (!escrow) return null;
  const [balance, list] = await Promise.all([ledger.balance(escrowId), Payout.find({ escrow: escrowId }).sort({ createdAt: 1 }).lean()]);
  return {
    _id: escrow._id,
    booking: escrow.booking,
    provider: escrow.provider,
    status: escrow.status,
    totalAmount: escrow.totalAmount,
    platformFee: escrow.platformFee,
    tax: escrow.tax,
    technicianPayout: escrow.technicianPayout,
    held: balance.held,
    fundedAt: escrow.fundedAt,
    autoReleaseAt: escrow.completionRequestedAt ? escrow.expiresAt : null,
    collections: escrow.collections.map((c) => ({
      _id: c._id,
      kind: c.kind,
      amount: c.amount,
      state: c.state,
      providerRef: c.providerRef,
      phone: c.phone ? c.phone.replace(/^(\d{6})\d{3}/, '$1***') : undefined,
      requestedAt: c.requestedAt,
      confirmedAt: c.confirmedAt,
      failedReason: c.failedReason,
    })),
    topups: escrow.topups,
    payouts: list
      .filter((p) => staff || !p.kind.startsWith('platform'))
      .map((p) => ({ _id: p._id, kind: p.kind, amount: p.amount, status: p.status, providerRef: p.providerRef, completedAt: p.completedAt, method: p.destination?.method, ...(staff ? { reviewReason: p.reviewReason, failureReason: p.failureReason } : {}) })),
    dispute: escrow.dispute,
    history: staff ? escrow.history : undefined,
  };
}

module.exports = {
  openForBooking,
  startCollection,
  confirmCollection,
  pollPendingCollections,
  onCompletionRequested,
  release,
  refund,
  cancel,
  openDispute,
  resolveDispute,
  proposeTopup,
  decideTopup,
  onPayoutSettled,
  runAutoActions,
  summary,
  collectedTotal,
  EscrowError,
};
