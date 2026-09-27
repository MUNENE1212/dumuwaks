import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_NAME, SITE_URL, SERVICES, APP_URL, COUNTIES } from '@/lib/constants';

interface Props {
  params: { slug: string };
}

function getService(slug: string) {
  return SERVICES.find((s) => s.slug === slug);
}

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const service = getService(params.slug);
  if (!service) return {};

  const title = `${service.name} Services in Kenya - Book a ${service.name} Technician`;
  const description = `${service.description} Book ${service.name.toLowerCase()} technicians in Kenya. Price agreed upfront, pay by M-Pesa, held until the job is done.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/services/${service.slug}` },
    openGraph: {
      title: `${service.name} Services | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/services/${service.slug}`,
    },
    keywords: [
      ...service.keywords,
      `${service.name.toLowerCase()} Kenya`,
      `${service.name.toLowerCase()} Nairobi`,
      `${service.name.toLowerCase()} near me`,
      `best ${service.name.toLowerCase()} Kenya`,
      `affordable ${service.name.toLowerCase()}`,
    ],
  };
}

export default function ServicePage({ params }: Props) {
  const service = getService(params.slug);
  if (!service) return notFound();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE_URL}/services` },
      { '@type': 'ListItem', position: 3, name: service.name, item: `${SITE_URL}/services/${service.slug}` },
    ],
  };

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${service.name} Services`,
    description: service.description,
    url: `${SITE_URL}/services/${service.slug}`,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: COUNTIES.map((c) => ({
      '@type': 'City',
      name: c,
      containedInPlace: { '@type': 'Country', name: 'Kenya' },
    })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${service.name} Services`,
      itemListElement: service.keywords.map((kw) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: kw.charAt(0).toUpperCase() + kw.slice(1),
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <div className="container section">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/services">Services</Link>
          <span>/</span>
          <span>{service.name}</span>
        </nav>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{service.icon}</div>
          <h1 style={{ marginBottom: 12 }}>
            {service.name} Services in Kenya
          </h1>
          <p style={{ color: '#9BA4B0', maxWidth: 700, fontSize: 18, lineHeight: 1.7 }}>
            {service.description} Book {service.name.toLowerCase()} technicians on Dumuwaks
            with transparent pricing and M-Pesa payments.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <Link href={`${APP_URL}/register?role=customer`} className="btn btn-primary btn-lg">
              Find {service.name} Technicians
            </Link>
          </div>
        </div>

        {/* What We Cover */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ marginBottom: 24 }}>What Our {service.name} Technicians Cover</h2>
          <div className="grid-3">
            {service.keywords.map((keyword) => (
              <div key={keyword} className="glass-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, color: '#E0E0E0', marginBottom: 4 }}>
                  {keyword.charAt(0).toUpperCase() + keyword.slice(1)}
                </h3>
                <p style={{ fontSize: 13, color: '#9BA4B0' }}>
                  {keyword} — book and compare technicians on Dumuwaks
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Service Areas */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ marginBottom: 16 }}>Book {service.name} In</h2>
          <p style={{ color: '#9BA4B0', marginBottom: 24 }}>
            Availability depends on technicians registered near you. You&apos;ll see who can take the job when you book.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COUNTIES.map((county) => (
              <span
                key={county}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: 'rgba(0, 144, 197, 0.1)',
                  border: '1px solid rgba(0, 144, 197, 0.2)',
                  fontSize: 13,
                  color: '#0090C5',
                }}
              >
                {county}
              </span>
            ))}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="glass-card" style={{ padding: 32, marginBottom: 48 }}>
          <h2 style={{ marginBottom: 24 }}>Why Choose Dumuwaks for {service.name}?</h2>
          <div className="grid-2" style={{ gap: 24 }}>
            <div>
              <h3 style={{ fontSize: 16, color: '#0090C5', marginBottom: 8 }}>Check Before You Book</h3>
              <p style={{ fontSize: 14, color: '#9BA4B0' }}>
                See each {service.name.toLowerCase()} technician&apos;s ratings, finished jobs, prices and whether their ID is verified before you choose.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: 16, color: '#0090C5', marginBottom: 8 }}>Transparent Pricing</h3>
              <p style={{ fontSize: 14, color: '#9BA4B0' }}>
                You pay the price agreed with the technician. The platform fee comes out of the technician&apos;s share.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: 16, color: '#0090C5', marginBottom: 8 }}>Secure M-Pesa Payments</h3>
              <p style={{ fontSize: 14, color: '#9BA4B0' }}>
                Pay by M-Pesa when the technician accepts. Dumuwaks holds it until you confirm the work is done.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: 16, color: '#0090C5', marginBottom: 8 }}>Problems Handled</h3>
              <p style={{ fontSize: 14, color: '#9BA4B0' }}>
                Report a problem and the payment stays frozen until the Dumuwaks team has resolved it with you both.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Need {service.name} Help?</h2>
          <p style={{ color: '#9BA4B0', marginBottom: 24, fontSize: 18 }}>
            Describe the job and choose a {service.name.toLowerCase()} technician. Or send BOOK on WhatsApp.
          </p>
          <Link href={`${APP_URL}/register?role=customer`} className="btn btn-primary btn-lg">
            Book a {service.name} Technician Now
          </Link>
        </div>
      </div>
    </>
  );
}
