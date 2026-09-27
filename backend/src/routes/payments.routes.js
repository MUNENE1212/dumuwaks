const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const c = require('../controllers/payments.controller');

const router = express.Router();
const staff = [protect, authorize('admin', 'support')];
const admin = [protect, authorize('admin')];

// What the app needs to know to show the right payment flow
router.get('/config', c.publicConfig);

// IntaSend → Dumuwaks (authenticated by the dashboard challenge)
router.post('/intasend/webhook', c.intasendWebhook);

// Booking escrow
router.get('/bookings/:id/escrow', protect, [param('id').isMongoId(), validate], c.getBookingEscrow);
router.post(
  '/bookings/:id/escrow/pay',
  protect,
  authorize('customer', 'corporate'),
  [param('id').isMongoId(), body('phone').trim().notEmpty().withMessage('M-Pesa number is required'), validate],
  c.payBookingEscrow
);
router.post(
  '/bookings/:id/escrow/topups',
  protect,
  authorize('technician'),
  [
    param('id').isMongoId(),
    body('amount').isFloat({ min: 1, max: 1000000 }).withMessage('Enter an amount in KES'),
    body('reason').trim().isLength({ min: 3, max: 500 }).withMessage('Say what the extra cost is for'),
    validate,
  ],
  c.proposeTopup
);
router.post(
  '/bookings/:id/escrow/topups/:topupId',
  protect,
  authorize('customer', 'corporate'),
  [param('id').isMongoId(), param('topupId').isMongoId(), body('approve').isBoolean(), validate],
  c.decideTopup
);
router.post(
  '/bookings/:id/escrow/dispute',
  protect,
  [param('id').isMongoId(), body('reason').trim().isLength({ min: 5, max: 1000 }).withMessage('Describe the problem'), validate],
  c.openDispute
);

// Technician payout details
router.get('/payout-destination', protect, authorize('technician'), c.getPayoutDestination);
router.put(
  '/payout-destination',
  protect,
  authorize('technician'),
  [body('method').isIn(['mpesa', 'bank']), validate],
  c.requestPayoutDestination
);
router.post(
  '/payout-destination/verify',
  protect,
  authorize('technician'),
  [body('code').matches(/^\d{6}$/).withMessage('Enter the 6-digit code'), validate],
  c.verifyPayoutDestination
);
router.get('/bank-codes', protect, c.bankCodes);

// Admin finance
router.get('/admin/overview', ...staff, c.financeOverview);
router.get('/admin/payouts', ...staff, c.listPayouts);
router.post('/admin/payouts/:payoutId/approve', ...admin, [param('payoutId').isMongoId(), validate], c.approvePayout);
router.post('/admin/payouts/:payoutId/refresh', ...staff, [param('payoutId').isMongoId(), validate], c.refreshPayout);
router.get('/admin/escrows', ...staff, c.listEscrows);
router.get('/admin/escrows/:escrowId', ...staff, [param('escrowId').isMongoId(), validate], c.escrowDetail);
router.post(
  '/admin/escrows/:escrowId/resolve',
  ...admin,
  [
    param('escrowId').isMongoId(),
    body('resolution').isIn(['customer_favor', 'technician_favor', 'split']),
    body('technicianShare').optional().isFloat({ gt: 0, lt: 1 }),
    validate,
  ],
  c.resolveDispute
);
router.get('/admin/reconciliation', ...staff, c.reconciliationHistory);
router.post('/admin/reconciliation', ...admin, c.runReconciliation);

module.exports = router;
