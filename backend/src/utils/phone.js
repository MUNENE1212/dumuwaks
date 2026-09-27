/**
 * Phone number helpers for WhatsApp.
 *
 * Kenyan numbers arrive in every shape — 0712 345 678, +254712345678,
 * 254712345678, 712345678. WhatsApp wants digits only with the country code.
 */

const DEFAULT_CC = '254';

/**
 * Normalise to E.164 digits without '+', e.g. '254712345678'.
 * Returns null when the input cannot be a phone number.
 */
function toWhatsAppNumber(input, cc = DEFAULT_CC) {
  if (input === null || input === undefined) return null;
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = cc + digits.slice(1);
  else if (digits.length === 9 && /^[17]/.test(digits)) digits = cc + digits;

  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** Digits from a WhatsApp JID ('254712345678@s.whatsapp.net' → '254712345678'). */
function fromJid(jid) {
  if (!jid || typeof jid !== 'string') return null;
  const [user, server] = jid.split('@');
  if (!user || (server && server !== 's.whatsapp.net' && server !== 'c.us')) return null;
  return toWhatsAppNumber(user.split(':')[0]);
}

/**
 * Every stored form a user's phoneNumber could take, for lookups against
 * User.phoneNumber (which is free-form: '+2547…', '07…', '2547…').
 */
function phoneVariants(number, cc = DEFAULT_CC) {
  const n = toWhatsAppNumber(number, cc);
  if (!n) return [];
  const local = n.startsWith(cc) ? '0' + n.slice(cc.length) : null;
  return [...new Set([n, `+${n}`, local].filter(Boolean))];
}

module.exports = { toWhatsAppNumber, fromJid, phoneVariants };
