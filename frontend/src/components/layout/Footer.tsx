import { Link } from 'react-router-dom';
import { BrandLockup } from '../brand/BrandMark';
import { BRAND, SITE_HOST, whatsappLink } from '@/config/brand';

const COLUMNS: { title: string; links: { label: string; to: string; external?: boolean }[] }[] = [
  {
    title: 'Customers',
    links: [
      { label: 'Book a technician', to: '/booking-flow' },
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Book on WhatsApp', to: '/whatsapp-support' },
      { label: 'Questions', to: '/faq' },
    ],
  },
  {
    title: 'Technicians',
    links: [
      { label: 'Join Dumuwaks', to: '/register?role=technician' },
      { label: 'Install the app', to: '/install-app' },
      { label: 'Careers', to: '/careers' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
    ],
  },
];

const Footer = () => {
  const year = new Date().getFullYear();
  const phoneDisplay = BRAND.phone.replace(/^\+254(\d{3})(\d{3})(\d{3})$/, '+254 $1 $2 $3');

  return (
    <footer className="mt-auto border-t border-line bg-surface-000">
      <div className="ramp" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:py-14">
        <div className="col-span-2 max-w-xs sm:col-span-3 lg:col-span-1">
          <BrandLockup size={40} />
          <p className="mt-5 text-body-sm text-ink-muted">
            Book technicians across Kenya on the web or on WhatsApp, pay by M-Pesa, and your money is held
            until the job is done.
          </p>
          <dl className="mt-6 space-y-2 font-mono text-spec text-ink">
            <div className="flex gap-3">
              <dt className="eyebrow w-16 pt-0.5">Call</dt>
              <dd>
                <a href={`tel:${BRAND.phone}`} className="hover:text-lumen-ink">
                  {phoneDisplay}
                </a>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="eyebrow w-16 pt-0.5">Chat</dt>
              <dd>
                <a href={whatsappLink('HELP')} target="_blank" rel="noopener noreferrer" className="hover:text-lumen-ink">
                  WhatsApp
                </a>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="eyebrow w-16 pt-0.5">Mail</dt>
              <dd>
                <a href={`mailto:${BRAND.email}`} className="break-all hover:text-lumen-ink">
                  {BRAND.email}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="eyebrow mb-4">{col.title}</h2>
            <ul className="space-y-3">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-body-sm text-ink hover:text-lumen-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-caption sm:px-6 text-ink-muted">
          <span className="font-mono">
            © {year} {BRAND.legalName} · {SITE_HOST}
          </span>
          <a href={BRAND.parentUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            {BRAND.endorsement}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
