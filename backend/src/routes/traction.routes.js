/**
 * Public Traction Route
 *
 * Aggregate counts only — no names, no revenue, no per-user data — so the
 * founder's portfolio and pitch material can show live, verifiable numbers.
 *
 * @route   GET /api/v1/public/traction
 * @access  Public
 * @cache   1 hour (in memory and for browsers/CDNs)
 */

const express = require('express');
const tractionService = require('../services/traction.service');

const router = express.Router();

const CACHE_MS = 60 * 60 * 1000;
let cache = { at: 0, data: null };

router.get('/traction', async (req, res) => {
  try {
    if (!cache.data || Date.now() - cache.at > CACHE_MS) {
      cache = { at: Date.now(), data: await tractionService.getTraction({ weeks: 12 }) };
    }
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ success: true, data: cache.data });
  } catch (error) {
    console.error('[Traction] Error computing public traction:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve traction figures' });
  }
});

// For tests
router._resetCache = () => {
  cache = { at: 0, data: null };
};

module.exports = router;
