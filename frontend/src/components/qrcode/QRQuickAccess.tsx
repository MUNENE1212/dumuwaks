import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, X, User, Download, Calendar, Scan } from 'lucide-react';
import { TechnicianQRCard } from './TechnicianQRCard';
import { PWAInstallQR } from './PWAInstallQR';
import { BookingQR } from './BookingQR';
import { Button } from '@/components/ui';
import { useAppSelector } from '@/store/hooks';

type QRType = 'technician' | 'pwa' | 'booking' | null;

interface QRQuickAccessProps {
  technicianId?: string;
  bookingId?: string;
  technicianName?: string;
  service?: string;
  rating?: number;
  bookingRef?: string;
  scheduledDate?: string;
  address?: string;
}

export const QRQuickAccess = ({
  technicianId,
  bookingId,
  technicianName,
  service,
  rating,
  bookingRef,
  scheduledDate,
  address
}: QRQuickAccessProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrType, setQrType] = useState<QRType>(null);
  const { user } = useAppSelector((state) => state.auth);

  const hasTechnicianAccess = technicianId && user?.role === 'technician';

  return (
    <>
      {/* Floating QR Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-36 right-4 z-40 bg-primary-500 text-on-lumen p-4 rounded-full shadow-2xl hover:shadow-primary-500/50 transition-shadow"
          title="QR Codes"
        >
          <QrCode className="h-6 w-6" />
        </motion.button>
      )}

      {/* QR Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-36 right-4 z-40 bg-surface-100 rounded-2xl shadow-2xl p-4 border border-line w-80"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink dark:text-ink flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary-500" />
                QR Codes
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-surface-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-ink-muted" />
              </button>
            </div>

            <div className="space-y-2">
              {hasTechnicianAccess && (
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-primary-950"
                  onClick={() => {
                    setQrType('technician');
                    setIsOpen(false);
                  }}
                >
                  <User className="h-4 w-4 mr-2 text-primary-500" />
                  My Profile QR
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-secondary-50 dark:hover:bg-secondary-950"
                onClick={() => {
                  setQrType('pwa');
                  setIsOpen(false);
                }}
              >
                <Download className="h-4 w-4 mr-2 text-secondary-500" />
                App Install QR
              </Button>

              {bookingId && (
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-success-50 dark:hover:bg-success-950"
                  onClick={() => {
                    setQrType('booking');
                    setIsOpen(false);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2 text-success-500" />
                  Booking QR
                </Button>
              )}
            </div>

            {/* Info Text */}
            <div className="mt-4 pt-4 border-t border-line">
              <p className="text-xs text-ink-muted text-center">
                Generate and share QR codes for quick access
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Display Modal */}
      <AnimatePresence>
        {qrType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-surface-000/50 z-50 flex items-center justify-center p-4"
            onClick={() => setQrType(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-100 rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-ink dark:text-ink">
                  {qrType === 'technician' && 'Profile QR Code'}
                  {qrType === 'pwa' && 'Install App'}
                  {qrType === 'booking' && 'Booking QR Code'}
                </h3>
                <button
                  onClick={() => setQrType(null)}
                  className="p-2 hover:bg-surface-200 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-ink-muted" />
                </button>
              </div>

              {qrType === 'technician' && hasTechnicianAccess && (
                <TechnicianQRCard
                  technicianId={technicianId!}
                  technicianName={technicianName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Your Name'}
                  service={service || 'Service Provider'}
                  rating={rating || 4.5}
                />
              )}

              {qrType === 'pwa' && <PWAInstallQR />}

              {qrType === 'booking' && bookingId && (
                <BookingQR
                  bookingId={bookingId}
                  bookingRef={bookingRef || 'BK-XXXXX'}
                  technicianName={technicianName || 'Technician'}
                  scheduledDate={scheduledDate || 'Scheduled Date'}
                  address={address}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
