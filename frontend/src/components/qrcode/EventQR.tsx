import { QRCodeDisplay } from './QRCodeDisplay';
import { Calendar, MapPin } from 'lucide-react';
import { Card } from '@/components/ui';

interface EventQRProps {
  eventId: string;
  eventName: string;
  eventDate: string;
  location: string;
}

export const EventQR = ({ eventId, eventName, eventDate, location }: EventQRProps) => {
  const eventUrl = `${window.location.origin}/events/${eventId}`;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-purple-900 p-3 rounded-xl">
          <Calendar className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-ink dark:text-ink">
            Event QR Code
          </h3>
          <p className="text-sm text-ink-muted">
            Share event details instantly
          </p>
        </div>
      </div>

      <QRCodeDisplay
        data={eventUrl}
        title={eventName}
        description={`${eventDate} • ${location}`}
        showLogo={true}
        showActions={true}
      />
    </Card>
  );
};
