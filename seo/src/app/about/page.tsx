import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL, APP_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'About Dumuwaks - Book Repair & Maintenance Technicians in Kenya',
  description:
    'Learn about Dumuwaks, an Emen Tech product: book technicians for home and business repairs in Kenya, pay by M-Pesa, money held until the job is done.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: `About ${SITE_NAME}`,
    description: 'Book technicians for repairs in Kenya. Pay by M-Pesa, held until the job is done.',
    url: `${SITE_URL}/about`,
  },
};

const values = [
  {
    icon: '🛡️',
    title: 'Quality',
    description: 'Every technician has a public profile with ratings and finished jobs, so you can check before you book.',
  },
  {
    icon: '⚡',
    title: 'Transparency',
    description: 'You see the price before you book, and pay exactly that. The platform fee comes out of the technician\'s share.',
  },
  {
    icon: '❤️',
    title: 'Protection',
    description: 'Your M-Pesa payment is held until you confirm the work. Report a problem and it stays frozen.',
  },
  {
    icon: '🏆',
    title: 'Community',
    description: 'Building trust between Kenyan technicians and customers, one job at a time.',
  },
];

export default async function AboutPage() {
  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${SITE_NAME}`,
    description: 'Book technicians for repairs in Kenya. Pay by M-Pesa, held until the job is done.',
    url: `${SITE_URL}/about`,
    mainEntity: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      foundingLocation: { '@type': 'Country', name: 'Kenya' },
      description: 'Connecting Kenyans with skilled technicians for home and business repairs.',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      {/* Hero */}
      <section className="hero-gradient" style={{ padding: '64px 0' }}>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>About</span>
          </nav>
          <h1 style={{ marginBottom: 16 }}>About Dumuwaks</h1>
          <p style={{ color: '#9BA4B0', maxWidth: 700, fontSize: 18, lineHeight: 1.7 }}>
            Book technicians for home and business repairs in Kenya, on the web or WhatsApp.
            Pay by M-Pesa — the money is held until you confirm the job is done.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section">
        <div className="container">
          <div className="grid-2" style={{ gap: 48, alignItems: 'start' }}>
            <div>
              <h2 style={{ marginBottom: 16 }}>🎯 Our Mission</h2>
              <p style={{ color: '#9BA4B0', lineHeight: 1.8, marginBottom: 16 }}>
                To connect Kenyans with reliable, skilled technicians for quality home and business
                maintenance services. We&apos;re making professional repairs accessible, affordable,
                and stress-free for everyone.
              </p>
              <p style={{ color: '#9BA4B0', lineHeight: 1.8 }}>
                Whether it&apos;s an urgent leak or routine appliance maintenance, you see who is coming and
                what it costs before anyone arrives.
              </p>
            </div>
            <div className="glass-card" style={{ padding: 32 }}>
              <h2 style={{ marginBottom: 16 }}>🔭 Our Vision</h2>
              <p style={{ color: '#9BA4B0', lineHeight: 1.8 }}>
                A place where finding good help is never a gamble: the price agreed upfront, the money safe
                until the work is done, and every technician building a public record job by job.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Values */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ marginBottom: 12 }}>Our Core Values</h2>
            <p style={{ color: '#9BA4B0' }}>These principles guide everything we do.</p>
          </div>
          <div className="grid-4">
            {values.map((v) => (
              <div key={v.title} className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{v.icon}</div>
                <h3 style={{ fontSize: 18, marginBottom: 8, color: '#E0E0E0' }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: '#9BA4B0' }}>{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 24 }}>The Dumuwaks Story</h2>
          <div style={{ color: '#9BA4B0', lineHeight: 1.8, fontSize: 16 }}>
            <p style={{ marginBottom: 16 }}>
              Dumuwaks was born from a simple frustration: finding a reliable technician in Kenya
              shouldn&apos;t be this hard. Whether it&apos;s a burst pipe at 2 AM or a faulty appliance
              before a big family gathering, we&apos;ve all experienced the stress of emergency repairs.
            </p>
            <p style={{ marginBottom: 16 }}>
              We asked ourselves: why can&apos;t finding a trustworthy technician be as simple as
              ordering a ride? Why do Kenyans have to rely on word-of-mouth or gamble on
              a stranger&apos;s number?
            </p>
            <p style={{ marginBottom: 16 }}>
              So we built Dumuwaks: you describe the job, choose a technician by their ratings and
              finished work, and pay by M-Pesa into escrow. The technician is paid only when you
              confirm the work is done.
            </p>
            <p style={{ marginBottom: 16 }}>
              We cover plumbing, electrical work, carpentry, masonry, painting, AC and fridge repair
              and welding. Every price is agreed before the job, and if something goes wrong the
              payment stays frozen until the Dumuwaks team has spoken to you both.
            </p>
            <p style={{ fontWeight: 600, color: '#E0E0E0' }}>
              We&apos;re not just fixing things — we&apos;re building trust, one repair at a time.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>Something needs fixing?</h2>
          <p style={{ color: '#9BA4B0', marginBottom: 32, fontSize: 18, maxWidth: 600, margin: '0 auto 32px' }}>
            Book on the web or send BOOK on WhatsApp.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`${APP_URL}/register?role=customer`} className="btn btn-primary btn-lg">
              Find a Technician
            </Link>
            <Link href={`${APP_URL}/register?role=technician`} className="btn btn-secondary btn-lg">
              Join as Technician
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
