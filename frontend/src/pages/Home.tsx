import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, Zap, Hammer, BrickWall, Paintbrush, AirVent, Flame, Wrench, Check } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { WhatsAppGlyph } from '@/components/common/WhatsAppButton';
import { whatsappLink, WHATSAPP_INTENTS } from '@/config/brand';

/* Categories mirror Booking.serviceCategory in the backend model. */
const CATEGORIES = [
  { key: 'plumbing', label: 'Plumbing', sw: 'Fundi bomba', icon: Droplets },
  { key: 'electrical', label: 'Electrical', sw: 'Fundi umeme', icon: Zap },
  { key: 'carpentry', label: 'Carpentry', sw: 'Seremala', icon: Hammer },
  { key: 'masonry', label: 'Masonry', sw: 'Mwashi', icon: BrickWall },
  { key: 'painting', label: 'Painting', sw: 'Fundi rangi', icon: Paintbrush },
  { key: 'hvac', label: 'AC & fridges', sw: 'Friji na AC', icon: AirVent },
  { key: 'welding', label: 'Welding', sw: 'Fundi wa kuchomelea', icon: Flame },
  { key: 'other', label: 'Something else', sw: 'Kazi nyingine', icon: Wrench },
];

const STEPS = [
  {
    n: '01',
    title: 'Say what needs fixing',
    body: 'Pick the job, add a photo if you have one, and drop your location. Two minutes on the web or one message on WhatsApp.',
  },
  {
    n: '02',
    title: 'Choose your technician',
    body: 'See technicians near you with their ratings, finished jobs, price range and whether their ID is verified, before you commit.',
  },
  {
    n: '03',
    title: 'Pay when it works',
    body: 'Pay by M-Pesa. The money is held until you confirm the job is done, then released to the technician.',
  },
];

/* Every figure here comes from backend/src/config/fees.js. Change them together. */
const FACTS = [
  {
    value: 'Held',
    unit: '',
    label: 'Your M-Pesa payment',
    note: 'Released only after you confirm the job, or 3 days after completion if you raise nothing.',
  },
  {
    value: '0',
    unit: '%',
    label: 'Cancellation fee',
    note: 'When you cancel more than 24 hours ahead. Tiers rise to 75% inside 2 hours.',
  },
  {
    value: '7',
    unit: 'days',
    label: 'Dispute hold',
    note: 'Funds stay frozen while a disagreement is reviewed. Nobody is paid until it is settled.',
  },
  {
    value: '14',
    unit: 'days',
    label: 'Auto-refund',
    note: 'If a paid job never starts, the money comes back to you.',
  },
];

const EXAMPLE_TIMELINE = [
  { label: 'Matched', time: '09:12', done: true },
  { label: 'Accepted', time: '09:15', done: true },
  { label: 'En route', time: '09:41', done: true, live: true },
  { label: 'Work done', time: '—', done: false },
  { label: 'Paid', time: '—', done: false },
];

const Section: React.FC<{
  id?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ id, className = '', children }) => (
  <section id={id} className={`px-4 sm:px-6 ${className}`}>
    <div className="mx-auto max-w-[1200px]">{children}</div>
  </section>
);

const Home: React.FC = () => {
  return (
    <div>
      {/* ------------------------------------------------------------
          1 · Promise
          ------------------------------------------------------------ */}
      <Section className="border-b border-line bg-surface-000 py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="eyebrow">Repairs · Kenya</p>
            <h1 className="mt-5 font-display text-[44px] font-extrabold leading-[46px] tracking-[-0.025em] text-ink sm:text-hero">
              Work that lasts.
              <span className="block text-ink-muted">Kazi ya kudumu.</span>
            </h1>
            <p className="mt-6 max-w-[34rem] text-lead text-ink-muted">
              Book a plumber, electrician or fundi you can check before they arrive. Pay by M-Pesa — we hold the money
              until you say the job is done.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/booking-flow" className="btn btn-primary btn-lg">
                Book a technician
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href={whatsappLink(WHATSAPP_INTENTS.book)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-lg"
              >
                <WhatsAppGlyph className="h-5 w-5 text-whatsapp" />
                Book on WhatsApp
              </a>
            </div>
            <p className="mt-5 text-body-sm text-ink-faint">No app to install. No account needed on WhatsApp.</p>
          </div>

          {/* Example booking — shows the product, labelled as an example. Hidden on phones so the category picker is one scroll away. */}
          <div className="relative hidden sm:block">
            <div className="rounded-lg border border-line bg-surface-100">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div className="flex items-center gap-3">
                  <BrandMark size={36} />
                  <div>
                    <p className="eyebrow">Example booking</p>
                    <p className="font-mono text-spec text-ink">DW-2410-0187</p>
                  </div>
                </div>
                <span className="chip bg-circuit/10 text-circuit-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-circuit" />
                  En route
                </span>
              </div>
              <dl className="grid grid-cols-2 border-b border-line">
                <div className="border-r border-line px-5 py-4">
                  <dt className="eyebrow">Job</dt>
                  <dd className="mt-1 text-body-sm text-ink">Burst pipe, kitchen</dd>
                </div>
                <div className="px-5 py-4">
                  <dt className="eyebrow">Area</dt>
                  <dd className="mt-1 text-body-sm text-ink">Kilimani, Nairobi</dd>
                </div>
                <div className="border-r border-t border-line px-5 py-4">
                  <dt className="eyebrow">Quoted</dt>
                  <dd className="mt-1 font-mono text-spec text-ink">KES 2,500</dd>
                </div>
                <div className="border-t border-line px-5 py-4">
                  <dt className="eyebrow">Held by Dumuwaks</dt>
                  <dd className="mt-1 font-mono text-spec text-lumen-ink">KES 2,500</dd>
                </div>
              </dl>
              <ol className="px-5 py-5">
                {EXAMPLE_TIMELINE.map((s, i) => (
                  <li key={s.label} className="relative flex items-center gap-4 pb-4 last:pb-0">
                    {i < EXAMPLE_TIMELINE.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[7px] top-4 h-full w-px ${s.done ? 'bg-lumen' : 'bg-line-strong'}`}
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-[15px] w-[15px] items-center justify-center ${
                        s.live ? 'bg-circuit' : s.done ? 'bg-lumen' : 'border border-line-strong bg-surface-100'
                      }`}
                    >
                      {s.done && !s.live && <Check className="h-2.5 w-2.5 text-on-lumen" strokeWidth={3} />}
                    </span>
                    <span className={`flex-1 text-body-sm ${s.done ? 'text-ink' : 'text-ink-faint'}`}>{s.label}</span>
                    <span className="font-mono text-caption text-ink-faint">{s.time}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="ramp mt-3" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------
          2 · What needs fixing — one tap into the booking flow
          ------------------------------------------------------------ */}
      <Section className="py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Start here</p>
            <h2 className="mt-3 text-title">What needs fixing?</h2>
          </div>
          <Link to="/find-technicians" className="text-body-sm font-medium text-lumen-ink hover:underline">
            Browse all technicians →
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
          {CATEGORIES.map(({ key, label, sw, icon: Icon }) => (
            <li key={key}>
              <Link
                to="/booking-flow"
                state={{ serviceCategory: key }}
                className="group flex h-full min-h-[132px] flex-col justify-between bg-surface-100 p-5 transition-colors hover:bg-surface-200"
              >
                <Icon
                  className="h-6 w-6 text-ink-muted transition-colors group-hover:text-lumen-ink"
                  strokeWidth={1.75}
                />
                <span>
                  <span className="block font-display text-[17px] font-bold text-ink">{label}</span>
                  <span className="block text-caption text-ink-faint">{sw}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* ------------------------------------------------------------
          3 · How it works
          ------------------------------------------------------------ */}
      <Section className="border-t border-line bg-surface-000 py-16 sm:py-20">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-xl text-title">Three steps. Your money moves only at the last.</h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="bg-surface-000 p-6 sm:p-8">
              <span className="font-mono text-[40px] leading-none text-lumen">{s.n}</span>
              <h3 className="mt-6 text-heading">{s.title}</h3>
              <p className="mt-3 text-body text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ------------------------------------------------------------
          4 · The money, in numbers
          ------------------------------------------------------------ */}
      <Section className="py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow">Your money</p>
            <h2 className="mt-3 text-title">Nobody gets paid for a job that isn’t done.</h2>
            <p className="mt-4 text-body text-ink-muted">
              Every payment goes through Dumuwaks escrow by M-Pesa. These are the rules, as the system runs them.
            </p>
            <Link
              to="/how-it-works"
              className="mt-6 inline-flex text-body-sm font-medium text-lumen-ink hover:underline"
            >
              Read the full rules →
            </Link>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
            {FACTS.map((f) => (
              <div key={f.label} className="bg-surface-100 p-6">
                <dt className="eyebrow">{f.label}</dt>
                <dd className="mt-3">
                  <span className="font-mono text-[34px] leading-none text-ink">{f.value}</span>
                  {f.unit && <span className="ml-1.5 font-mono text-spec text-ink-muted">{f.unit}</span>}
                  <p className="mt-3 text-body-sm text-ink-muted">{f.note}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* ------------------------------------------------------------
          5 · WhatsApp — the heritage band
          ------------------------------------------------------------ */}
      <Section className="border-y border-line bg-mahogany py-16 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">WhatsApp</p>
            <h2 className="mt-3 text-title">Book without leaving WhatsApp.</h2>
            <p className="mt-4 max-w-md text-body text-ink-muted">
              Send <span className="font-mono text-ink">BOOK</span> and answer a few questions. Send{' '}
              <span className="font-mono text-ink">STATUS</span> any time to see where your technician is. Booking
              updates and M-Pesa receipts arrive in the same chat.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappLink(WHATSAPP_INTENTS.book)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-lg"
              >
                <WhatsAppGlyph className="h-5 w-5" />
                Open WhatsApp
              </a>
              <Link to="/whatsapp-support" className="btn btn-outline btn-lg">
                See the commands
              </Link>
            </div>
          </div>

          <figure
            aria-label="Example WhatsApp conversation"
            className="rounded-lg border border-line bg-surface-100 p-4 sm:p-5"
          >
            <figcaption className="eyebrow mb-4">Example conversation</figcaption>
            <div className="space-y-2.5 text-body-sm">
              <p className="ml-auto w-fit max-w-[80%] rounded-md bg-ok-900 px-3 py-2 font-mono text-ink">BOOK</p>
              <p className="w-fit max-w-[85%] rounded-md bg-surface-300 px-3 py-2 text-ink">
                Karibu Dumuwaks. What needs fixing?
                <br />
                <span className="font-mono text-ink-muted">1</span> Plumbing{' '}
                <span className="font-mono text-ink-muted">2</span> Electrical{' '}
                <span className="font-mono text-ink-muted">3</span> Carpentry …
              </p>
              <p className="ml-auto w-fit max-w-[80%] rounded-md bg-ok-900 px-3 py-2 font-mono text-ink">1</p>
              <p className="w-fit max-w-[85%] rounded-md bg-surface-300 px-3 py-2 text-ink">
                Where are you? Send your location pin or type the area.
              </p>
              <p className="ml-auto w-fit max-w-[80%] rounded-md bg-ok-900 px-3 py-2 text-ink">Kilimani, near Yaya</p>
              <p className="w-fit max-w-[85%] rounded-md bg-surface-300 px-3 py-2 text-ink">
                Got it. Request <span className="font-mono text-lumen-ink">DW-2410-0187</span> is open — we’ll message
                you here when a technician accepts.
              </p>
            </div>
          </figure>
        </div>
      </Section>

      {/* ------------------------------------------------------------
          6 · Technicians
          ------------------------------------------------------------ */}
      <Section className="py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow">For technicians</p>
            <h2 className="mt-3 text-title">Your skill. Your customers. Paid by M-Pesa.</h2>
            <p className="mt-4 max-w-lg text-body text-ink-muted">
              Get jobs near you, quote your own price, and get paid to M-Pesa as soon as the customer confirms. Job
              offers reach you on WhatsApp, so you don’t miss one while you’re on site.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register?role=technician" className="btn btn-primary btn-lg">
                Join as a technician
              </Link>
              <a
                href={whatsappLink(WHATSAPP_INTENTS.join)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-lg"
              >
                Or send JOIN on WhatsApp
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-md border border-line">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">What a technician keeps</caption>
              <tbody className="font-mono text-spec">
                {[
                  ['You keep', '91.3%', 'of every job, after the fee and its VAT'],
                  ['Platform fee', '7.5% + VAT', 'fee min KES 50 · max KES 5,000'],
                  ['Payout', 'M-Pesa', 'on confirmation, or 3 days after'],
                ].map(([k, v, n]) => (
                  <tr key={k} className="border-b border-line last:border-b-0">
                    <th scope="row" className="eyebrow w-32 bg-surface-000 px-5 py-4 align-top font-medium">
                      {k}
                    </th>
                    <td className="bg-surface-100 px-5 py-4">
                      <span className="block text-ink">{v}</span>
                      <span className="block font-sans text-caption text-ink-muted">{n}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------
          7 · Close
          ------------------------------------------------------------ */}
      <Section className="border-t border-line bg-surface-000 py-14">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <BrandMark size={56} />
            <p className="max-w-md font-display text-heading text-ink">
              Something broken today? Tell us, and choose who comes.
            </p>
          </div>
          <Link to="/booking-flow" className="btn btn-primary btn-lg shrink-0">
            Book a technician
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </Section>
    </div>
  );
};

export default Home;
