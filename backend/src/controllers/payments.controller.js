const config = require('../config/payments');
const engine = require('../services/payments/escrow.engine');
const payouts = require('../services/payments/payout.service');
const destinations = require('../services/payments/payoutDestination.service');
const webhook = require('../services/payments/webhook.service');
const finance = require('../services/payments/finance.service');
const reconciliation = require('../services/payments/reconciliation.service');
const { findBookingPopulated, getBookingRole, notFound, notAuthorized } = require('../utils/bookingHelpers');
const logger = require('../utils/logger');

const fail = (res, error, fallback = 'Payment error') => {
  const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status >= 500) logger.error(`payments: ${error.stack || error.message}`);
  res.status(status).json({ success: false, message: status >= 500 && !error.status ? fallback : error.message });
};

async function bookingFor(req, res) {
  const booking = await findBookingPopulated(req.params.id, 'minimal');
  if (!booking) {
    notFound(res);
    return null;
  }
  const { authorized, role } = getBookingRole(booking, req.user.id, req.user.role);
  if (!authorized) {
    notAuthorized(res);
    return null;
  }
  return { booking, role };
}

/**
 * @desc    Payment flow switches for the app
 * @route   GET /api/v1/payments/config
 * @access  Public
 */
exports.publicConfig = (req, res) => {
  res.json({
    success: true,
    message: 'Payments config',
    // escrow: the booking flow (always); ready: IntaSend keys are live, so the Pay button works
    data: { escrow: true, ready: config.isConfigured(), minJobAmount: config.minJobAmount, currency: config.currency },
  });
};

/**
 * @desc    IntaSend events (collections and payouts)
 * @route   POST /api/v1/payments/intasend/webhook
 * @access  Public (challenge)
 */
exports.intasendWebhook = async (req, res) => {
  const body = req.body || {};
  if (!webhook.validChallenge(body.challenge)) {
    return res.status(401).json({ success: false, message: 'Invalid challenge' });
  }
  res.status(200).json({ success: true, message: 'Received' });
  try {
    await webhook.handle(body);
  } catch (error) {
    logger.error(`payments: webhook handling failed: ${error.message}`);
  }
};

/**
 * @desc    Escrow state for a booking
 * @route   GET /api/v1/payments/bookings/:id/escrow
 * @access  Private (booking parties, staff)
 */
exports.getBookingEscrow = async (req, res) => {
  try {
    const ctx = await bookingFor(req, res);
    if (!ctx) return;
    const { booking, role } = ctx;
    if (!booking.escrow) {
      return res.json({
        success: true,
        message: 'Not paid yet',
        data: {
          status: 'unpaid',
          provider: booking.paymentProvider,
          amountDue: booking.pricing?.totalAmount,
          canPay: role === 'customer' && Boolean(booking.technician) && booking.paymentProvider === 'intasend',
        },
      });
    }
    const data = await engine.summary(booking.escrow, { staff: ['admin', 'support'].includes(role) });
    res.json({ success: true, message: 'Escrow', data });
  } catch (error) {
    fail(res, error);
  }
};

/**
 * @desc    Pay the full price into escrow (M-Pesa STK push)
 * @route   POST /api/v1/payments/bookings/:id/escrow/pay
 * @access  Private (customer)
 */
exports.payBookingEscrow = async (req, res) => {
  try {
    const ctx = await bookingFor(req, res);
    if (!ctx) return;
    const { booking, role } = ctx;
    if (role !== 'customer') return notAuthorized(res, 'Only the customer pays for a booking');
    if (booking.paymentProvider !== 'intasend') {
      return res.status(409).json({ success: false, message: 'This booking uses the earlier payment flow' });
    }
    if (!['accepted', 'assigned'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Payment opens once a technician has accepted the job' });
    }
    const escrow = await engine.openForBooking(booking._id);
    const result = await engine.startCollection({ escrowId: escrow._id, phone: req.body.phone, userId: req.user.id });
    res.status(202).json({
      success: true,
      message: 'Check your phone and enter your M-Pesa PIN',
      data: result,
    });
  } catch (error) {
    fail(res, error, 'Could not start the payment');
  }
};

/**
 * @desc    Technician proposes an extra cost agreed on site
 * @route   POST /api/v1/payments/bookings/:id/escrow/topups
 * @access  Private (technician)
 */
exports.proposeTopup = async (req, res) => {
  try {
    const ctx = await bookingFor(req, res);
    if (!ctx) return;
    if (ctx.role !== 'technician') return notAuthorized(res, 'Only the technician proposes extra costs');
    if (!ctx.booking.escrow) return res.status(400).json({ success: false, message: 'The job is not paid yet' });
    await engine.proposeTopup(ctx.booking.escrow, { technicianId: req.user.id, amount: req.body.amount, reason: req.body.reason });
    res.status(201).json({ success: true, message: 'Sent to the customer for approval', data: await engine.summary(ctx.booking.escrow) });
  } catch (error) {
    fail(res, error);
  }
};

/**
 * @desc    Customer approves (and pays) or declines an extra cost
 * @route   POST /api/v1/payments/bookings/:id/escrow/topups/:topupId
 * @access  Private (customer)
 */
exports.decideTopup = async (req, res) => {
  try {
    const ctx = await bookingFor(req, res);
    if (!ctx) return;
    if (ctx.role !== 'customer') return notAuthorized(res, 'Only the customer decides on extra costs');
    const approve = req.body.approve === true;
    await engine.decideTopup(ctx.booking.escrow, req.params.topupId, { customerId: req.user.id, approve });
    let collection = null;
    if (approve) {
      collection = await engine.startCollection({
        escrowId: ctx.booking.escrow,
        phone: req.body.phone,
        userId: req.user.id,
        topupId: req.params.topupId,
      });
    }
    res.json({
      success: true,
      message: approve ? 'Check your phone and enter your M-Pesa PIN' : 'Extra cost declined',
      data: { collection, escrow: await engine.summary(ctx.booking.escrow) },
    });
  } catch (error) {
    fail(res, error);
  }
};

/**
 * @desc    Freeze the held money while a disagreement is reviewed
 * @route   POST /api/v1/payments/bookings/:id/escrow/dispute
 * @access  Private (booking parties)
 */
exports.openDispute = async (req, res) => {
  try {
    const ctx = await bookingFor(req, res);
    if (!ctx) return;
    if (!ctx.booking.escrow) return res.status(400).json({ success: false, message: 'Nothing is held for this booking' });
    await engine.openDispute(ctx.booking.escrow, { by: req.user.id, reason: req.body.reason });
    res.json({ success: true, message: 'Payment frozen. The Dumuwaks team will contact you both.', data: await engine.summary(ctx.booking.escrow) });
  } catch (error) {
    fail(res, error);
  }
};

// ---- technician payout details ---------------------------------------------

exports.getPayoutDestination = async (req, res) => {
  try {
    res.json({ success: true, message: 'Payout details', data: await destinations.get(req.user.id) });
  } catch (error) {
    fail(res, error);
  }
};

exports.requestPayoutDestination = async (req, res) => {
  try {
    const data = await destinations.requestChange(req.user.id, req.body);
    res.status(202).json({ success: true, message: `Enter the code we sent to ${data.sentTo}`, data });
  } catch (error) {
    fail(res, error);
  }
};

exports.verifyPayoutDestination = async (req, res) => {
  try {
    const data = await destinations.verify(req.user.id, req.body.code);
    res.json({ success: true, message: 'Payout details saved', data });
  } catch (error) {
    fail(res, error);
  }
};

exports.bankCodes = async (req, res) => {
  try {
    res.json({ success: true, message: 'Banks', data: await destinations.bankCodes() });
  } catch (error) {
    fail(res, error, 'Bank list unavailable');
  }
};

// ---- admin finance -----------------------------------------------------------

exports.financeOverview = async (req, res) => {
  try {
    res.json({ success: true, message: 'Finance overview', data: await finance.overview() });
  } catch (error) {
    fail(res, error);
  }
};

exports.listPayouts = async (req, res) => {
  try {
    const { items, total, page, pages } = await finance.listPayouts(req.query);
    res.json({ success: true, message: 'Payouts', data: items, count: items.length, total, page, pages });
  } catch (error) {
    fail(res, error);
  }
};

exports.approvePayout = async (req, res) => {
  try {
    const payout = await payouts.approve(req.params.payoutId, req.user.id);
    res.json({ success: true, message: `Payout ${payout.status}`, data: payout });
  } catch (error) {
    fail(res, Object.assign(error, { status: error.status || 400 }));
  }
};

exports.refreshPayout = async (req, res) => {
  try {
    const payout = await payouts.refresh(req.params.payoutId);
    res.json({ success: true, message: `Payout ${payout?.status}`, data: payout });
  } catch (error) {
    fail(res, error);
  }
};

exports.listEscrows = async (req, res) => {
  try {
    const { items, total, page, pages } = await finance.listEscrows(req.query);
    res.json({ success: true, message: 'Escrows', data: items, count: items.length, total, page, pages });
  } catch (error) {
    fail(res, error);
  }
};

exports.escrowDetail = async (req, res) => {
  try {
    const data = await finance.escrowDetail(req.params.escrowId);
    if (!data) return res.status(404).json({ success: false, message: 'Escrow not found' });
    res.json({ success: true, message: 'Escrow', data });
  } catch (error) {
    fail(res, error);
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    const { resolution, technicianShare, notes } = req.body;
    await engine.resolveDispute(req.params.escrowId, { resolution, technicianShare, notes, by: req.user.id });
    res.json({ success: true, message: 'Dispute resolved', data: await finance.escrowDetail(req.params.escrowId) });
  } catch (error) {
    fail(res, error);
  }
};

exports.runReconciliation = async (req, res) => {
  try {
    if (!config.isConfigured()) return res.status(503).json({ success: false, message: 'Payments are not configured' });
    res.json({ success: true, message: 'Reconciliation run', data: await reconciliation.run() });
  } catch (error) {
    fail(res, error);
  }
};

exports.reconciliationHistory = async (req, res) => {
  try {
    res.json({ success: true, message: 'Reconciliation runs', data: await reconciliation.latest(30) });
  } catch (error) {
    fail(res, error);
  }
};
