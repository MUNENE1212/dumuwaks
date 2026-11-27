/**
 * Traction Service
 *
 * The handful of numbers that show whether DumuWaks is working, computed from
 * data the platform already records (no extra tracking):
 *
 * - technicians registered / verified (admin checked their ID)
 * - customers registered
 * - completed jobs, per week
 * - repeat customer rate: customers with 2+ completed jobs ÷ customers with 1+
 * - in-app payment share: completed jobs whose money went through escrow
 * - platform revenue per month (admin only)
 *
 * Weeks start on Monday 00:00 East Africa Time (UTC+3).
 * The maths lives in small pure functions so it can be tested without a database.
 */

const Booking = require('../models/Booking');
const User = require('../models/User');
const Escrow = require('../models/Escrow');
const LedgerEntry = require('../models/LedgerEntry');

// Statuses that mean the technician finished the work
const COMPLETED_STATUSES = ['completed', 'verified', 'payment_pending', 'paid'];

// Escrow statuses that mean the customer's money actually reached escrow
const FUNDED_ESCROW_STATUSES = [
  'funded',
  'partial_release',
  'release_pending',
  'released',
  'partially_refunded',
];

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// ---------- pure helpers (exported for tests) ----------

/**
 * Start of the week (Monday 00:00 EAT) that contains `date`, as a UTC Date.
 */
function weekStart(date) {
  const eat = new Date(new Date(date).getTime() + EAT_OFFSET_MS);
  const daysSinceMonday = (eat.getUTCDay() + 6) % 7;
  const mondayEat = Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate()) - daysSinceMonday * DAY_MS;
  return new Date(mondayEat - EAT_OFFSET_MS);
}

/**
 * The last `count` week starts up to and including the week of `now`, oldest first.
 */
function lastWeekStarts(now, count) {
  const current = weekStart(now).getTime();
  const weeks = [];
  for (let i = count - 1; i >= 0; i--) {
    weeks.push(new Date(current - i * WEEK_MS));
  }
  return weeks;
}

/**
 * Count dates into the given weeks. Dates outside the range are ignored.
 * Returns [{ weekStart: 'YYYY-MM-DD' (EAT), count }].
 */
function countByWeek(dates, weeks) {
  const counts = new Map(weeks.map((w) => [w.getTime(), 0]));
  for (const date of dates) {
    if (!date) continue;
    const key = weekStart(date).getTime();
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + 1);
    }
  }
  return weeks.map((w) => ({
    weekStart: new Date(w.getTime() + EAT_OFFSET_MS).toISOString().slice(0, 10),
    count: counts.get(w.getTime()),
  }));
}

/**
 * Share as a number between 0 and 1, rounded to 3 places; null when there is no base.
 */
function share(part, whole) {
  if (!whole) return null;
  return Math.round((part / whole) * 1000) / 1000;
}

/**
 * Repeat rate from a list of "completed jobs per customer" counts.
 */
function repeatRate(jobsPerCustomer) {
  const withOne = jobsPerCustomer.filter((n) => n >= 1).length;
  const withTwo = jobsPerCustomer.filter((n) => n >= 2).length;
  return share(withTwo, withOne);
}

// ---------- database queries ----------

/**
 * Compute traction numbers.
 *
 * @param {Object} options
 * @param {number} [options.weeks=12] - how many weeks of history
 * @param {Date} [options.now=new Date()]
 * @param {boolean} [options.includeRevenue=false] - admin only
 */
async function getTraction({ weeks = 12, now = new Date(), includeRevenue = false } = {}) {
  const weekList = lastWeekStarts(now, weeks);
  const windowStart = weekList[0];

  const [registeredTechnicians, verifiedTechnicians, registeredCustomers] = await Promise.all([
    User.countDocuments({ role: 'technician', deletedAt: null }),
    User.countDocuments({ role: 'technician', deletedAt: null, 'kyc.verified': true }),
    User.countDocuments({ role: 'customer', deletedAt: null }),
  ]);

  // All completed jobs, lean and with only the fields we need
  const completed = await Booking.find(
    { status: { $in: COMPLETED_STATUSES } },
    { _id: 1, customer: 1, actualEndTime: 1, updatedAt: 1 }
  ).lean();

  const finishedAt = (b) => b.actualEndTime || b.updatedAt;

  const jobsPerWeek = countByWeek(completed.map(finishedAt), weekList);

  const jobsByCustomer = new Map();
  for (const b of completed) {
    const key = String(b.customer);
    jobsByCustomer.set(key, (jobsByCustomer.get(key) || 0) + 1);
  }

  const inWindow = completed.filter((b) => new Date(finishedAt(b)) >= windowStart);
  const paidInApp = inWindow.length
    ? await Escrow.countDocuments({
        booking: { $in: inWindow.map((b) => b._id) },
        status: { $in: FUNDED_ESCROW_STATUSES },
      })
    : 0;

  const result = {
    asOf: now.toISOString(),
    weeks,
    technicians: { registered: registeredTechnicians, verified: verifiedTechnicians },
    customers: { registered: registeredCustomers },
    completedJobs: { total: completed.length, inWindow: inWindow.length, perWeek: jobsPerWeek },
    repeatCustomerRate: repeatRate([...jobsByCustomer.values()]),
    inAppPaymentShare: share(paidInApp, inWindow.length),
  };

  if (includeRevenue) {
    result.platformRevenueByMonth = await getPlatformRevenueByMonth(now, 6);
  }

  return result;
}

/**
 * Platform revenue (ledger `platform_share` entries) per calendar month, KES.
 */
async function getPlatformRevenueByMonth(now, months) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const rows = await LedgerEntry.aggregate([
    { $match: { kind: 'platform_share', createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+03:00' } },
        amount: { $sum: '$amount' },
      },
    },
  ]);
  const byMonth = new Map(rows.map((r) => [r._id, r.amount]));

  const result = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = d.toISOString().slice(0, 7);
    result.push({ month: key, amountKes: byMonth.get(key) || 0 });
  }
  return result;
}

module.exports = {
  getTraction,
  // exported for tests
  weekStart,
  lastWeekStarts,
  countByWeek,
  share,
  repeatRate,
  COMPLETED_STATUSES,
  FUNDED_ESCROW_STATUSES,
};
