const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  webhook,
  status,
  connect,
  syncWebhook,
  logout,
  listRequests,
  updateRequest,
  send,
} = require('../controllers/whatsapp.controller');

const router = express.Router();

// Evolution API → Dumuwaks (authenticated by the secret in the path)
router.post('/webhook/:secret', webhook);

// Support desk
router.get('/status', protect, authorize('support', 'admin'), status);
router.get('/requests', protect, authorize('support', 'admin'), listRequests);
router.patch(
  '/requests/:id',
  protect,
  authorize('support', 'admin'),
  [
    param('id').isMongoId(),
    body('status').optional().isIn(['open', 'in_progress', 'converted', 'closed']),
    body('booking').optional().isMongoId(),
    body('note').optional().isString().isLength({ max: 1000 }),
    validate,
  ],
  updateRequest
);
router.post(
  '/send',
  protect,
  authorize('support', 'admin'),
  [
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('text').trim().isLength({ min: 1, max: 4000 }).withMessage('Message is required'),
    body('requestId').optional().isMongoId(),
    validate,
  ],
  send
);

// Channel admin
router.post('/connect', protect, authorize('admin'), connect);
router.post('/webhook-sync', protect, authorize('admin'), syncWebhook);
router.post('/logout', protect, authorize('admin'), logout);

module.exports = router;
