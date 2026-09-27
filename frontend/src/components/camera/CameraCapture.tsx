import { Camera, X, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (imageUrl: string) => void;
  label?: string;
  accept?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
}

export const CameraCapture = ({
  onCapture,
  label = "Add Photo",
  accept = "image/*",
  className,
  aspectRatio = 'auto'
}: CameraCaptureProps) => {
  const {
    isCapturing,
    previewUrl,
    error,
    startCapture,
    clearPreview,
    fileInputRef
  } = useCameraCapture({ onCapture });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const handler = fileInputRef.current;
    if (handler) {
      // Trigger the internal handler from the hook
      const event = e;
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        const maxSize = 5 * 1024 * 1024; // 5MB
        const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (!acceptedTypes.includes(file.type)) {
          alert('Invalid file type. Please select JPEG, PNG, or WebP image.');
          return;
        }

        if (file.size > maxSize) {
          alert('File size must be less than 5MB');
          return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          const url = reader.result as string;
          onCapture(url);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const getHeightClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'h-48';
      case 'video':
        return 'h-64';
      default:
        return 'h-48';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {!previewUrl ? (
          <motion.button
            key="capture-button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startCapture}
            className="w-full flex items-center gap-3 px-6 py-4 bg-surface-200 rounded-2xl border-2 border-dashed border-line hover:border-primary-500 transition-colors group"
          >
            <div className="bg-primary-900 p-3 rounded-xl group-hover:bg-primary-800 transition-colors">
              <Camera className="h-6 w-6 text-primary-400" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-ink dark:text-ink">{label}</p>
              <p className="text-sm text-ink-muted">Tap to capture or upload</p>
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative"
          >
            <img
              src={previewUrl}
              alt="Captured"
              className={cn('w-full object-cover rounded-2xl shadow-lg', getHeightClass())}
            />

            <div className="absolute top-2 right-2 flex gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={clearPreview}
                className="bg-red-500 text-on-lumen p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-surface-000/50 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-xs text-ink font-medium">Photo captured</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};
