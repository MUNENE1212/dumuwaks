import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed top-0 left-0 right-0 z-50 ${
            isOnline
              ? 'bg-success-500 dark:bg-success-600'
              : 'bg-error-500 dark:bg-error-600'
          } text-ink px-4 py-3 shadow-lg`}
        >
          <div className="container mx-auto flex items-center justify-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-5 w-5" />
                <span className="font-medium">You're back online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5" />
                <span className="font-medium">
                  You're offline. Some features may be limited.
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
