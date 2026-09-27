import { QRCodeDisplay } from './QRCodeDisplay';
import { Share2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui';
import { useToast } from '@/hooks/useToast';

interface TechnicianQRCardProps {
  technicianId: string;
  technicianName: string;
  service: string;
  rating: number;
}

export const TechnicianQRCard = ({
  technicianId,
  technicianName,
  service,
  rating
}: TechnicianQRCardProps) => {
  const { toast } = useToast();
  const profileUrl = `${window.location.origin}/technicians/${technicianId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${technicianName} - Dumuwaks`,
          text: `Check out ${technicianName}'s ${service} services on Dumuwaks!`,
          url: profileUrl
        });
        toast({
          title: 'Profile shared successfully',
          variant: 'success'
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    }
  };

  return (
    <div className=" bg-primary-950 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <QrCode className="h-6 w-6 text-primary-400" />
        <h3 className="font-semibold text-ink dark:text-ink">
          Share {technicianName}'s Profile
        </h3>
      </div>

      <QRCodeDisplay
        data={profileUrl}
        title="Scan to View Profile"
        description={`View ${technicianName}'s ${service} services`}
        size={250}
        onDownload={() => {
          toast({
            title: 'QR Code downloaded',
            description: 'Share it with anyone to easily access this profile',
            variant: 'success'
          });
        }}
        onShare={handleShare}
      />

      <div className="mt-4 p-4 bg-surface-100 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-ink dark:text-ink">
              {technicianName}
            </p>
            <p className="text-sm text-ink-muted">
              {service} • ★ {rating.toFixed(1)}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};
