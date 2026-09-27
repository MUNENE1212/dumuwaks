import { QRCodeDisplay } from './QRCodeDisplay';
import { Download, Smartphone } from 'lucide-react';

export const PWAInstallQR = () => {
  const installUrl = window.location.href;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4">
          <Smartphone className="h-8 w-8 text-ink" />
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-ink mb-2">
          Install Dumuwaks App
        </h2>
        <p className="text-ink-muted">
          Scan to install on your mobile device
        </p>
      </div>

      <QRCodeDisplay
        data={installUrl}
        title="Scan to Install"
        description="Point your camera at the QR code to download the app"
        size={300}
      />

      <div className="mt-6 p-6 bg-surface-100 rounded-xl max-w-md">
        <h3 className="font-semibold text-ink dark:text-ink mb-3">
          How to Install
        </h3>
        <ol className="space-y-2 text-sm text-ink-muted">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 bg-primary-500 text-on-lumen rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <span>Open your phone's camera app</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 bg-primary-500 text-on-lumen rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <span>Point it at this QR code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 bg-primary-500 text-on-lumen rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <span>Tap the link that appears</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 bg-primary-500 text-on-lumen rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <span>Tap "Add to Home Screen" or "Install App"</span>
          </li>
        </ol>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-ink-muted">
        <Download className="h-4 w-4" />
        <span>Works on iOS and Android</span>
      </div>
    </div>
  );
};
