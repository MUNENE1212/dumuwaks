import React from 'react';
import { PWAInstallQR } from '@/components/qrcode';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const InstallApp: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-000 py-12 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center text-ink-muted hover:text-ink text-ink transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-lumen-ink mb-4">
            Install Dumuwaks
          </h1>
          <p className="text-lg text-ink-muted max-w-2xl mx-auto">
            Get the full Dumuwaks experience on your mobile device. Scan the QR code below to install the app.
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-surface-100 rounded-3xl shadow-2xl p-8">
          <PWAInstallQR />
        </div>

        {/* Features */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="bg-surface-100 rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-primary-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-ink dark:text-ink mb-2">Lightning Fast</h3>
            <p className="text-sm text-ink-muted">
              Instant loading and smooth performance for quick bookings
            </p>
          </div>

          <div className="bg-surface-100 rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-ink dark:text-ink mb-2">Works Offline</h3>
            <p className="text-sm text-ink-muted">
              Access features even without internet connection
            </p>
          </div>

          <div className="bg-surface-100 rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-semibold text-ink dark:text-ink mb-2">Secure & Private</h3>
            <p className="text-sm text-ink-muted">
              Your data is protected with enterprise-grade security
            </p>
          </div>
        </div>

        {/* Instructions for Desktop */}
        <div className="mt-12 bg-surface-200 rounded-2xl p-8 text-ink">
          <h2 className="text-2xl font-bold mb-4 text-center">Desktop User?</h2>
          <p className="text-center text-ink-muted mb-6">
            If you're on a desktop computer, email this QR code to your phone or use a messaging app to transfer it.
          </p>
          <div className="max-w-md mx-auto bg-surface-100 rounded-xl p-6">
            <h3 className="font-semibold mb-3">Alternative Installation:</h3>
            <ol className="space-y-2 text-sm text-ink-muted">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-xs font-bold text-on-lumen">1</span>
                <span>On iOS: Open Safari, tap Share, then "Add to Home Screen"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-xs font-bold text-on-lumen">2</span>
                <span>On Android: Open Chrome, tap Menu, then "Install App" or "Add to Home Screen"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-xs font-bold text-on-lumen">3</span>
                <span>Follow the prompts to complete installation</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;
