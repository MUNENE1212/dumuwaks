/**
 * Support-desk operations on WhatsApp requests.
 */

const WhatsAppRequest = require('../../models/WhatsAppRequest');

async function counts() {
  const [open, inProgress] = await Promise.all([
    WhatsAppRequest.countDocuments({ status: 'open' }),
    WhatsAppRequest.countDocuments({ status: 'in_progress' }),
  ]);
  return { open, inProgress };
}

async function listRequests({ status, kind, page = 1, limit = 25 } = {}) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, parseInt(limit, 10) || 25);
  const filter = {};
  if (status) filter.status = { $in: String(status).split(',') };
  if (kind) filter.kind = kind;

  const [items, total] = await Promise.all([
    WhatsAppRequest.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'firstName lastName email role')
      .populate('assignedTo', 'firstName lastName')
      .lean(),
    WhatsAppRequest.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) };
}

/** Returns the updated request, or null when it does not exist. */
async function updateRequest(id, { status, assignToMe, booking, note }, userId) {
  const request = await WhatsAppRequest.findById(id);
  if (!request) return null;
  if (status) request.status = status;
  if (assignToMe) request.assignedTo = userId;
  if (booking) {
    request.booking = booking;
    request.status = 'converted';
  }
  if (note) request.notes.push({ by: userId, text: note });
  await request.save();
  return request;
}

async function logDeskReply(requestId, userId, text) {
  if (!requestId) return;
  await WhatsAppRequest.updateOne(
    { _id: requestId },
    { $push: { notes: { by: userId, text: `→ ${text}` } }, $set: { status: 'in_progress' } }
  );
}

module.exports = { counts, listRequests, updateRequest, logDeskReply };
