/**
 * One-time IntaSend setup: find or create the WORKING wallet that holds escrow.
 *
 *   INTASEND_ENV=sandbox INTASEND_SECRET_KEY=... npm run payments:setup
 *
 * Prints the wallet id to put in INTASEND_ESCROW_WALLET_ID.
 */
require('dotenv').config();
const config = require('../config/payments');
const intasend = require('../services/payments/intasend.client');

const LABEL = 'DUMUWAKS-ESCROW';

(async () => {
  if (!config.secretKey) throw new Error('Set INTASEND_SECRET_KEY first');
  console.log(`IntaSend ${config.env} (${config.baseUrl})`);
  const res = await intasend.listWallets();
  const wallets = Array.isArray(res) ? res : res?.results || [];
  for (const w of wallets) {
    console.log(`  ${w.wallet_id}  ${w.wallet_type.padEnd(10)} ${w.currency} ${String(w.label).padEnd(18)} available ${w.available_balance}  can_disburse=${w.can_disburse}`);
  }
  let escrow = wallets.find((w) => w.label === LABEL && w.currency === 'KES');
  if (!escrow) {
    escrow = await intasend.createWallet({ label: LABEL, canDisburse: true });
    console.log(`Created ${LABEL}: ${escrow.wallet_id}`);
  }
  console.log(`\nINTASEND_ESCROW_WALLET_ID=${escrow.wallet_id}`);
})().catch((error) => {
  console.error(error.message, error.data || '');
  process.exit(1);
});
