/**
 * Payments configuration — IntaSend (collections + escrow wallet + payouts).
 * See docs/PAYMENTS.md.
 */

const env = process.env;

const intasendEnv = env.INTASEND_ENV === 'live' ? 'live' : 'sandbox';

const config = {
  enabled: env.PAYMENTS_ENABLED === 'true',
  env: intasendEnv,
  baseUrl:
    // INTASEND_BASE_URL points at a local fake for end-to-end tests; refused in production (assertSafe)
    env.INTASEND_BASE_URL || (intasendEnv === 'live' ? 'https://payment.intasend.com' : 'https://sandbox.intasend.com'),
  publishableKey: env.INTASEND_PUBLISHABLE_KEY || '',
  secretKey: env.INTASEND_SECRET_KEY || '',
  /** Shared secret set on the IntaSend dashboard webhook; sent back as `challenge` on every event. */
  webhookChallenge: env.INTASEND_WEBHOOK_CHALLENGE || '',
  /** WORKING wallet that holds every shilling in escrow (npm run payments:setup creates it). */
  escrowWalletId: env.INTASEND_ESCROW_WALLET_ID || '',
  /** Payouts above this (KES) wait for an admin. */
  payoutApprovalThreshold: Number(env.PAYOUT_APPROVAL_THRESHOLD) || 50000,
  /** Payouts to a destination changed more recently than this are held. */
  destinationCoolingMs: 24 * 60 * 60 * 1000,
  /** Who absorbs IntaSend's collection and payout charges. Decided: the platform. */
  chargeBearer: env.PAYOUT_CHARGE_BEARER || 'platform',
  /** An STK push nobody answered is re-checked after this long. */
  collectionPollAfterMs: 90 * 1000,
  /** Smallest job the platform accepts: below this, IntaSend charges exceed the platform fee. */
  minJobAmount: Number(env.MIN_JOB_AMOUNT) || 500,
  currency: 'KES',
};

config.isConfigured = () => Boolean(config.enabled && config.secretKey && config.escrowWalletId);

/** Refuse sandbox keys in production and live keys outside it. */
config.assertSafe = () => {
  if (!config.enabled) return;
  const isProd = env.NODE_ENV === 'production';
  const keyIsTest = /test/i.test(config.secretKey);
  if (isProd && (config.env !== 'live' || keyIsTest) && env.ALLOW_SANDBOX_PAYMENTS_IN_PROD !== 'true') {
    throw new Error(
      'PAYMENTS: production must use INTASEND_ENV=live with live keys (set ALLOW_SANDBOX_PAYMENTS_IN_PROD=true only for a supervised test)'
    );
  }
  if (isProd && env.INTASEND_BASE_URL) {
    throw new Error('PAYMENTS: INTASEND_BASE_URL override is for local testing only');
  }
  if (!isProd && config.env === 'live' && env.ALLOW_LIVE_PAYMENTS_OUTSIDE_PROD !== 'true') {
    throw new Error('PAYMENTS: live IntaSend keys outside production are refused');
  }
};

module.exports = config;
