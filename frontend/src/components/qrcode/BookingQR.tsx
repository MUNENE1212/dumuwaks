import { QRCodeDisplay } from './QRCodeDisplay';
import { CheckCircle, Calendar, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface BookingQRProps {
  bookingId: string;
  bookingRef: string;
  technicianName: string;
  technicianPhoto?: string;
  scheduledDate: string | Date;
  service?: string;
  address?: string;
}

export const BookingQR = ({
  bookingId,
  bookingRef,
  technicianName,
  technicianPhoto,
  scheduledDate,
  service,
  address
}: BookingQRProps) => {
  const trackingUrl = `${window.location.origin}/bookings/${bookingId}/track`;
  const formattedDate = typeof scheduledDate === 'string'
    ? scheduledDate
    : format(scheduledDate, 'PPP p');

  return (
    <div className=" bg-success-50 dark:bg-success-950 rounded-2xl p-6">
      {/* Confirmation Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-success-500 rounded-full mb-4"
        >
          <CheckCircle className="h-10 w-10 text-ink" />
        </motion.div>
        <h3 className="text-2xl font-bold text-success-700 dark:text-success-300 mb-2">
          Booking Confirmed!
        </h3>
        <p className="text-ink-muted font-medium">
          Ref: {bookingRef}
        </p>
      </div>

      {/* QR Code */}
      <QRCodeDisplay
        data={trackingUrl}
        title="Track Your Booking"
        description={`Scan to track ${technicianName}'s arrival`}
        size={250}
        showActions={true}
      />

      {/* Booking Details */}
      <div className="mt-6 p-4 bg-surface-100 rounded-xl space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {technicianPhoto ? (
              <img
                src={technicianPhoto}
                alt={technicianName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-on-lumen font-bold">
                {technicianName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink dark:text-ink">
              {technicianName}
            </p>
            {service && (
              <p className="text-sm text-ink-muted">
                {service}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-line">
          <Calendar className="h-5 w-5 text-primary-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink dark:text-ink">
              Scheduled
            </p>
            <p className="text-sm text-ink-muted">
              {formattedDate}
            </p>
          </div>
        </div>

        {address && (
          <div className="flex items-center gap-3 pt-3 border-t border-line">
            <MapPin className="h-5 w-5 text-primary-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink dark:text-ink">
                Location
              </p>
              <p className="text-sm text-ink-muted">
                {address}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-success-500/10 dark:bg-success-500/20 rounded-xl border border-success-200 dark:border-success-800">
        <p className="text-sm text-success-800 dark:text-success-300 text-center">
          <span className="font-semibold">📱 Important:</span> Show this QR code to the technician when they arrive
        </p>
      </div>
    </div>
  );
};
