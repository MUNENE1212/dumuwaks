import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL, SERVICES, APP_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'All Maintenance & Repair Services in Kenya',
  description:
    'Browse all professional maintenance and repair services available on Dumuwaks. Plumbing, electrical, carpentry, appliance repair, painting, HVAC, and more in Kenya.',
  alternates: { canonical: `${SITE_URL}/services` },
  openGraph: {
    title: `All Services | ${SITE_NAME}`,
    description: 'Book technicians for plumbing, electrical, carpentry, appliance repair and more in Kenya.',
    url: `${SITE_URL}/services`,
  },
};

export default function ServicesPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE_URL}/services` },
    ],
  };

  const serviceListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Dumuwaks Services',
    description: 'Professional maintenance and repair services available in Kenya',
    itemListElement: SERVICES.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Service',
        name: s.name,
        description: s.description,
        url: `${SITE_URL}/services/${s.slug}`,
        provider: {
          '@type': 'Organization',
          name: SITE_NAME,
        },
        areaServed: { '@type': 'Country', name: 'Kenya' },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceListJsonLd) }}
      />

      <div className="container section">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Services</span>
        </nav>

        <div style={{ marginBottom: 48 }}>
          <h1 style={{ marginBottom: 12 }}>Maintenance &amp; Repair Services in Kenya</h1>
          <p style={{ color: '#9BA4B0', maxWidth: 700, fontSize: 18 }}>
            Technicians for home and business maintenance. Compare ratings, finished jobs and prices
            before you book.
          </p>
        </div>

        <div className="grid-3" style={{ gap: 24 }}>
          {SERVICES.map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <article className="glass-card service-card" style={{ height: '100%' }}>
                <div className="service-icon" style={{ fontSize: 28 }}>{service.icon}</div>
                <h2 style={{ fontSize: 20, marginBottom: 8, color: '#E0E0E0' }}>{service.name}</h2>
                <p style={{ fontSize: 14, color: '#9BA4B0', lineHeight: 1.7, marginBottom: 16 }}>
                  {service.description}
                </p>
                <span style={{ color: '#0090C5', fontSize: 14, fontWeight: 500 }}>
                  Find {service.name} Technicians →
                </span>
              </article>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 64 }}>
          <h2 style={{ marginBottom: 12 }}>Can&apos;t Find Your Service?</h2>
          <p style={{ color: '#9BA4B0', marginBottom: 24 }}>
            Don&apos;t see your job listed? Choose Something else and describe it — we&apos;ll suggest technicians who can do it.
          </p>
          <Link href={`${APP_URL}/register`} className="btn btn-primary btn-lg">
            Get Started Free
          </Link>
        </div>
      </div>
    </>
  );
}
