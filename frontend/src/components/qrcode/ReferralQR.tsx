import { QRCodeDisplay } from './QRCodeDisplay';
import { Gift } from 'lucide-react';
import { Card } from '@/components/ui';

interface ReferralQRProps {
  userId: string;
  referralCode: string;
}

export const ReferralQR = ({ userId, referralCode }: ReferralQRProps) => {
  const referralUrl = `${window.location.origin}/register?ref=${referralCode}`;

  return (
    <div className=" bg-purple-950 p-6 rounded-2xl">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div className=" bg-purple-500 p-4 rounded-2xl">
            <Gift className="h-8 w-8 text-ink" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-ink dark:text-ink mb-2">
          Share & Earn
        </h3>
        <p className="text-sm text-ink-muted">
          Earn KES 500 for every friend who books their first service
        </p>
      </div>

      <Card className="p-6 bg-surface-100">
        <QRCodeDisplay
          data={referralUrl}
          title="Your Referral Code"
          description={`Code: ${referralCode}`}
          showLogo={true}
          showActions={true}
        />
      </Card>

      <div className="mt-6 p-4 bg-surface-100 rounded-xl">
        <h4 className="font-semibold text-sm text-ink dark:text-ink mb-2">
          How it works:
        </h4>
        <ol className="text-xs text-ink-muted space-y-2">
          <li>1. Share this QR code with friends and family</li>
          <li>2. They scan and sign up for Dumuwaks</li>
          <li>3. When they book their first service, you earn KES 500!</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-green-950 rounded-xl border border-green-800">
        <p className="text-sm text-green-300 flex items-center gap-2">
          <Gift className="h-4 w-4" />
          <span>No limit on referrals - earn unlimited rewards!</span>
        </p>
      </div>
    </div>
  );
};
