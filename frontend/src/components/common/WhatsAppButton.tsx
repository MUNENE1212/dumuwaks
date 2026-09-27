import { useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { whatsappLink, WHATSAPP_INTENTS } from '@/config/brand';

/**
 * Floating WhatsApp entry. Each choice opens WhatsApp with the keyword the
 * Dumuwaks bot understands, so the customer never types a command.
 */
const CHOICES = [
  { label: 'Book a technician', hint: 'Tell us the job and the area', message: WHATSAPP_INTENTS.book },
  { label: 'Check my booking', hint: 'Status, technician, arrival', message: WHATSAPP_INTENTS.status },
  { label: 'Talk to a person', hint: 'Reach the Dumuwaks team', message: WHATSAPP_INTENTS.help },
];

export const WhatsAppGlyph = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2Zm5.8 14.06c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.93-4.66-4.11-.13-.18-1.11-1.48-1.11-2.83 0-1.34.7-2 .95-2.28.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.46.23.54.77 1.87.84 2 .07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.7 1.16 1.51 1.88 1.04.93 1.92 1.21 2.19 1.35.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.33Z" />
  </svg>
);

const WhatsAppButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="whatsapp-float fixed bottom-5 right-4 z-50 sm:right-6">
      {open && (
        <div
          role="dialog"
          aria-label="Continue on WhatsApp"
          className="mb-3 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line-strong bg-surface-200 shadow-float animate-scale-in"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="eyebrow">WhatsApp</p>
              <p className="mt-1 text-body-sm text-ink">What do you need?</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-300 hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul>
            {CHOICES.map((c) => (
              <li key={c.message} className="border-b border-line last:border-b-0">
                <a
                  href={whatsappLink(c.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-300"
                >
                  <span>
                    <span className="block text-body-sm font-medium text-ink">{c.label}</span>
                    <span className="block text-caption text-ink-muted">{c.hint}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-ink-muted group-hover:text-lumen-ink" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-end">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-12 items-center gap-2 rounded-md bg-whatsapp pl-3.5 pr-4 font-semibold text-surface-000 shadow-float hover:brightness-110"
          aria-expanded={open}
          aria-label="Chat on WhatsApp"
        >
          <WhatsAppGlyph />
          <span className="hidden text-body-sm sm:inline">WhatsApp</span>
        </button>
      </div>
    </div>
  );
};

export default WhatsAppButton;
