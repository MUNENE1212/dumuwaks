const os = require('os');
const JobLock = require('../models/JobLock');

const owner = `${os.hostname()}:${process.pid}`;

/**
 * Run `fn` only if no other process holds the lock `name`. The lock expires
 * after `ttlMs` so a crashed worker cannot block the job forever.
 */
async function withLock(name, ttlMs, fn) {
  const now = new Date();
  let acquired = false;
  try {
    const doc = await JobLock.findOneAndUpdate(
      { name, $or: [{ lockedUntil: { $lt: now } }, { lockedUntil: { $exists: false } }] },
      { $set: { owner, lockedUntil: new Date(now.getTime() + ttlMs) } },
      { upsert: true, new: true }
    );
    acquired = doc?.owner === owner;
  } catch (error) {
    if (error.code === 11000) return { skipped: true }; // held by someone else
    throw error;
  }
  if (!acquired) return { skipped: true };
  try {
    return { result: await fn() };
  } finally {
    await JobLock.updateOne({ name, owner }, { $set: { lockedUntil: new Date(0) } }).catch(() => {});
  }
}

module.exports = { withLock };
