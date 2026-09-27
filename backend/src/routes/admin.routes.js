const express = require('express');
const { query, param, body } = require('express-validator');
const {
  getDashboardStats,
  getRecentActivity,
  getTopTechnicians,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
  restoreUser,
  getAnalytics,
  getPricingConfig,
  getPricingHistory,
  updatePricingConfig,
  updatePlatformFee,
  updateTax,
  updateDiscounts,
  updateServiceRates,
  getReports
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// Import new admin stats routes
const adminStatsRoutes = require('./adminStats.routes');

const router = express.Router();

// All routes are admin-only
router.use(protect);
router.use(authorize('admin'));

// Mount admin stats routes under /stats
router.use('/stats', adminStatsRoutes);

// Dashboard routes
router.get('/stats', getDashboardStats);
router.get('/activity', getRecentActivity);
router.get('/top-technicians', getTopTechnicians);
router.get('/analytics', getAnalytics);
router.get('/reports', getReports);

// User management routes
router.get('/users', getUsers);
router.get('/users/:userId', [param('userId').isMongoId(), validate], getUserById);

// Technician ID verification (public badge: "ID verified" / "Not yet verified")
router.patch(
  '/users/:userId/verification',
  [param('userId').isMongoId(), body('verified').isBoolean(), validate],
  async (req, res) => {
    try {
      const data = await require('../services/verification.service').setVerified(req.params.userId, {
        verified: req.body.verified,
        adminId: req.user._id
      });
      res.json({ success: true, message: req.body.verified ? 'Technician verified' : 'Verification removed', data });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }
);

router.patch(
  '/users/:userId',
  [param('userId').isMongoId().withMessage('Valid user ID is required'), validate],
  updateUser
);

router.patch(
  '/users/:userId/status',
  [
    param('userId').isMongoId().withMessage('Valid user ID is required'),
    body('status')
      .isIn(['active', 'suspended', 'banned'])
      .withMessage('Status must be active, suspended, or banned'),
    body('reason').optional().trim(),
    validate
  ],
  updateUserStatus
);

router.delete(
  '/users/:userId',
  [param('userId').isMongoId().withMessage('Valid user ID is required'), validate],
  deleteUser
);

router.post(
  '/users/:userId/restore',
  [param('userId').isMongoId().withMessage('Valid user ID is required'), validate],
  restoreUser
);

// System Settings / Pricing Config routes
router.get('/settings/pricing', getPricingConfig);
router.get('/settings/pricing/history', getPricingHistory);
router.post('/settings/pricing', updatePricingConfig);
router.patch('/settings/platform-fee', updatePlatformFee);
router.patch('/settings/tax', updateTax);
router.patch('/settings/discounts', updateDiscounts);
router.patch('/settings/service-rates', updateServiceRates);

module.exports = router;
