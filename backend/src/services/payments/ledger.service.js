/**
 * Append-only escrow ledger. See models/LedgerEntry.js for the sign convention.
 */

const mongoose = require('mongoose');
const LedgerEntry = require('../../models/LedgerEntry');

const round = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Post one entry. Posting the same idempotencyKey again returns the existing
 * entry instead of writing a second one, so webhooks and pollers can race.
 */
async function post({ escrow, booking, kind, amount, providerRef, payout, idempotencyKey, note }) {
  const direction = LedgerEntry.KINDS[kind];
  if (!direction) throw new Error(`Unknown ledger kind: ${kind}`);
  const value = round(amount);
  if (!(value >= 0)) throw new Error(`Invalid ledger amount: ${amount}`);
  if (value === 0) return null; // nothing moved (e.g. zero charges)

  try {
    return await LedgerEntry.create({
      escrow,
      booking,
      kind,
      direction,
      amount: value,
      providerRef,
      payout,
      idempotencyKey,
      note,
    });
  } catch (error) {
    if (error.code === 11000) return LedgerEntry.findOne({ idempotencyKey });
    throw error;
  }
}

async function totalsFor(match) {
  const rows = await LedgerEntry.aggregate([
    { $match: match },
    { $group: { _id: '$direction', total: { $sum: '$amount' } } },
  ]);
  const inn = rows.find((r) => r._id === 'in')?.total || 0;
  const out = rows.find((r) => r._id === 'out')?.total || 0;
  return { in: round(inn), out: round(out), held: round(inn - out) };
}

/** Money currently held for one escrow. */
function balance(escrowId) {
  return totalsFor({ escrow: new mongoose.Types.ObjectId(String(escrowId)) });
}

/** Money held across every escrow — must equal the escrow wallet balance. */
function totalHeld() {
  return totalsFor({});
}

function entries(escrowId) {
  return LedgerEntry.find({ escrow: escrowId }).sort({ at: 1 }).lean();
}

module.exports = { post, balance, totalHeld, entries, round };
