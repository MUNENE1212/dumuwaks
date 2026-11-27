/**
 * Admin Analytics API Routes
 *
 * HTTP endpoints for admin analytics dashboard.
 * Provides REST API access to analytics data for initial load
 * and fallback when WebSocket is unavailable.
 *
 * All routes require admin authentication.
 */

const express = require('express');
const { query } = require('express-validator');
const analyticsService = require('../services/analytics.service');
const tractionService = require('../services/traction.service');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/admin/analytics/realtime
 * @desc    Get current real-time platform metrics
 * @access  Admin only
 *
 * Returns:
 * - activeBookings: Total active bookings
 * - activeBookingsByStatus: Breakdown by status
 * - revenueToday: Today's revenue (platform fees)
 * - revenueYesterday: Yesterday's revenue
 * - revenueChangePercent: Percentage change
 * - techniciansOnline: Number of online technicians
 * - customersOnline: Number of online customers
 * - bookingsLastHour: Bookings created in last hour
 * - averageResponseTime: Average response time (minutes)
 */
router.get(
  '/realtime',
  async (req, res) => {
    try {
      // Clear cache to ensure fresh data
      analyticsService.clearMetricsCache();

      const metrics = await analyticsService.getRealtimeMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('[Analytics API] Error getting realtime metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve real-time metrics',
      });
    }
  }
);

/**
 * @route   GET /api/v1/admin/analytics/trends
 * @desc    Get historical trend data
 * @access  Admin only
 *
 * Query params:
 * - period: Time period ('24h', '7d', '30d', '90d') - default: '7d'
 *
 * Returns:
 * - period: Requested period
 * - startDate: Start of period
 * - endDate: End of period
 * - bookings: Array of {date, count} for bookings
 * - revenue: Array of {date, revenue} for revenue
 * - users: Array of {date, count} for new users
 */
router.get(
  '/trends',
  [
    query('period')
      .optional()
      .isIn(['24h', '7d', '30d', '90d'])
      .withMessage('Period must be one of: 24h, 7d, 30d, 90d'),
    validate
  ],
  async (req, res) => {
    try {
      const { period = '7d' } = req.query;
      const trends = await analyticsService.getTrends(period);

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('[Analytics API] Error getting trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve trend data',
      });
    }
  }
);

/**
 * @route   GET /api/v1/admin/analytics/status-distribution
 * @desc    Get booking status distribution
 * @access  Admin only
 *
 * Returns:
 * - total: Total bookings
 * - distribution: Array of {status, count, percentage}
 */
router.get(
  '/status-distribution',
  async (req, res) => {
    try {
      const distribution = await analyticsService.getStatusDistribution();

      res.json({
        success: true,
        data: distribution
      });
    } catch (error) {
      console.error('[Analytics API] Error getting status distribution:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve status distribution',
      });
    }
  }
);

/**
 * @route   GET /api/v1/admin/analytics/activity-feed
 * @desc    Get recent platform activity feed
 * @access  Admin only
 *
 * Query params:
 * - limit: Number of activities (default: 20, max: 100)
 *
 * Returns array of activities:
 * - id: Unique activity ID
 * - type: Activity type (booking_created, booking_completed, etc.)
 * - data: Activity-specific data
 * - timestamp: ISO timestamp
 */
router.get(
  '/activity-feed',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    validate
  ],
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const feed = analyticsService.getActivityFeed(limit);

      res.json({
        success: true,
        data: feed,
        count: feed.length
      });
    } catch (error) {
      console.error('[Analytics API] Error getting activity feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve activity feed',
      });
    }
  }
);

/**
 * @route   GET /api/v1/admin/analytics/cache-stats
 * @desc    Get cache statistics (for debugging/monitoring)
 * @access  Admin only
 */
router.get(
  '/cache-stats',
  async (req, res) => {
    try {
      const stats = analyticsService.getCacheStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('[Analytics API] Error getting cache stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cache stats',
      });
    }
  }
);

/**
 * @route   POST /api/v1/admin/analytics/clear-cache
 * @desc    Clear metrics cache (force refresh)
 * @access  Admin only
 */
router.post(
  '/clear-cache',
  async (req, res) => {
    try {
      analyticsService.clearMetricsCache();

      res.json({
        success: true,
        message: 'Cache cleared successfully'
      });
    } catch (error) {
      console.error('[Analytics API] Error clearing cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear cache',
      });
    }
  }
);

/**
 * @route   GET /api/v1/admin/analytics/traction
 * @desc    Traction KPIs for the weekly review: technicians, customers,
 *          completed jobs per week, repeat rate, in-app payment share and
 *          platform revenue per month
 * @access  Admin only
 *
 * Query params:
 * - weeks: weeks of history (4-52, default 12)
 */
router.get(
  '/traction',
  [
    query('weeks')
      .optional()
      .isInt({ min: 4, max: 52 })
      .withMessage('Weeks must be between 4 and 52'),
    validate
  ],
  async (req, res) => {
    try {
      const weeks = parseInt(req.query.weeks) || 12;
      const traction = await tractionService.getTraction({ weeks, includeRevenue: true });

      res.json({
        success: true,
        data: traction
      });
    } catch (error) {
      console.error('[Analytics API] Error getting traction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve traction figures',
      });
    }
  }
);

module.exports = router;
