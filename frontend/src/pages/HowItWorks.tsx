import { Search, UserCheck, Calendar, CreditCard, Wrench, Star, MessageCircle, Shield, DollarSign } from 'lucide-react';
import { Card } from '../components/ui/Card';

const HowItWorks = () => {
  const customerSteps = [
    {
      icon: Search,
      title: 'Describe Your Problem',
      description: 'Tell Dumuwaks what you need - plumbing, electrical, carpentry, appliance repair, or any maintenance service.',
    },
    {
      icon: UserCheck,
      title: 'Get Matched Instantly',
      description: 'We suggest technicians near you, ranked by skills, distance and availability.',
    },
    {
      icon: DollarSign,
      title: 'See Exact Pricing',
      description: 'View the exact cost in KES before booking. No hidden fees or surprises with Dumuwaks transparent pricing.',
    },
    {
      icon: Calendar,
      title: 'Book Your Service',
      description: 'Choose your preferred date and time. Once a technician accepts, you pay the full price by M-Pesa and Dumuwaks holds it. Mark it urgent and we look for someone today.',
    },
    {
      icon: Wrench,
      title: 'Technician Arrives',
      description: 'The technician travels once your payment is held, and marks the job done when finished.',
    },
    {
      icon: Star,
      title: 'Rate & Pay Balance',
      description: 'Confirm the work is done and the held payment goes to the technician. Report a problem and it stays frozen until it is sorted.',
    },
  ];

  const technicianSteps = [
    {
      icon: UserCheck,
      title: 'Create Profile',
      description: 'Sign up and verify your skills, certifications, and experience.',
    },
    {
      icon: MessageCircle,
      title: 'Receive Requests',
      description: 'Get matched with customers who need your expertise.',
    },
    {
      icon: Calendar,
      title: 'Accept Jobs',
      description: 'Review details and accept jobs that fit your schedule.',
    },
    {
      icon: Wrench,
      title: 'Complete Work',
      description: 'Deliver quality service and mark the job as complete.',
    },
    {
      icon: CreditCard,
      title: 'Get Paid',
      description: 'Receive payment directly to your M-Pesa after job completion.',
    },
    {
      icon: Star,
      title: 'Build Reputation',
      description: 'Earn ratings and reviews to attract more customers.',
    },
  ];

  const features = [
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Customers pay into escrow before you travel, so the money is there. You\'re paid by M-Pesa or bank as soon as they confirm.',
    },
    {
      icon: UserCheck,
      title: 'Public Track Record',
      description: 'Every technician builds ratings and reviews from completed jobs.',
    },
    {
      icon: MessageCircle,
      title: 'Real-time Chat',
      description: 'Communicate directly with technicians through our in-app messaging.',
    },
    {
      icon: Star,
      title: 'Rating System',
      description: 'Two-way ratings ensure quality service and respectful customers.',
    },
  ];

  return (
    <div className="min-h-screen bg-surface-100">
      {/* Hero Section */}
      <div className="border-b border-line bg-surface-000 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How Dumuwaks Works</h1>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            Get professional maintenance and repair services in 6 simple steps. Your payment is held until you confirm the work is done.
          </p>
        </div>
      </div>

      {/* For Customers */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-4">
            For Customers
          </h2>
          <p className="text-ink-muted max-w-2xl mx-auto">
            From booking to payment, we've made it incredibly simple
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {customerSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-900/30 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-primary-600 mb-1">
                      Step {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-ink mb-2">
                      {step.title}
                    </h3>
                    <p className="text-ink-muted text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* For Technicians */}
      <div className="bg-surface-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-ink mb-4">
              For Technicians
            </h2>
            <p className="text-ink-muted max-w-2xl mx-auto">
              Turn your skills into income. Join our network of professionals
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {technicianSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="bg-green-900/30 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-green-600 mb-1">
                        Step {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-ink mb-2">
                        {step.title}
                      </h3>
                      <p className="text-ink-muted text-sm">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-4">
            Why Choose Dumuwaks?
          </h2>
          <p className="text-ink-muted max-w-2xl mx-auto">
            Features that make Dumuwaks the best platform for maintenance and repair services in Kenya
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-2">
                  {feature.title}
                </h3>
                <p className="text-ink-muted">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Pricing Info */}
      <div className="border-y border-line bg-surface-000 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-ink mb-4">
              Transparent Pricing
            </h2>
            <p className="text-primary-100 max-w-2xl mx-auto">
              Know exactly what you're paying for. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-6 text-center">
              <div className="font-mono text-4xl text-lumen-ink mb-2">Held</div>
              <h3 className="font-semibold text-ink mb-2">
                Full price in escrow
              </h3>
              <p className="text-sm text-ink-muted">
                Paid by M-Pesa after the technician accepts, held by Dumuwaks until you confirm the work
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="font-mono text-4xl text-ok-ink mb-2">3 days</div>
              <h3 className="font-semibold text-ink mb-2">
                To raise a problem
              </h3>
              <p className="text-sm text-ink-muted">
                After the technician marks the job done. With no report, the payment is released automatically
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="font-mono text-4xl text-ink mb-2">7.5%</div>
              <h3 className="font-semibold text-ink mb-2">
                Platform fee, plus VAT
              </h3>
              <p className="text-sm text-ink-muted">
                Taken from the technician's payout. You pay the price you agreed, nothing added
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="p-8 md:p-12 bg-surface-000 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-ink-muted mb-8">
            Book a technician, or join as one.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register?role=customer"
              className="bg-surface-200 text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-surface-300 transition-colors"
            >
              I Need a Technician
            </a>
            <a
              href="/register?role=technician"
              className="bg-lumen text-on-lumen px-8 py-3 rounded-md font-semibold hover:bg-lumen-hover transition-colors"
            >
              I'm a Technician
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HowItWorks;
