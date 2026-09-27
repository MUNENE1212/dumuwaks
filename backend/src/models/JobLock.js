const mongoose = require('mongoose');

/** Cross-process lock so scheduled jobs run once across PM2 cluster workers. */
const JobLockSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  owner: String,
  lockedUntil: Date,
});

module.exports = mongoose.model('JobLock', JobLockSchema);
