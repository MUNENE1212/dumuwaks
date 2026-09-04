import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Shield,
  Users,
  MessageCircle,
  ExternalLink,
  Wrench,
  Zap,
} from 'lucide-react';

/**
 * Footer Component with Glassmorphism Design
 *
 * Features:
 * - Dark, warm, futuristic aesthetic with glassmorphism effects
 * - Circuit board pattern background (subtle)
 * - LED glow effects on hover
 * - Prominent contact integration with dumuwaks.ementech.co.ke
 * - Mobile responsive design
 * - Uses existing design tokens from tokens.css
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    quickLinks: [
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
      { name: 'About Us', path: '/about' },
      { name: 'Contact', path: '/contact' },
    ],
    services: [
      { name: 'Find Technicians', path: '/find-technicians' },
      { name: 'Become a Technician', path: '/register?role=technician' },
      { name: 'Pricing', path: '/pricing' },
      { name: 'How It Works', path: '/how-it-works' },
    ],
    support: [
      { name: 'Help Center', path: '/support' },
      { name: 'FAQs', path: '/faq' },
      { name: 'Privacy Policy', path: '/privacy' },
      { name: 'Terms of Service', path: '/terms' },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com/ementech', label: 'Facebook' },
    { icon: Twitter, href: 'https://twitter.com/ementech', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com/ementech', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com/company/ementech', label: 'LinkedIn' },
  ];

  const trustIndicators = [
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'M-Pesa with escrow protection',
    },
    {
      icon: Users,
      title: 'Verified Technicians',
      description: 'All professionals vetted',
    },
    {
      icon: MessageCircle,
      title: '24/7 Support',
      description: 'We are here to help',
    },
  ];

  return (
    <footer className="relative overflow-hidden">
      {/* Circuit Pattern Background */}
      <div className="absolute inset-0 circuit-pattern opacity-50" />

      {/* Main Glassmorphism Container */}
      <div className="relative glass border-t border-[var(--dw-border-subtle)]">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <Link to="/" className="inline-block mb-4 group">
                <img
                  src="/images/logo-full.png"
                  alt="Dumu Waks"
                  className="h-12 w-auto transition-all duration-300 group-hover:drop-shadow-[0_0_15px_rgba(0,144,197,0.5)]"
                  onError={(e) => {
                    e.currentTarget.src = '/images/logo.jpg';
                    e.currentTarget.style.height = '48px';
                    e.currentTarget.style.width = 'auto';
                    e.currentTarget.style.objectFit = 'contain';
                  }}
                />
              </Link>

              {/* Tagline */}
              <p className="text-[var(--dw-text-secondary)] text-sm leading-relaxed mb-6 max-w-xs">
                Connecting customers with skilled technicians for professional
                repairs and engineering services across Kenya.
              </p>

              {/* Website Link - Prominent */}
              <a
                href="https://dumuwaks.ementech.co.ke"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--dw-circuit-500)]/10 border border-[var(--dw-circuit-500)]/30 text-[var(--dw-circuit-500)] text-sm font-medium transition-all duration-300 hover:bg-[var(--dw-circuit-500)]/20 hover:border-[var(--dw-circuit-500)]/50 hover:shadow-[var(--dw-shadow-led)] group"
              >
                <Zap className="w-4 h-4" />
                <span>dumuwaks.ementech.co.ke</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
              </a>

              {/* Social Links */}
              <div className="flex gap-3 mt-6">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--dw-bg-secondary)]/60 border border-[var(--dw-border-subtle)] text-[var(--dw-text-secondary)] transition-all duration-300 hover:bg-[var(--dw-wrench-500)]/20 hover:border-[var(--dw-wrench-500)]/40 hover:text-[var(--dw-circuit-500)] hover:shadow-[var(--dw-shadow-led-purple)]"
                      aria-label={social.label}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-[var(--dw-text-primary)] font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--dw-circuit-500)] shadow-[var(--dw-shadow-led)]" />
                Quick Links
              </h3>
              <ul className="space-y-3">
                {footerLinks.quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className="text-[var(--dw-text-secondary)] text-sm transition-all duration-300 hover:text-[var(--dw-circuit-500)] hover:translate-x-1 inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-[var(--dw-text-primary)] font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[var(--dw-wrench-500)]" />
                Services
              </h3>
              <ul className="space-y-3">
                {footerLinks.services.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className="text-[var(--dw-text-secondary)] text-sm transition-all duration-300 hover:text-[var(--dw-circuit-500)] hover:translate-x-1 inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-[var(--dw-text-primary)] font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--dw-wrench-500)] shadow-[var(--dw-shadow-led-purple)]" />
                Contact Us
              </h3>

              <div className="space-y-4">
                {/* Phone */}
                <a
                  href="tel:+254799954672"
                  className="flex items-start gap-3 text-[var(--dw-text-secondary)] text-sm transition-all duration-300 hover:text-[var(--dw-circuit-500)] group"
                >
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-[var(--dw-circuit-500)]/10 border border-[var(--dw-circuit-500)]/20 transition-all duration-300 group-hover:bg-[var(--dw-circuit-500)]/20 group-hover:shadow-[var(--dw-shadow-led)]">
                    <Phone className="w-4 h-4 text-[var(--dw-circuit-500)]" />
                  </div>
                  <div>
                    <span className="block text-[var(--dw-text-tertiary)] text-xs">Phone</span>
                    <span>+254 799 954 672</span>
                  </div>
                </a>

                {/* Email */}
                <a
                  href="mailto:dumuwaks@ementech.co.ke"
                  className="flex items-start gap-3 text-[var(--dw-text-secondary)] text-sm transition-all duration-300 hover:text-[var(--dw-circuit-500)] group"
                >
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-[var(--dw-wrench-500)]/10 border border-[var(--dw-wrench-500)]/20 transition-all duration-300 group-hover:bg-[var(--dw-wrench-500)]/20 group-hover:shadow-[var(--dw-shadow-led-purple)]">
                    <Mail className="w-4 h-4 text-[var(--dw-wrench-500)]" />
                  </div>
                  <div>
                    <span className="block text-[var(--dw-text-tertiary)] text-xs">Email</span>
                    <span>dumuwaks@ementech.co.ke</span>
                  </div>
                </a>

                {/* Location */}
                <div className="flex items-start gap-3 text-[var(--dw-text-secondary)] text-sm">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-[var(--dw-circuit-500)]/10 border border-[var(--dw-circuit-500)]/20">
                    <MapPin className="w-4 h-4 text-[var(--dw-circuit-500)]" />
                  </div>
                  <div>
                    <span className="block text-[var(--dw-text-tertiary)] text-xs">Location</span>
                    <span>Nairobi, Kenya</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 pt-8 border-t border-[var(--dw-border-subtle)]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {trustIndicators.map((indicator) => {
                const Icon = indicator.icon;
                return (
                  <div
                    key={indicator.title}
                    className="flex items-center gap-4 p-4 rounded-xl bg-[var(--dw-bg-secondary)]/40 border border-[var(--dw-border-subtle)] transition-all duration-300 hover:border-[var(--dw-circuit-500)]/30 hover:bg-[var(--dw-bg-secondary)]/60"
                  >
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-[var(--dw-circuit-500)]/10 border border-[var(--dw-circuit-500)]/20">
                      <Icon className="w-5 h-5 text-[var(--dw-circuit-500)]" />
                    </div>
                    <div>
                      <h4 className="text-[var(--dw-text-primary)] font-medium text-sm">
                        {indicator.title}
                      </h4>
                      <p className="text-[var(--dw-text-tertiary)] text-xs">
                        {indicator.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--dw-border-subtle)] bg-[var(--dw-bg-primary)]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Copyright */}
              <p className="text-[var(--dw-text-tertiary)] text-xs text-center sm:text-left">
                {currentYear} Dumu Waks. All rights reserved. Built with care in Kenya.
              </p>

              {/* Support Links */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
                {footerLinks.support.map((link, index) => (
                  <span key={link.name} className="flex items-center">
                    <Link
                      to={link.path}
                      className="text-[var(--dw-text-tertiary)] transition-colors duration-300 hover:text-[var(--dw-circuit-500)]"
                    >
                      {link.name}
                    </Link>
                    {index < footerLinks.support.length - 1 && (
                      <span className="ml-4 text-[var(--dw-border-subtle)]">|</span>
                    )}
                  </span>
                ))}
              </div>

              {/* Powered By */}
              <div className="flex items-center gap-2 text-[var(--dw-text-tertiary)] text-xs">
                <span>Made in Kenya</span>
                <span className="text-[var(--dw-wrench-500)]">*</span>
                <span>Powered by M-Pesa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
