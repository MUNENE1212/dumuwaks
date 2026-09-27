/**
 * Thin client for Evolution API v2.
 * Docs: https://doc.evolution-api.com/v2/api-reference
 *
 * Outbound messages go through one queue per process, spaced by
 * config.sendIntervalMs: a linked personal/business number that bursts
 * messages is the quickest way to get it flagged by WhatsApp.
 */

const axios = require('axios');
const config = require('../../config/whatsapp');

const WEBHOOK_EVENTS = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'];

let http = null;
function client() {
  if (!http) {
    http = axios.create({
      baseURL: config.apiUrl,
      timeout: 15000,
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
    });
  }
  return http;
}

/** Test hook: replace the axios instance. */
function _setHttp(instance) {
  http = instance;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry only failures where the message certainly did not go out: the
 * connection was refused/reset, or Evolution answered 429/5xx. A timeout is
 * never retried — the send may have succeeded, and a duplicate is worse.
 */
function isRetryable(error) {
  if (error.response) return error.response.status === 429 || error.response.status >= 500;
  return ['ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND'].includes(error.code);
}

async function withRetry(fn, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || i === attempts - 1) break;
      await sleep(500 * 2 ** i);
    }
  }
  throw lastError;
}

// ---- link state -------------------------------------------------------------
// Evolution holds a send open until timeout when the phone is not linked, so
// check first. State is cached briefly and updated by connection.update webhooks.

const STATE_TTL_MS = 60 * 1000;
let cachedState = { value: null, at: 0 };

/** Record a known state; a missing state clears the cache so the next send re-checks. */
function noteState(state) {
  cachedState = state ? { value: state, at: Date.now() } : { value: null, at: 0 };
}

async function isLinked() {
  if (cachedState.value && Date.now() - cachedState.at < STATE_TTL_MS) return cachedState.value === 'open';
  try {
    noteState(await connectionState());
  } catch (_) {
    noteState('unreachable');
  }
  return cachedState.value === 'open';
}

class NotLinkedError extends Error {
  constructor(state) {
    super(`WhatsApp is not linked (state: ${state})`);
    this.code = 'WHATSAPP_NOT_LINKED';
  }
}

// ---- send queue -----------------------------------------------------------

let queue = Promise.resolve();
let lastSentAt = 0;

function enqueue(task) {
  const run = queue.then(async () => {
    const wait = lastSentAt + config.sendIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      return await task();
    } finally {
      lastSentAt = Date.now();
    }
  });
  // keep the chain alive after a failure
  queue = run.catch(() => {});
  return run;
}

// ---- API ------------------------------------------------------------------

/**
 * Send a text message. `number` is digits with country code.
 * `delay` shows "typing…" for that many ms first, which reads as a person.
 */
async function sendText(number, text, { delay = 800 } = {}) {
  if (!(await isLinked())) throw new NotLinkedError(cachedState.value);
  return enqueue(() =>
    withRetry(async () => {
      const { data } = await client().post(`/message/sendText/${config.instance}`, {
        number,
        text,
        delay,
        linkPreview: false,
      });
      return data;
    })
  );
}

async function connectionState() {
  const { data } = await client().get(`/instance/connectionState/${config.instance}`);
  // v2: { instance: { instanceName, state: 'open' | 'close' | 'connecting' } }
  return data?.instance?.state || data?.state || 'unknown';
}

/** Returns { base64, pairingCode, code } — base64 is a data-URI PNG of the QR. */
async function connect(phoneNumber) {
  const query = phoneNumber ? `?number=${encodeURIComponent(phoneNumber)}` : '';
  const { data } = await client().get(`/instance/connect/${config.instance}${query}`);
  return data;
}

async function createInstance() {
  const { data } = await client().post('/instance/create', {
    instanceName: config.instance,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
    groupsIgnore: true,
    alwaysOnline: false,
    readMessages: true,
    webhook: webhookBody().webhook,
  });
  return data;
}

function webhookUrl() {
  return `${config.webhookBaseUrl}/api/v1/whatsapp/webhook/${config.webhookSecret}`;
}

function webhookBody() {
  return {
    webhook: {
      enabled: true,
      url: webhookUrl(),
      byEvents: false,
      base64: false,
      events: WEBHOOK_EVENTS,
    },
  };
}

async function setWebhook() {
  const { data } = await client().post(`/webhook/set/${config.instance}`, webhookBody());
  return data;
}

async function logout() {
  const { data } = await client().delete(`/instance/logout/${config.instance}`);
  return data;
}

module.exports = {
  sendText,
  isLinked,
  noteState,
  NotLinkedError,
  connectionState,
  connect,
  createInstance,
  setWebhook,
  logout,
  webhookUrl,
  WEBHOOK_EVENTS,
  _setHttp,
};
