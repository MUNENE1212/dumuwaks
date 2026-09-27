import { QRCodeDisplay } from './QRCodeDisplay';
import { Download, Printer, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';

interface BusinessCardQRProps {
  technicianName: string;
  technicianId: string;
  service: string;
  phone: string;
  email: string;
  location: string;
}

export const BusinessCardQR = ({
  technicianName,
  technicianId,
  service,
  phone,
  email,
  location
}: BusinessCardQRProps) => {
  const profileUrl = `${window.location.origin}/technicians/${technicianId}`;

  // vCard data for contact saving
  const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:${technicianName}
ORG:${service}
TEL:${phone}
EMAIL:${email}
ADR:;;${location};;;;
URL:${profileUrl}
END:VCARD`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Download both QR codes as a package
    console.log('Downloading business card package');
  };

  return (
    <div className="space-y-6">
      {/* Front Side - Profile QR */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-primary-900 p-3 rounded-xl">
            <User className="h-6 w-6 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-ink dark:text-ink">
              Professional Profile
            </h3>
            <p className="text-sm text-ink-muted">
              Scan to view full profile
            </p>
          </div>
        </div>

        <QRCodeDisplay
          data={profileUrl}
          title={technicianName}
          description={`${service} • Dumuwaks Technician`}
          showLogo={true}
          showActions={true}
        />
      </Card>

      {/* Back Side - Contact QR */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-900 p-3 rounded-xl">
            <Mail className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-ink dark:text-ink">
              Contact Card
            </h3>
            <p className="text-sm text-ink-muted">
              Scan to save contact
            </p>
          </div>
        </div>

        <QRCodeDisplay
          data={vCardData}
          title="Save Contact"
          description={`Add ${technicianName} to your contacts`}
          showLogo={true}
          showActions={true}
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Card
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </Card>
    </div>
  );
};
