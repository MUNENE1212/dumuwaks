import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL, APP_URL } from '@/lib/constants';

interface Props {
  params: { id: string };
}

async function getTechnician(id: string) {
  try {
    const res = await fetch(
      `${process.env.API_URL || 'https://dumuwaks.co.ke'}/api/public/technicians?id=${id}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tech = await getTechnician(params.id);
  if (!tech) {
    return {
      title: 'Technician Profile',
      description: 'Technician profiles on Dumuwaks.',
    };
  }

  const name = `${tech.firstName} ${tech.lastName}`;
  const services = tech.serviceCategories?.join(', ') || 'maintenance';
  const location = tech.location?.city || 'Kenya';
  const rating = tech.publicStats?.averageRating?.toFixed(1) || 'N/A';

  return {
    title: `${name} - ${services} Technician in ${location}`,
    description: `Hire ${name}, a ${services} technician in ${location}. ${rating}★ rating, ${tech.publicStats?.jobsCompleted || 0} jobs completed. Book on Dumuwaks with M-Pesa.`,
    alternates: { canonical: `${SITE_URL}/technicians/${params.id}` },
    openGraph: {
      title: `${name} | ${SITE_NAME}`,
      description: `Verified ${services} technician in ${location}. ${rating}★ rating.`,
      url: `${SITE_URL}/technicians/${params.id}`,
      images: tech.profilePicture ? [{ url: tech.profilePicture }] : [],
    },
  };
}

export default async function TechnicianProfilePage({ params }: Props) {
  const tech = await getTechnician(params.id);

  if (!tech) {
    return (
      <div className="container section" style={{ textAlign: 'center' }}>
        <h1>Technician Not Found</h1>
        <p style={{ color: '#9BA4B0', margin: '16px 0 32px' }}>
          This technician profile may have been removed or is temporarily unavailable.
        </p>
        <Link href="/services" className="btn btn-primary">
          Browse Services
        </Link>
      </div>
    );
  }

  const name = `${tech.firstName} ${tech.lastName}`;
  const rating = tech.publicStats?.averageRating || 0;
  const jobs = tech.publicStats?.jobsCompleted || 0;
  const reviews = tech.publicStats?.totalReviews || 0;

  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle: tech.serviceCategories?.[0] || 'Technician',
    url: `${SITE_URL}/technicians/${params.id}`,
    image: tech.profilePicture,
    worksFor: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    address: tech.location
      ? {
          '@type': 'PostalAddress',
          addressLocality: tech.location.city,
          addressRegion: tech.location.county,
          addressCountry: 'KE',
        }
      : undefined,
    aggregateRating: rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: rating.toFixed(1),
          reviewCount: reviews,
          bestRating: 5,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <div className="container section">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/services">Services</Link>
          <span>/</span>
          <span>{name}</span>
        </nav>

        <div className="glass-card" style={{ padding: 32 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'rgba(0, 144, 197, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                color: '#0090C5',
                flexShrink: 0,
              }}
            >
              {tech.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tech.profilePicture}
                  alt={name}
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                `${tech.firstName[0]}${tech.lastName[0]}`
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 28, marginBottom: 4 }}>{name}</h1>
              <p style={{ color: '#0090C5', marginBottom: 12 }}>
                {tech.serviceCategories?.join(' · ') || 'General Technician'}
              </p>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                  <span className="stars">{'★'.repeat(Math.round(rating))}</span>
                  <span style={{ color: '#9BA4B0', fontSize: 14, marginLeft: 8 }}>
                    {rating.toFixed(1)} ({reviews} reviews)
                  </span>
                </div>
                <div style={{ color: '#9BA4B0', fontSize: 14 }}>
                  {jobs} jobs completed
                </div>
                {tech.location && (
                  <div style={{ color: '#9BA4B0', fontSize: 14 }}>
                    📍 {tech.location.city}, {tech.location.county}
                  </div>
                )}
              </div>

              {/* Availability */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: tech.availabilityStatus === 'available' ? '#10B981' : '#9BA4B0',
                  }}
                />
                <span style={{ fontSize: 14, color: tech.availabilityStatus === 'available' ? '#10B981' : '#9BA4B0' }}>
                  {tech.availabilityStatus === 'available' ? 'Available for bookings' : 'Currently unavailable'}
                </span>
              </div>

              <Link href={`${APP_URL}/register?role=customer`} className="btn btn-primary">
                Book {tech.firstName}
              </Link>
            </div>
          </div>
        </div>

        {/* Services */}
        {tech.serviceCategories && tech.serviceCategories.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ marginBottom: 16, fontSize: 22 }}>Services Offered</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tech.serviceCategories.map((cat: string) => (
                <Link
                  key={cat}
                  href={`/services/${cat.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    background: 'rgba(0, 144, 197, 0.1)',
                    border: '1px solid rgba(0, 144, 197, 0.2)',
                    fontSize: 14,
                    color: '#0090C5',
                  }}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
