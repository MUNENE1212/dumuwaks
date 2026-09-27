import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateQRCode } from '@/lib/qrcode';
import { WhatsAppGlyph } from '@/components/common/WhatsAppButton';
import { whatsappLink, WHATSAPP_INTENTS, WHATSAPP_NUMBER } from '@/config/brand';

/**
 * Public page: how to book and follow a job on WhatsApp.
 * The commands listed here are the ones backend/src/services/whatsapp/bot.service.js handles.
 */

const COMMANDS = [
  { word: 'BOOK', does: 'Starts a booking. You pick the job, describe it, send your location, and say when.' },
  { word: 'STATUS', does: 'Shows your open bookings: who is coming, and where the job stands.' },
  { word: 'HELP', does: 'Hands the chat to a person on the Dumuwaks team.' },
  { word: 'JOIN', does: 'For technicians: how to register and start receiving jobs here.' },
  { word: 'MENU', does: 'Back to the start, from anywhere.' },
  { word: 'STOP', does: 'No more booking updates on WhatsApp. Send START to turn them back on.' },
];

const UPDATES = [
  'A technician accepts your job — with their name',
  'They are on the way, and when they arrive',
  'The work is marked done and waits for your confirmation',
  'Your M-Pesa payment is received, and when it is released',
];

const phoneDisplay = `+${WHATSAPP_NUMBER.replace(/^(\d{3})(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4')}`;

const WhatsAppSupport = () => {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    generateQRCode(whatsappLink(WHATSAPP_INTENTS.book), {
      width: 360,
      margin: 1,
      color: { dark: '#14110c', light: '#f5eee1' },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, []);

  return (
    <div>
      <section className="border-b border-line bg-surface-000 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="eyebrow">WhatsApp</p>
            <h1 className="mt-4 font-display text-[40px] font-extrabold leading-[42px] tracking-[-0.02em] sm:text-display">
              Book a technician without leaving WhatsApp.
            </h1>
            <p className="mt-5 max-w-xl text-lead text-ink-muted">
              Message <span className="font-mono text-ink">{phoneDisplay}</span>. No app, no password. Booking updates and
              M-Pesa receipts arrive in the same chat.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappLink(WHATSAPP_INTENTS.book)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-lg">
                <WhatsAppGlyph className="h-5 w-5" />
                Open WhatsApp
              </a>
              <Link to="/booking-flow" className="btn btn-outline btn-lg">
                Book on the web instead
              </Link>
            </div>
          </div>

          <figure className="hidden justify-self-center rounded-lg border border-line bg-surface-100 p-5 sm:block">
            {qr ? (
              <img src={qr} alt="QR code that opens a WhatsApp chat with Dumuwaks" width={240} height={240} />
            ) : (
              <div className="h-[240px] w-[240px] shimmer" />
            )}
            <figcaption className="eyebrow mt-4 text-center">Scan with your phone camera</figcaption>
          </figure>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow">What to send</p>
            <h2 className="mt-3 text-title">Six words cover everything.</h2>
            <p className="mt-3 text-body text-ink-muted">
              Or just describe the problem — “my kitchen sink is leaking” works too.
            </p>
            <table className="mt-8 w-full border-collapse text-left">
              <tbody>
                {COMMANDS.map((c) => (
                  <tr key={c.word} className="border-t border-line last:border-b">
                    <th scope="row" className="w-32 py-4 pr-4 align-top">
                      <a
                        href={whatsappLink(c.word)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-spec font-medium text-lumen-ink hover:underline"
                      >
                        {c.word}
                      </a>
                    </th>
                    <td className="py-4 text-body text-ink">{c.does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="self-start rounded-md border border-line bg-surface-200 p-6">
            <p className="eyebrow">You’ll get a message when</p>
            <ul className="mt-4 space-y-3">
              {UPDATES.map((u) => (
                <li key={u} className="flex gap-3 text-body-sm text-ink">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-lumen" />
                  {u}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-line pt-4 text-caption text-ink-muted">
              Updates go to the phone number on your Dumuwaks account. Turn them off any time with STOP, or in{' '}
              <Link to="/settings" className="text-lumen-ink hover:underline">
                settings
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default WhatsAppSupport;
