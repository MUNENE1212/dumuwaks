import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL, APP_URL, FAQS } from '@/lib/constants';
import FAQAccordion from './FAQAccordion';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions - Dumuwaks Kenya',
  description:
    'Find answers to common questions about Dumuwaks: booking technicians, M-Pesa payments, cancellation policy, emergency services, and becoming a technician in Kenya.',
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: `FAQ | ${SITE_NAME}`,
    description: 'Answers to common questions about booking technicians on Dumuwaks.',
    url: `${SITE_URL}/faq`,
  },
};

export default function FAQPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${SITE_URL}/faq` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="container section" style={{ maxWidth: 800, margin: '0 auto' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>FAQ</span>
        </nav>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ marginBottom: 12 }}>Frequently Asked Questions</h1>
          <p style={{ color: '#9BA4B0', fontSize: 18 }}>
            Find answers to common questions about Dumuwaks
          </p>
        </div>

        <div className="glass-card" style={{ padding: '8px 24px', marginBottom: 48 }}>
          <FAQAccordion faqs={FAQS} />
        </div>

        {/* Still have questions */}
        <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12, fontSize: 24 }}>Still Have Questions?</h2>
          <p style={{ color: '#9BA4B0', marginBottom: 24 }}>
            We&apos;re here to help! Contact our support team anytime.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`${APP_URL}/whatsapp-support`}
              className="btn btn-primary"
              style={{ background: '#25D366' }}
            >
              WhatsApp Us
            </Link>
            <Link href={`${APP_URL}/register`} className="btn btn-secondary">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
