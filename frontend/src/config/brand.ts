/**
 * Brand facts for Dumuwaks. One place for the domain, contact lines and the
 * WhatsApp number every entry point uses. Values must agree with
 * brand.registry.json at the repo root.
 */

export const SITE_URL = 'https://dumuwaks.co.ke';
export const SITE_HOST = 'dumuwaks.co.ke';

export const BRAND = {
  name: 'Dumuwaks',
  /** Parent line, per the Emen brand architecture: products sit inside a line. */
  endorsement: 'An Emen Tech product',
  parentUrl: 'https://ementech.co.ke',
  legalName: 'Emen Engineering Limited',
  email: 'dumuwaks@ementech.co.ke',
  phone: '+254799954672',
  locality: 'Nairobi, Kenya',
} as const;

/** WhatsApp number linked to the Evolution API instance, digits only (E.164 without +). */
export const WHATSAPP_NUMBER: string =
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.replace(/\D/g, '') || '254799954672';

/**
 * Opens a WhatsApp chat with the Dumuwaks line. `keyword` is the first word the
 * bot understands (BOOK, STATUS, HELP, JOIN) so the conversation starts in the
 * right place without the customer typing anything.
 */
/**
 * Tell the server a WhatsApp link was tapped (POST /api/v1/track/wa, logged
 * by nginx with the page as Referer). Never throws: a ping must not be able
 * to stop someone reaching us.
 */
export function pingWhatsAppClick(): void {
  try {
    navigator.sendBeacon?.('/api/v1/track/wa');
  } catch {
    /* the link still works */
  }
}

export function whatsappLink(message = 'Hi Dumuwaks'): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_INTENTS = {
  book: 'BOOK',
  status: 'STATUS',
  help: 'HELP',
  join: 'JOIN',
} as const;
