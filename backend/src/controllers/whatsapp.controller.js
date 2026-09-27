const crypto = require('crypto');
const config = require('../config/whatsapp');
const evolution = require('../services/whatsapp/evolution.client');
const bot = require('../services/whatsapp/bot.service');
const desk = require('../services/whatsapp/desk.service');
const logger = require('../utils/logger');

function safeEqual(a, b) {
  const ab = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ab.length === bb.length && ab.length > 0 && crypto.timingSafeEqual(ab, bb);
}

function staffEmit(event, data) {
  try {
    require('../config/socket').emitToStaff(event, data);
  } catch (_) {
    /* socket not initialised (tests, scripts) */
  }
}

/**
 * @desc    Receive events from Evolution API
 * @route   POST /api/v1/whatsapp/webhook/:secret
 * @access  Public (shared secret in the path)
 */
exports.webhook = async (req, res) => {
  if (!config.webhookSecret || !safeEqual(req.params.secret, config.webhookSecret)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const body = req.body || {};
  if (body.instance && body.instance !== config.instance) {
    return res.status(200).json({ success: true, message: 'Ignored: other instance' });
  }

  // Acknowledge first; Evolution retries slow webhooks.
  res.status(200).json({ success: true });

  try {
    switch (body.event) {
      case 'messages.upsert':
        await bot.handleInbound(bot.parseInbound(body));
        break;
      case 'connection.update':
        evolution.noteState(body.data?.state);
        logger.info(`whatsapp: connection ${body.data?.state}`);
        staffEmit('whatsapp:connection', { state: body.data?.state });
        break;
      case 'qrcode.updated':
        staffEmit('whatsapp:qr', { base64: body.data?.qrcode?.base64 || body.data?.base64 });
        break;
      default:
        break;
    }
  } catch (error) {
    const log = error.code === 'WHATSAPP_NOT_LINKED' ? logger.warn : logger.error;
    log.call(logger, `whatsapp: webhook ${body.event} failed: ${error.message}`);
  }
};

/**
 * @desc    Channel status for the desk
 * @route   GET /api/v1/whatsapp/status
 * @access  Private (support, admin)
 */
exports.status = async (req, res) => {
  const base = { enabled: config.enabled, configured: config.isConfigured(), instance: config.instance };
  if (!config.isConfigured()) {
    return res.json({ success: true, data: { ...base, state: 'not_configured' } });
  }
  try {
    const state = await evolution.connectionState();
    evolution.noteState(state);
    const requests = await desk.counts();
    res.json({ success: true, data: { ...base, state, requests } });
  } catch (error) {
    const state = error.response?.status === 404 ? 'no_instance' : 'unreachable';
    res.json({ success: true, data: { ...base, state, error: error.message } });
  }
};

/**
 * @desc    Link the Dumuwaks phone: returns a QR (and pairing code when a number is given)
 * @route   POST /api/v1/whatsapp/connect
 * @access  Private (admin)
 */
exports.connect = async (req, res) => {
  if (!config.isConfigured()) {
    return res.status(400).json({ success: false, message: 'WhatsApp is not configured on the server' });
  }
  try {
    let data;
    try {
      data = await evolution.connect(req.body?.number);
    } catch (error) {
      if (error.response?.status !== 404) throw error;
      await evolution.createInstance();
      data = await evolution.connect(req.body?.number);
    }
    await evolution.setWebhook().catch((e) => logger.warn(`whatsapp: webhook sync failed: ${e.message}`));
    res.json({
      success: true,
      message: 'Scan the QR from WhatsApp → Linked devices',
      data: { base64: data?.base64 || null, pairingCode: data?.pairingCode || null, code: data?.code || null },
    });
  } catch (error) {
    res.status(502).json({ success: false, message: `Evolution API: ${error.message}` });
  }
};

/**
 * @desc    Point the Evolution instance at this server's webhook
 * @route   POST /api/v1/whatsapp/webhook-sync
 * @access  Private (admin)
 */
exports.syncWebhook = async (req, res) => {
  try {
    await evolution.setWebhook();
    res.json({ success: true, message: 'Webhook set', data: { events: evolution.WEBHOOK_EVENTS } });
  } catch (error) {
    res.status(502).json({ success: false, message: `Evolution API: ${error.message}` });
  }
};

/**
 * @desc    Unlink the phone
 * @route   POST /api/v1/whatsapp/logout
 * @access  Private (admin)
 */
exports.logout = async (req, res) => {
  try {
    await evolution.logout();
    res.json({ success: true, message: 'WhatsApp unlinked' });
  } catch (error) {
    res.status(502).json({ success: false, message: `Evolution API: ${error.message}` });
  }
};

/**
 * @desc    Requests inbox
 * @route   GET /api/v1/whatsapp/requests
 * @access  Private (support, admin)
 */
exports.listRequests = async (req, res) => {
  try {
    const { items, total, page, pages } = await desk.listRequests(req.query);
    res.json({ success: true, message: 'Requests', data: items, count: items.length, total, page, pages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a request: status, assignee, linked booking, or add a note
 * @route   PATCH /api/v1/whatsapp/requests/:id
 * @access  Private (support, admin)
 */
exports.updateRequest = async (req, res) => {
  try {
    const request = await desk.updateRequest(req.params.id, req.body, req.user._id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, message: 'Request updated', data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Reply to a customer from the desk
 * @route   POST /api/v1/whatsapp/send
 * @access  Private (support, admin)
 */
exports.send = async (req, res) => {
  if (!config.isConfigured()) {
    return res.status(400).json({ success: false, message: 'WhatsApp is not configured on the server' });
  }
  try {
    const { phone, text, requestId } = req.body;
    await bot.sendFromDesk(phone, text);
    await desk.logDeskReply(requestId, req.user._id, text);
    res.json({ success: true, message: 'Sent' });
  } catch (error) {
    res.status(502).json({ success: false, message: error.message });
  }
};
