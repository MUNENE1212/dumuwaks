import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, SERVICES, APP_URL } from '@/lib/constants';
import { getPublicStats, getPublicReviews } from '@/lib/api';

export const metadata: Metadata = {
  title: `${SITE_NAME} - Book Technicians for Home & Business Repairs in Kenya`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
};

const steps = [
  {
    number: '1',
    title: 'Describe Your Problem',
    description: 'Tell us what needs fixing - from leaky taps to electrical faults - on the web or on WhatsApp.',
  },
  {
    number: '2',
    title: 'Choose a Technician',
    description: 'See technicians near you with their ratings, finished jobs and prices before you book.',
  },
  {
    number: '3',
    title: 'Book & Pay via M-Pesa',
    description: 'When the technician accepts, pay by M-Pesa. Dumuwaks holds the money until you confirm the work is done.',
  },
];

// Only facts the platform enforces (see backend/src/config/fees.js and services/payments)
const trustBadges = [
  { label: 'Pay by M-Pesa', icon: '📱' },
  { label: 'Money held until the job is done', icon: '🔒' },
  { label: 'Book on WhatsApp', icon: '💬' },
];

export default async function HomePage() {
  const [statsRes, reviewsRes] = await Promise.all([
    getPublicStats(),
    getPublicReviews(4),
  ]);

  const stats = statsRes?.data;
  const reviews = reviewsRes?.data;

  // Homepage JSON-LD
  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/services?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    image: `${SITE_URL}/images/logo-square.png`,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'KE',
    },
    areaServed: 'Kenya',
    priceRange: 'KES 500 - KES 50,000',
    // Only when real reviews exist — never a placeholder count
    aggregateRating: stats?.averageRating && stats?.totalReviews
      ? {
          '@type': 'AggregateRating',
          ratingValue: stats.averageRating.toFixed(1),
          reviewCount: stats.totalReviews,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Maintenance & Repair Services',
      itemListElement: SERVICES.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          description: s.description,
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />

      {/* Hero Section */}
      <section className="hero-gradient" style={{ padding: '80px 0 60px', position: 'relative' }}>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 720 }}>
            <h1 style={{ marginBottom: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
              Professional Repair &amp; Maintenance Services{' '}
              <span style={{ color: '#0090C5' }}>Across Kenya</span>
            </h1>
            <p style={{ fontSize: 18, color: '#9BA4B0', marginBottom: 32, lineHeight: 1.7 }}>
              Book plumbers, electricians, carpenters &amp; more on the web or WhatsApp. Pay by
              M-Pesa — the money is held until you confirm the job is done.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
              <Link href={`${APP_URL}/register?role=customer`} className="btn btn-primary btn-lg">
                Find a Technician
              </Link>
              <Link href={`${APP_URL}/register?role=technician`} className="btn btn-secondary btn-lg">
                Join as Technician
              </Link>
            </div>

            {/* Trust Badges */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {trustBadges.map((badge) => (
                <span
                  key={badge.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 20,
                    background: 'rgba(0, 144, 197, 0.1)',
                    border: '1px solid rgba(0, 144, 197, 0.2)',
                    fontSize: 12,
                    color: '#0090C5',
                    fontWeight: 500,
                  }}
                >
                  {badge.icon} {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Services Section */}
      <section className="section" id="services" aria-labelledby="services-heading">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 id="services-heading" style={{ marginBottom: 12 }}>
              Our Services
            </h2>
            <p style={{ color: '#9BA4B0', maxWidth: 600, margin: '0 auto' }}>
              From emergency plumbing to routine maintenance, find the right technician for every job.
            </p>
          </div>

          <div className="grid-4">
            {SERVICES.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="glass-card service-card">
                  <div className="service-icon">{service.icon}</div>
                  <h3 style={{ fontSize: 18, marginBottom: 8, color: '#E0E0E0' }}>{service.name}</h3>
                  <p style={{ fontSize: 14, color: '#9BA4B0', lineHeight: 1.6 }}>
                    {service.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/services" className="btn btn-secondary">
              View All Services →
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }} aria-labelledby="how-it-works-heading">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 id="how-it-works-heading" style={{ marginBottom: 12 }}>
              How Dumuwaks Works
            </h2>
            <p style={{ color: '#9BA4B0', maxWidth: 600, margin: '0 auto' }}>
              Get your repair done in three simple steps
            </p>
          </div>

          <div className="grid-3">
            {steps.map((step) => (
              <div key={step.number} className="glass-card" style={{ padding: 32 }}>
                <div className="step-number">{step.number}</div>
                <h3 style={{ margin: '16px 0 8px', color: '#E0E0E0' }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#9BA4B0', lineHeight: 1.7 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      {reviews && reviews.length > 0 && (
        <section className="section" aria-labelledby="reviews-heading">
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 id="reviews-heading" style={{ marginBottom: 12 }}>
                What Customers Say
              </h2>
              <p style={{ color: '#9BA4B0' }}>
                Reviews left by customers after a completed Dumuwaks booking
              </p>
            </div>

            <div className="grid-2">
              {reviews.map((review) => (
                <div key={review._id} className="glass-card" style={{ padding: 24 }}>
                  <div className="stars" style={{ marginBottom: 8 }}>
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </div>
                  <p style={{ fontSize: 14, color: '#E0E0E0', marginBottom: 12, lineHeight: 1.7 }}>
                    &ldquo;{review.comment}&rdquo;
                  </p>
                  <p style={{ fontSize: 13, color: '#9BA4B0' }}>
                    — {review.reviewer?.firstName} {review.reviewer?.lastName?.charAt(0)}.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="section" style={{ background: 'linear-gradient(135deg, #0090C5 0%, #7D4E9F 100%)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'white', marginBottom: 16 }}>
            Ready to Get Your Repair Done?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 600, margin: '0 auto 32px', fontSize: 18 }}>
            Tell us what needs fixing. You pay only into escrow, and the technician is paid when you confirm.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`${APP_URL}/register?role=customer`}
              className="btn btn-lg"
              style={{ background: 'white', color: '#0090C5' }}
            >
              Find a Technician
            </Link>
            <Link
              href={`${APP_URL}/register?role=technician`}
              className="btn btn-lg"
              style={{ background: 'transparent', color: 'white', border: '2px solid white' }}
            >
              Join as Technician
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
