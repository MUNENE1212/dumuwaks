import { Shield } from 'lucide-react';
import { Card } from '../components/ui/Card';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-surface-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="h-8 w-8 text-primary-600" />
          <h1 className="text-4xl font-bold text-ink">
            Privacy Policy
          </h1>
        </div>

        <Card className="p-8">
          <p className="text-sm text-ink-muted mb-6">
            Last Updated: November 1, 2025
          </p>

          <div className="prose prose-invert max-w-none space-y-6 text-ink-muted">
            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">1. Information We Collect</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Personal information (name, email, phone number)</li>
                <li>Location data for service matching</li>
                <li>Payment information (processed securely via M-Pesa)</li>
                <li>Service history and ratings</li>
                <li>Messages and communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Match customers with suitable technicians</li>
                <li>Process payments and bookings</li>
                <li>Improve our platform and services</li>
                <li>Send service updates and notifications</li>
                <li>Prevent fraud and ensure security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">3. Information Sharing</h2>
              <p>
                Dumuwaks does not sell your personal information. We share information only when necessary for service delivery:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With matched technicians (name, location, service details)</li>
                <li>With M-Pesa for payment processing</li>
                <li>When required by Kenyan law</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">4. Data Security</h2>
              <p>
                Dumuwaks implements industry-standard security measures including encryption, secure servers, and regular security audits to protect your data. We comply with Kenyan Data Protection Act regulations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">5. Your Rights</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Request data correction or deletion</li>
                <li>Opt out of marketing communications</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">6. Cookies</h2>
              <p>
                We use cookies to improve your experience, remember preferences, and analyze platform usage. You can disable cookies in your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-ink mb-4">7. Contact Dumuwaks</h2>
              <p>
                For privacy-related questions or requests under the Kenyan Data Protection Act:
                <br />
                Email: privacy@dumuwaks.co.ke
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

export default Privacy;
