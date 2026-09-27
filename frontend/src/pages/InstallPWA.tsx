import { useState } from 'react';
import { Smartphone, Download, Apple, Chrome, Heart } from 'lucide-react';
import { Button } from '@/components/ui';

export const InstallPWA = () => {
  const [userAgent] = useState(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isDesktop = !isIOS && !isAndroid;

  return (
    <div className="min-h-screen bg-surface-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Hero Section */}
        <div className="bg-surface-100 rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <div className=" bg-primary-500 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Smartphone className="h-12 w-12 text-ink" />
            </div>
            <h1 className="text-4xl font-bold text-ink dark:text-ink mb-3">
              Install Dumuwaks App
            </h1>
            <p className="text-lg text-ink-muted max-w-xl mx-auto">
              Get the full experience with offline access, faster performance, and push notifications.
              Connect with skilled technicians anytime, anywhere.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-primary-900/20 p-4 rounded-xl text-center">
              <Heart className="h-8 w-8 text-primary-400 mx-auto mb-2" />
              <h3 className="font-semibold text-ink dark:text-ink mb-1">Works Offline</h3>
              <p className="text-sm text-ink-muted">
                Access cached content without internet
              </p>
            </div>
            <div className="bg-secondary-50 dark:bg-secondary-900/20 p-4 rounded-xl text-center">
              <Download className="h-8 w-8 text-secondary-600 dark:text-secondary-400 mx-auto mb-2" />
              <h3 className="font-semibold text-ink dark:text-ink mb-1">Fast & Smooth</h3>
              <p className="text-sm text-ink-muted">
                Optimized performance for quick loading
              </p>
            </div>
            <div className="bg-accent-50 dark:bg-accent-900/20 p-4 rounded-xl text-center">
              <Smartphone className="h-8 w-8 text-accent-600 dark:text-accent-400 mx-auto mb-2" />
              <h3 className="font-semibold text-ink dark:text-ink mb-1">App-like Feel</h3>
              <p className="text-sm text-ink-muted">
                Native app experience on your device
              </p>
            </div>
          </div>
        </div>

        {/* Installation Instructions */}
        {isIOS && (
          <IOSInstallInstructions />
        )}
        {isAndroid && (
          <AndroidInstallInstructions />
        )}
        {isDesktop && (
          <DesktopInstallInstructions />
        )}
      </div>
    </div>
  );
};

const IOSInstallInstructions = () => (
  <div className="bg-surface-100 rounded-2xl shadow-xl p-8">
    <div className="flex items-center gap-3 mb-6">
      <div className="bg-surface-200 p-3 rounded-xl">
        <Apple className="h-8 w-8 text-ink dark:text-ink" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-ink dark:text-ink">
          Install on iPhone or iPad
        </h2>
        <p className="text-ink-muted">Follow these simple steps</p>
      </div>
    </div>

    <div className="space-y-4">
      <Step number={1} text="Open this website in Safari browser" />
      <Step number={2} text="Tap the Share button (square with arrow) at the bottom of the screen" />
      <Step number={3} text="Scroll down and tap 'Add to Home Screen'" />
      <Step number={4} text="Tap 'Add' in the top-right corner" />
      <Step number={5} text="The Dumuwaks app will appear on your home screen" />
    </div>

    <div className="mt-8 p-4 bg-primary-900/20 rounded-xl">
      <p className="text-sm text-primary-200 font-medium">
        <span className="font-bold">Pro tip:</span> Make sure you have enough storage space on your device for the best experience.
      </p>
    </div>
  </div>
);

const AndroidInstallInstructions = () => (
  <div className="bg-surface-100 rounded-2xl shadow-xl p-8">
    <div className="flex items-center gap-3 mb-6">
      <div className="bg-surface-200 p-3 rounded-xl">
        <Chrome className="h-8 w-8 text-ink dark:text-ink" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-ink dark:text-ink">
          Install on Android Device
        </h2>
        <p className="text-ink-muted">Chrome or Edge browser recommended</p>
      </div>
    </div>

    <div className="space-y-4">
      <Step number={1} text="Open this website in Chrome or Edge browser" />
      <Step number={2} text="Look for the install icon in the address bar (or tap the menu)" />
      <Step number={3} text="Tap 'Install App' or 'Add to Home Screen'" />
      <Step number={4} text="Confirm by tapping 'Install' or 'Add'" />
      <Step number={5} text="The Dumuwaks app will be added to your home screen" />
    </div>

    <div className="mt-8 p-4 bg-primary-900/20 rounded-xl">
      <p className="text-sm text-primary-200 font-medium">
        <span className="font-bold">Pro tip:</span> You can also long-press the browser address bar and select "Install app" from the menu.
      </p>
    </div>
  </div>
);

const DesktopInstallInstructions = () => (
  <div className="bg-surface-100 rounded-2xl shadow-xl p-8">
    <div className="text-center mb-6">
      <h2 className="text-2xl font-bold text-ink dark:text-ink mb-2">
        Install on Desktop
      </h2>
      <p className="text-ink-muted">
        PWA installation is supported on Chrome, Edge, and Safari
      </p>
    </div>

    <div className="space-y-4">
      <Step number={1} text="Open this website in Chrome, Edge, or Safari" />
      <Step number={2} text="Look for the install icon in the address bar (usually a computer with a down arrow or plus sign)" />
      <Step number={3} text="Click the install icon" />
      <Step number={4} text="Confirm by clicking 'Install' in the dialog" />
      <Step number={5} text="The app will open in its own window, accessible from your desktop or applications folder" />
    </div>

    <div className="mt-8 p-4 bg-secondary-50 dark:bg-secondary-900/20 rounded-xl">
      <p className="text-sm text-secondary-800 dark:text-secondary-200 font-medium">
        <span className="font-bold">Note:</span> For the best experience, we recommend installing on a mobile device. Install the app on your phone to take Dumuwaks with you anywhere.
      </p>
    </div>

    <div className="mt-6">
      <p className="text-center text-ink-muted mb-4">
        Scan this QR code to install on your mobile device:
      </p>
      <div className="flex justify-center">
        <div className="bg-surface-200 p-4 rounded-xl border-2 border-line">
          <div className="w-48 h-48 bg-surface-200 rounded-lg flex items-center justify-center">
            <p className="text-sm text-ink-muted text-center px-4">
              QR Code<br/>Placeholder
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface StepProps {
  number: number;
  text: string;
}

const Step = ({ number, text }: StepProps) => (
  <div className="flex items-start gap-4">
    <div className="flex-shrink-0 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-on-lumen font-bold shadow-md">
      {number}
    </div>
    <div className="flex-1 pt-1">
      <p className="text-ink-muted">{text}</p>
    </div>
  </div>
);

export default InstallPWA;
