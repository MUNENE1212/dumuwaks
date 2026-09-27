import { useState } from 'react';
import { QRConnectionCard } from './QRConnectionCard';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui';
import { motion } from 'framer-motion';

interface QuickConnectQRProps {
  technicianId: string;
  technicianName: string;
  technicianService: string;
  rating: number;
}

export const QuickConnectQR = ({
  technicianId,
  technicianName,
  technicianService,
  rating
}: QuickConnectQRProps) => {
  const [showGenerator, setShowGenerator] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      {!showGenerator && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowGenerator(true)}
          className="fixed bottom-44 right-4 z-40 bg-purple-500 text-on-lumen p-4 rounded-full shadow-2xl flex items-center gap-2"
        >
          <QrCode className="h-6 w-6" />
          <span className="font-semibold">Connect</span>
        </motion.button>
      )}

      {/* QR Generator Modal */}
      {showGenerator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-surface-000/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowGenerator(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-100 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className=" bg-purple-500 p-3 rounded-xl">
                  <QrCode className="h-6 w-6 text-ink" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-ink dark:text-ink">
                    QR Connection Hub
                  </h2>
                  <p className="text-sm text-ink-muted">
                    Generate QR codes for any connection type
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGenerator(false)}
              >
                ✕
              </Button>
            </div>

            <QRConnectionCard
              type="profile"
              data={{
                id: technicianId,
                name: technicianName,
                service: technicianService,
                rating: rating
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </>
  );
};
