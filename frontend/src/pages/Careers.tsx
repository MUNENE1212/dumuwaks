import { Code, Users, Heart, Zap, Github, Mail, MessageCircle } from 'lucide-react';
import { Card, Button } from '@/components/ui';

const Careers = () => {
  const openPositions = [
    {
      title: 'Full Stack Developer',
      type: 'Volunteer / Contract',
      location: 'Remote',
      description: 'Help us build and improve our MERN stack platform.',
      skills: ['React', 'Node.js', 'MongoDB', 'TypeScript'],
    },
    {
      title: 'UI/UX Designer',
      type: 'Volunteer',
      location: 'Remote',
      description: 'Design beautiful and intuitive user experiences for our customers and technicians.',
      skills: ['Figma', 'UI Design', 'User Research', 'Prototyping'],
    },
    {
      title: 'Mobile App Developer',
      type: 'Volunteer / Contract',
      location: 'Remote',
      description: 'Build our React Native mobile app for iOS and Android.',
      skills: ['React Native', 'TypeScript', 'Mobile UI', 'API Integration'],
    },
    {
      title: 'DevOps Engineer',
      type: 'Volunteer',
      location: 'Remote',
      description: 'Help us scale and optimize our infrastructure.',
      skills: ['Docker', 'AWS/GCP', 'CI/CD', 'Monitoring'],
    },
  ];

  const contributorBenefits = [
    {
      icon: Code,
      title: 'Real-World Experience',
      description: 'Work on a production platform serving real users across Kenya.',
    },
    {
      icon: Users,
      title: 'Collaborative Team',
      description: 'Join a passionate team of developers, designers, and entrepreneurs.',
    },
    {
      icon: Zap,
      title: 'Flexible Schedule',
      description: 'Contribute at your own pace. We value quality over quantity.',
    },
    {
      icon: Heart,
      title: 'Make Impact',
      description: 'Your code helps Kenyans get repairs done and get paid fairly.',
    },
  ];

  const contributionAreas = [
    {
      area: 'Frontend Development',
      tasks: ['React components', 'UI improvements', 'Responsive design', 'Dark mode features'],
    },
    {
      area: 'Backend Development',
      tasks: ['API endpoints', 'Database optimization', 'Payment integration', 'Real-time features'],
    },
    {
      area: 'Testing & QA',
      tasks: ['Unit tests', 'Integration tests', 'Bug reporting', 'User testing'],
    },
    {
      area: 'Documentation',
      tasks: ['Code documentation', 'User guides', 'API documentation', 'Contributing guides'],
    },
  ];

  return (
    <div className="min-h-screen bg-surface-100">
      {/* Hero Section */}
      <div className=" bg-primary-600 text-on-lumen py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Join the Dumuwaks Team</h1>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto mb-8">
            Help us build the future of professional maintenance and repair services in Kenya. We welcome
            developers, designers, and contributors of all skill levels.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/MUNENE1212/PLP-final"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface-200 text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-surface-300 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <Github className="h-5 w-5" />
              <span>View on GitHub</span>
            </a>
            <a
              href="mailto:careers@dumuwaks.co.ke?subject=I want to join Dumuwaks"
              className="bg-primary-700 text-on-lumen px-8 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors border-2 border-line inline-flex items-center justify-center space-x-2"
            >
              <Mail className="h-5 w-5" />
              <span>Get in Touch</span>
            </a>
          </div>
        </div>
      </div>

      {/* Open Source Notice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 bg-surface-200 border-l-4 border-green-500">
          <div className="flex items-start space-x-4">
            <Github className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl font-bold text-ink mb-2">
                Open Source Project
              </h2>
              <p className="text-ink-muted mb-4">
                Dumuwaks is an open-source project built with love by the community. We believe in
                transparency, collaboration, and giving back to the developer community that has given us so much.
              </p>
              <p className="text-ink-muted">
                <strong>Tech Stack:</strong> React + TypeScript, Node.js + Express, MongoDB, Redis, M-Pesa API, Socket.io
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Benefits Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-ink mb-8 text-center">
          Why Contribute?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contributorBenefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-primary-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-2">
                  {benefit.title}
                </h3>
                <p className="text-ink-muted">
                  {benefit.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Contribution Areas */}
      <div className="bg-surface-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-ink mb-8 text-center">
            How You Can Help
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {contributionAreas.map((area, index) => (
              <Card key={index} className="p-6">
                <h3 className="text-xl font-semibold text-ink mb-4">
                  {area.area}
                </h3>
                <ul className="space-y-2">
                  {area.tasks.map((task, taskIndex) => (
                    <li key={taskIndex} className="flex items-center space-x-2 text-ink-muted">
                      <span className="text-primary-600">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-ink mb-8 text-center">
          Open Positions
        </h2>
        <div className="space-y-6">
          {openPositions.map((position, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-semibold text-ink mb-2">
                    {position.title}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="bg-primary-900/30 text-primary-300 px-3 py-1 rounded-full">
                      {position.type}
                    </span>
                    <span className="bg-surface-300 text-ink-muted px-3 py-1 rounded-full">
                      {position.location}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => window.location.href = 'mailto:careers@dumuwaks.co.ke?subject=Application: ' + position.title}
                  className="mt-4 md:mt-0"
                >
                  Apply Now
                </Button>
              </div>
              <p className="text-ink-muted mb-4">
                {position.description}
              </p>
              <div>
                <strong className="text-ink">Skills:</strong>
                <div className="flex flex-wrap gap-2 mt-2">
                  {position.skills.map((skill, skillIndex) => (
                    <span
                      key={skillIndex}
                      className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="bg-primary-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-ink mb-4">
              Ready to Contribute?
            </h2>
            <p className="text-primary-100 max-w-2xl mx-auto">
              Follow these simple steps to get started with contributing to Dumuwaks
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Fork the Repo', desc: 'Fork our GitHub repository to your account' },
              { step: '2', title: 'Pick an Issue', desc: 'Choose an issue or feature to work on' },
              { step: '3', title: 'Code & Test', desc: 'Make your changes and test thoroughly' },
              { step: '4', title: 'Submit PR', desc: 'Create a pull request for review' },
            ].map((item, index) => (
              <Card key={index} className="p-6 text-center bg-surface-200">
                <div className="text-4xl font-bold text-primary-600 mb-2">{item.step}</div>
                <h3 className="font-semibold text-ink mb-2">{item.title}</h3>
                <p className="text-sm text-ink-muted">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 text-center">
          <MessageCircle className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ink mb-4">
            Have Questions?
          </h2>
          <p className="text-ink-muted mb-6 max-w-2xl mx-auto">
            We're here to help! Whether you're a seasoned developer or just starting out,
            we welcome everyone who wants to contribute.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:careers@dumuwaks.co.ke"
              className="inline-flex items-center justify-center space-x-2 bg-primary-600 text-on-lumen px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Mail className="h-5 w-5" />
              <span>Email Us</span>
            </a>
            <a
              href="https://wa.me/254799954672?text=Hi! I'm interested in contributing to Dumuwaks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2 bg-green-600 text-on-lumen px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Careers;
