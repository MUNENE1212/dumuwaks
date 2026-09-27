import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL, APP_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'How Dumuwaks Works - Book a Technician in 3 Simple Steps',
  description:
    'How to book a technician on Dumuwaks: describe the problem, choose a technician, pay by M-Pesa into escrow. The technician is paid when you confirm the work.',
  alternates: { canonical: `${SITE_URL}/how-it-works` },
  openGraph: {
    title: `How It Works | ${SITE_NAME}`,
    description: 'Book a technician in 3 steps on Dumuwaks.',
    url: `${SITE_URL}/how-it-works`,
  },
};

const steps = [
  {
    number: '1',
    title: 'Describe Your Problem',
    description:
      'Tell us what needs fixing. Select your service type (plumbing, electrical, carpentry, etc.), describe the issue, and choose your preferred date and time.',
    details: [
      'Plumbing, electrical, carpentry, masonry, painting, AC & fridges, welding',
      'Add photos of the problem',
      'Set your preferred schedule',
      'See a price estimate in KES',
    ],
  },
  {
    number: '2',
    title: 'Choose Your Technician',
    description:
      'We suggest technicians near you, ranked by skills, distance and availability. Compare ratings, reviews and prices before you book.',
    details: [
      'Suggestions ranked by skills, distance and availability',
      'View technician profiles and ratings',
      'Compare prices from multiple technicians',
      'See each technician\'s finished jobs before booking',
    ],
  },
  {
    number: '3',
    title: 'Book & Pay Securely via M-Pesa',
    description:
      'When the technician accepts, pay the agreed price by M-Pesa. Dumuwaks holds it and pays the technician only after you confirm the work is done.',
    details: [
      'Secure M-Pesa STK push payment',
      'Paid to the technician only when you confirm',
      'Funds held in escrow for protection',
      'Full refund if the technician cancels or never starts',
    ],
  },
];

const forTechnicians = [
  {
    number: '1',
    title: 'Create Your Profile',
    description: 'Sign up free, list your skills and service areas, and set your rates.',
  },
  {
    number: '2',
    title: 'Receive Job Requests',
    description: 'Get matched with customers who need your exact skills in your area.',
  },
  {
    number: '3',
    title: 'Complete & Get Paid',
    description: 'The customer pays into escrow before you travel. When they confirm the work, you are paid by M-Pesa or bank.',
  },
];

export default function HowItWorksPage() {
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Book a Technician on Dumuwaks',
    description: 'Book a maintenance technician in Kenya in 3 steps.',
    step: steps.map((s) => ({
      '@type': 'HowToStep',
      name: s.title,
      text: s.description,
      position: parseInt(s.number),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      <div className="container section">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>How It Works</span>
        </nav>

        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h1 style={{ marginBottom: 12 }}>How Dumuwaks Works</h1>
          <p style={{ color: '#9BA4B0', fontSize: 18, maxWidth: 600, margin: '0 auto' }}>
            Three steps. You pay the agreed price, and the money moves only when the job is done.
          </p>
        </div>

        {/* For Customers */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 48, color: '#0090C5' }}>
            For Customers
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {steps.map((step) => (
              <div key={step.number} className="glass-card" style={{ padding: 32, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div className="step-number" style={{ width: 56, height: 56, fontSize: 22 }}>
                  {step.number}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: 8, color: '#E0E0E0' }}>{step.title}</h3>
                  <p style={{ color: '#9BA4B0', marginBottom: 16, lineHeight: 1.7 }}>
                    {step.description}
                  </p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {step.details.map((detail) => (
                      <li key={detail} style={{ fontSize: 14, color: '#9BA4B0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#0090C5' }}>✓</span> {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href={`${APP_URL}/register?role=customer`} className="btn btn-primary btn-lg">
              Find a Technician Now
            </Link>
          </div>
        </section>

        {/* For Technicians */}
        <section>
          <h2 style={{ textAlign: 'center', marginBottom: 48, color: '#7D4E9F' }}>
            For Technicians
          </h2>
          <div className="grid-3">
            {forTechnicians.map((step) => (
              <div key={step.number} className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
                <div className="step-number" style={{ margin: '0 auto 16px', background: '#7D4E9F' }}>
                  {step.number}
                </div>
                <h3 style={{ marginBottom: 8, color: '#E0E0E0', fontSize: 18 }}>{step.title}</h3>
                <p style={{ color: '#9BA4B0', fontSize: 14, lineHeight: 1.7 }}>{step.description}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link
              href={`${APP_URL}/register?role=technician`}
              className="btn btn-lg"
              style={{ background: '#7D4E9F', color: 'white' }}
            >
              Join as Technician — Free
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
