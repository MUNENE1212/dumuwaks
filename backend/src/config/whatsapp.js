/**
 * WhatsApp channel configuration (Evolution API v2, Baileys/QR mode).
 *
 * Evolution runs on the Emen VPS (see baitech-infra/dumuwaks-evolution/).
 * Dumuwaks talks to it over HTTP with the instance API key, and Evolution
 * posts inbound events to POST /api/v1/whatsapp/webhook/:secret.
 */

const env = process.env;

const config = {
  enabled: env.WHATSAPP_ENABLED === 'true',
  apiUrl: (env.EVOLUTION_API_URL || 'http://127.0.0.1:8083').replace(/\/+$/, ''),
  apiKey: env.EVOLUTION_API_KEY || '',
  instance: env.EVOLUTION_INSTANCE || 'dumuwaks',
  webhookSecret: env.WHATSAPP_WEBHOOK_SECRET || '',
  /** Public base the webhook URL is built from when syncing it to Evolution. */
  webhookBaseUrl: (env.WHATSAPP_WEBHOOK_BASE_URL || 'https://dumuwaks.co.ke').replace(/\/+$/, ''),
  siteUrl: (env.SITE_URL || 'https://dumuwaks.co.ke').replace(/\/+$/, ''),
  /** Default country code for numbers typed locally (07xx / 01xx). */
  defaultCountryCode: env.WHATSAPP_DEFAULT_CC || '254',
  /** Minimum gap between outbound messages from one process, to stay under WhatsApp's spam heuristics. */
  sendIntervalMs: parseInt(env.WHATSAPP_SEND_INTERVAL_MS, 10) || 1200,
  /** A conversation left idle this long returns to the menu. */
  sessionIdleMs: 30 * 60 * 1000,
  /** After a customer asks for a person, the bot stays quiet this long. */
  humanHandoffMs: 12 * 60 * 60 * 1000,
};

config.isConfigured = () => Boolean(config.enabled && config.apiUrl && config.apiKey && config.instance);

module.exports = config;
