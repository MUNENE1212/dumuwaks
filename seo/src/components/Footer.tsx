import Link from 'next/link';
import { SITE_NAME, SITE_URL, APP_URL } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="grid-4" style={{ marginBottom: 32 }}>
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 16, color: '#E0E0E0' }}>
              <span style={{ color: '#0090C5' }}>Dumu</span> Waks
            </h3>
            <p style={{ fontSize: 14, color: '#9BA4B0', lineHeight: 1.7 }}>
              Book technicians for repairs in Kenya. Pay by M-Pesa, held until the job is done.
              Price agreed upfront. M-Pesa payments held in escrow.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#E0E0E0' }}>Services</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link href="/services/plumbing">Plumbing</Link></li>
              <li><Link href="/services/electrical">Electrical</Link></li>
              <li><Link href="/services/carpentry">Carpentry</Link></li>
              <li><Link href="/services/appliance-repair">Appliance Repair</Link></li>
              <li><Link href="/services">All Services</Link></li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#E0E0E0' }}>Company</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/how-it-works">How It Works</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href={`${APP_URL}/terms`}>Terms of Service</Link></li>
              <li><Link href={`${APP_URL}/privacy`}>Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#E0E0E0' }}>Get Started</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link href={`${APP_URL}/register?role=customer`}>Find a Technician</Link></li>
              <li><Link href={`${APP_URL}/register?role=technician`}>Join as Technician</Link></li>
              <li><Link href={`${APP_URL}/login`}>Log In</Link></li>
            </ul>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(155, 164, 176, 0.15)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ fontSize: 13, color: '#9BA4B0' }}>
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p style={{ fontSize: 13, color: '#9BA4B0' }}>
            Made with care in Kenya 🇰🇪
          </p>
        </div>
      </div>
    </footer>
  );
}
