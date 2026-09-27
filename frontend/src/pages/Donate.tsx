import { Heart, Zap, Users, Target, DollarSign, CreditCard, Smartphone, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';

const Donate = () => {
  const impactAreas = [
    {
      icon: Zap,
      title: 'Platform Development',
      description: 'Build new features, improve performance, and enhance user experience.',
      goal: 'KES 500,000',
    },
    {
      icon: Users,
      title: 'Technician Training',
      description: 'Provide free training and certification programs for new technicians.',
      goal: 'KES 300,000',
    },
    {
      icon: Target,
      title: 'Rural Expansion',
      description: 'Extend our services to underserved rural areas across Kenya.',
      goal: 'KES 400,000',
    },
    {
      icon: Smartphone,
      title: 'Mobile App',
      description: 'Develop iOS and Android apps for better accessibility.',
      goal: 'KES 600,000',
    },
  ];

  const donationTiers = [
    {
      amount: '1,000',
      title: 'Supporter',
      benefits: ['Thank you mention on website', 'Monthly newsletter'],
    },
    {
      amount: '5,000',
      title: 'Contributor',
      benefits: ['All Supporter benefits', 'Name in credits', 'Quarterly impact reports'],
    },
    {
      amount: '10,000',
      title: 'Champion',
      benefits: ['All Contributor benefits', 'Early access to new features', 'Direct team contact'],
    },
    {
      amount: '25,000+',
      title: 'Partner',
      benefits: ['All Champion benefits', 'Custom partnership opportunities', 'Advisory role'],
    },
  ];

  return (
    <div className="min-h-screen bg-surface-100">
      {/* Hero Section */}
      <div className=" bg-pink-600 text-on-lumen py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Heart className="h-16 w-16 mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Support Our Mission</h1>
          <p className="text-xl text-pink-100 max-w-3xl mx-auto mb-8">
            Your donation helps us connect more Kenyans with quality technical services
            and empower skilled technicians across the country.
          </p>
        </div>
      </div>

      {/* Why Donate */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-4">
            Why We Need Your Support
          </h2>
          <p className="text-ink-muted max-w-3xl mx-auto">
            Dumuwaks is Kenya's leading platform for professional maintenance and repair services.
            Partner with us to transform how Kenyans access quality technical services.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {impactAreas.map((area, index) => {
            const Icon = area.icon;
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="bg-primary-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-2">
                  {area.title}
                </h3>
                <p className="text-ink-muted mb-4">
                  {area.description}
                </p>
                <div className="text-primary-600 font-semibold">
                  Goal: {area.goal}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Donation Tiers */}
      <div className="bg-surface-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-ink mb-4">
              Donation Tiers
            </h2>
            <p className="text-ink-muted">
              Choose a tier that works for you. Every contribution makes a difference!
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {donationTiers.map((tier, index) => (
              <Card key={index} className="p-6 hover:shadow-xl transition-shadow relative overflow-hidden">
                {index === 3 && (
                  <div className="absolute top-0 right-0 bg-yellow-400 text-ink px-3 py-1 text-xs font-bold transform rotate-12 translate-x-4 -translate-y-2">
                    PREMIUM
                  </div>
                )}
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-primary-600 mb-2">
                    KES {tier.amount}
                  </div>
                  <div className="text-lg font-semibold text-ink">
                    {tier.title}
                  </div>
                </div>
                <ul className="space-y-2">
                  {tier.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start space-x-2 text-sm text-ink-muted">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-4">
            How to Donate
          </h2>
          <p className="text-ink-muted max-w-2xl mx-auto">
            We accept donations through multiple secure payment methods
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* M-Pesa */}
          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-ink mb-3">
              M-Pesa
            </h3>
            <div className="space-y-2 text-ink-muted">
              <p className="font-semibold">Paybill: 400200</p>
              <p className="text-sm">Account: DUMUWAKS</p>
              <p className="text-xs text-ink-muted mt-4">
                Most popular payment method
              </p>
            </div>
          </Card>

          {/* Bank Transfer */}
          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="bg-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-ink mb-3">
              Bank Transfer
            </h3>
            <div className="space-y-2 text-ink-muted text-sm">
              <p>Bank: Equity Bank</p>
              <p>Account: 0123456789</p>
              <p>Name: Dumuwaks Ltd</p>
              <p className="text-xs text-ink-muted mt-4">
                For partnerships and investments
              </p>
            </div>
          </Card>

          {/* PayPal */}
          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="bg-purple-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-ink mb-3">
              International
            </h3>
            <div className="space-y-2 text-ink-muted">
              <p className="font-semibold">PayPal/Stripe</p>
              <p className="text-sm">Coming Soon</p>
              <p className="text-xs text-ink-muted mt-4">
                For international donors
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Impact stats removed 2026-09-26: none were measured. Add real totals from the database when there are some. */}

      {/* Transparency */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="p-8 bg-surface-200">
          <div className="flex items-start space-x-4">
            <TrendingUp className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-ink mb-4">
                Transparency & Accountability
              </h2>
              <p className="text-ink-muted mb-4">
                We believe in complete transparency. Every donation is tracked and reported quarterly.
                You'll receive detailed updates on how your contribution is making a difference.
              </p>
              <ul className="space-y-2 text-ink-muted">
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Quarterly financial reports</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Regular impact updates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Open source codebase</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Community-driven decisions</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* CTA */}
      <div className=" bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-ink mb-4">
            Ready to Make an Impact?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Your donation today will help us serve more Kenyans tomorrow
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:partnerships@dumuwaks.co.ke?subject=Partnership Inquiry"
              className="bg-surface-200 text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-surface-300 transition-colors"
            >
              Contact Us
            </a>
            <a
              href="https://wa.me/254799954672?text=Hi! I'd like to partner with Dumuwaks"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-on-lumen px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Partner via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Donate;
