import { Users, Target, Award, Heart, Zap, Shield } from 'lucide-react';
import { Card } from '../components/ui/Card';

const About = () => {
  const values = [
    {
      icon: Shield,
      title: 'Quality',
      description: 'Every technician has a profile with ratings and finished jobs, so you can check before you book.',
    },
    {
      icon: Zap,
      title: 'Transparency',
      description: 'You pay the price agreed with the technician. The platform fee comes out of their share.',
    },
    {
      icon: Heart,
      title: 'Protection',
      description: 'Your M-Pesa payment is held until you confirm the work. Report a problem and it stays frozen.',
    },
    {
      icon: Award,
      title: 'Community',
      description: 'Building trust between Kenyan technicians and customers, one job at a time.',
    },
  ];


  return (
    <div className="min-h-screen bg-surface-100">
      {/* Hero Section */}
      <div className="border-b border-line bg-surface-000 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About Dumuwaks</h1>
          <p className="text-xl text-ink-muted max-w-3xl">
            Book technicians for home and business repairs in Kenya, on the web or WhatsApp.
            Pay by M-Pesa — the money is held until you confirm the job is done.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Target className="h-8 w-8 text-primary-600" />
              <h2 className="text-3xl font-bold text-ink">Our Mission</h2>
            </div>
            <p className="text-lg text-ink-muted mb-4">
              To connect Kenyans with reliable, skilled technicians for quality home and business maintenance services.
              We're making professional repairs accessible, affordable, and stress-free for everyone.
            </p>
            <p className="text-lg text-ink-muted">
              Whether it's an urgent leak or routine appliance maintenance, you see who is coming and what
              it costs before anyone arrives.
            </p>
          </div>
          <Card className="p-8 bg-surface-200">
            <Users className="h-12 w-12 text-primary-600 mb-4" />
            <h3 className="text-2xl font-bold text-ink mb-4">
              Our Vision
            </h3>
            <p className="text-ink-muted">
              A place where finding good help is never a gamble: the price agreed upfront, the money safe until
              the work is done, and every technician building a public record job by job.
            </p>
          </Card>
        </div>
      </div>

      {/* Values Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-4">
            Our Core Values
          </h2>
          <p className="text-ink-muted max-w-2xl mx-auto">
            These principles guide everything we do and shape how we serve our community.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-primary-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-2">
                  {value.title}
                </h3>
                <p className="text-ink-muted">
                  {value.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Story Section */}
      <div className="bg-surface-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-ink mb-6 text-center">
              The Dumuwaks Story
            </h2>
            <div className="space-y-4 text-ink-muted">
              <p>
                Dumuwaks was born from a simple frustration: finding a reliable technician in Kenya
                shouldn't be this hard. Whether it's a burst pipe at 2 AM or a faulty appliance
                before a big family gathering, we've all experienced the stress of emergency repairs.
              </p>
              <p>
                We asked ourselves: why can't finding a trustworthy technician be as simple as
                ordering a ride? Why do Kenyans have to rely on word-of-mouth or gamble on
                a stranger's number?
              </p>
              <p>
                So we built Dumuwaks: you describe the job, choose a technician by their ratings and
                finished work, and pay by M-Pesa into escrow. The technician is paid only when you
                confirm the work is done.
              </p>
              <p>
                We cover plumbing, electrical work, carpentry, masonry, painting, AC and fridge repair
                and welding. Every price is agreed before the job, and if something goes wrong the
                payment stays frozen until the Dumuwaks team has spoken to you both.
              </p>
              <p className="font-semibold">
                We're not just fixing things - we're building trust, one repair at a time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="p-8 md:p-12 bg-surface-000 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Something needs fixing?
          </h2>
          <p className="text-xl text-ink-muted mb-8 max-w-2xl mx-auto">
            Book on the web, or send BOOK on WhatsApp to +254 799 954 672.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register?role=customer"
              className="btn btn-primary btn-lg"
            >
              Find a Technician
            </a>
            <a
              href="/register?role=technician"
              className="btn btn-outline btn-lg"
            >
              Join as Technician
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default About;
