import { FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';

const Terms = () => {
  return (
    <div className="min-h-screen bg-surface-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="h-8 w-8 text-primary-600" />
          <h1 className="text-4xl font-bold text-ink">
            Terms of Service
          </h1>
        </div>

        <Card className="p-8">
          <p className="text-sm text-ink-muted mb-6">
            Last Updated: November 1, 2025
          </p>

          <div className="prose prose-invert max-w-none space-y-6 text-ink-muted">
            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Dumuwaks platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">2. Service Description</h2>
              <p>
                Dumuwaks provides a platform connecting customers with skilled technicians for professional maintenance and repair services across Kenya. We facilitate bookings, secure M-Pesa payments, and communications but do not directly provide the technical services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">3. User Accounts</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be at least 18 years old to create an account</li>
                <li>You are responsible for maintaining the confidentiality of your account</li>
                <li>You must provide accurate and complete information</li>
                <li>One person or business may not maintain more than one account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">4. Payments and Fees</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Customers pay the full agreed price by M-Pesa after the technician accepts; it is held in escrow by Dumuwaks through its payment provider, IntaSend</li>
                <li>Held funds are released to the technician when the customer confirms the work, or automatically 3 days after the technician marks it complete if no problem is reported</li>
                <li>Dumuwaks charges technicians a platform fee of 7.5% (minimum KES 50, maximum KES 5,000) plus VAT, deducted from the payout</li>
                <li>Cancellation more than 24 hours before the scheduled time is refunded in full; later cancellations by the customer pay 25%, 50% or 75% to the technician depending on timing</li>
                <li>Refunds are sent to the M-Pesa number that paid; disputed funds are held for up to 7 days while they are reviewed</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">5. Cancellations and Refunds</h2>
              <p>
                Customers may cancel bookings up to 24 hours before scheduled service for a full refund. Cancellations within 24 hours may incur a cancellation fee. Dumuwaks reserves the right to cancel any booking and issue a full refund if service quality standards are not met.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">6. User Conduct</h2>
              <p>Users agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful or malicious code</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Circumvent the platform for direct payments</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">7. Limitation of Liability</h2>
              <p>
                Dumuwaks acts as an intermediary platform. We are not liable for the quality of services provided by technicians or disputes between users. Our maximum liability is limited to the amount paid for the specific service in question. However, we mediate all disputes to ensure fair resolution.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">8. Contact</h2>
              <p>
                For questions about these Terms, contact Dumuwaks support:
                <br />
                Email: support@dumuwaks.co.ke
                <br />
                WhatsApp: +254 799 954 672
                <br />
                Available: Monday - Saturday, 8 AM - 8 PM EAT
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
