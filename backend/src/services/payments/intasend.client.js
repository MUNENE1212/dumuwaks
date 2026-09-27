/**
 * IntaSend REST client.
 * Endpoints mirror the official intasend-node SDK (v1.1.2) source; the SDK
 * itself is not used because it rejects with raw buffers and has no timeouts.
 * Docs: https://developers.intasend.com
 */

const axios = require('axios');
const config = require('../../config/payments');

let http = null;
function client() {
  if (!http) {
    http = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
        ...(config.publishableKey ? { INTASEND_PUBLIC_API_KEY: config.publishableKey } : {}),
      },
    });
  }
  return http;
}

/** Test hook */
function _setHttp(instance) {
  http = instance;
}

class IntaSendError extends Error {
  constructor(message, { status, data, code } = {}) {
    super(message);
    this.name = 'IntaSendError';
    this.status = status;
    this.data = data;
    this.code = code;
  }
}

/**
 * Retry only when the request certainly did not take effect. A timeout is
 * never retried — a duplicated STK push or payout is worse than an error.
 */
function isRetryable(error) {
  if (error.response) return error.response.status === 429 || error.response.status >= 500;
  return ['ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND'].includes(error.code);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(method, url, body, { retry = true } = {}) {
  const attempts = retry ? 3 : 1;
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      // The SDK sends public_key in every body; status checks are keyed on it
      const data = body && config.publishableKey ? { ...body, public_key: config.publishableKey } : body;
      const res = await client().request({ method, url, data });
      return res.data;
    } catch (error) {
      last = error;
      if (!isRetryable(error) || i === attempts - 1) break;
      await sleep(400 * 2 ** i);
    }
  }
  const status = last.response?.status;
  const data = last.response?.data;
  const detail = data?.errors?.[0]?.detail || data?.detail || data?.message || last.message;
  throw new IntaSendError(`IntaSend ${method.toUpperCase()} ${url}: ${detail}`, { status, data, code: last.code });
}

const money = (n) => Number(Number(n).toFixed(2));

// ---- collections -----------------------------------------------------------

/** STK push straight into a wallet. Returns { invoice: { invoice_id, state, ... }, ... }. */
function stkPush({ amount, phone, apiRef, walletId, narrative, email }) {
  return request(
    'post',
    '/api/v1/payment/mpesa-stk-push/',
    {
      amount: money(amount),
      phone_number: phone,
      api_ref: apiRef,
      wallet_id: walletId,
      narrative,
      email,
      method: 'M-PESA',
      currency: config.currency,
    },
    // A retried STK push would prompt the customer twice
    { retry: false }
  );
}

/** Authoritative collection status: { invoice: { state, value, net_amount, charges, api_ref, ... } } */
function collectionStatus(invoiceId) {
  return request('post', '/api/v1/payment/status/', { invoice_id: invoiceId });
}

// ---- wallets -----------------------------------------------------------------

const listWallets = () => request('get', '/api/v1/wallets/');
const getWallet = (walletId) => request('get', `/api/v1/wallets/${walletId}/`);
const walletTransactions = (walletId) => request('get', `/api/v1/wallets/${walletId}/transactions/`);

function createWallet({ label, canDisburse = true }) {
  return request('post', '/api/v1/wallets/', { wallet_type: 'WORKING', currency: config.currency, label, can_disburse: canDisburse });
}

function intraTransfer({ from, to, amount, narrative }) {
  return request(
    'post',
    `/api/v1/wallets/${from}/intra_transfer/`,
    { wallet_id: to, amount: money(amount), narrative },
    { retry: false }
  );
}

// ---- send money ----------------------------------------------------------------

/**
 * One payout. `destination` is { method: 'mpesa', phone } or
 * { method: 'bank', bankCode, accountNumber, accountName }.
 * Returns { tracking_id, status, ... }.
 */
function sendMoney({ destination, amount, name, narrative, walletId, idempotencyKey }) {
  const isBank = destination.method === 'bank';
  const transaction = {
    name,
    account: isBank ? destination.accountNumber : destination.phone,
    amount: money(amount),
    narrative,
    ...(isBank ? { bank_code: destination.bankCode } : {}),
    ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
  };
  return request(
    'post',
    '/api/v1/send-money/initiate/',
    {
      provider: isBank ? 'PESALINK' : 'MPESA-B2C',
      currency: config.currency,
      requires_approval: 'NO',
      wallet_id: walletId,
      transactions: [transaction],
    },
    { retry: false }
  );
}

const sendMoneyStatus = (trackingId) => request('post', '/api/v1/send-money/status/', { tracking_id: trackingId });

const bankCodes = () => request('get', '/api/v1/send-money/bank-codes/ke/');

module.exports = {
  stkPush,
  collectionStatus,
  listWallets,
  getWallet,
  walletTransactions,
  createWallet,
  intraTransfer,
  sendMoney,
  sendMoneyStatus,
  bankCodes,
  IntaSendError,
  _setHttp,
};
