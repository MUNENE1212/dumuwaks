import React, { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { bottomSheetOverlay, bottomSheetContent } from '@/lib/animations';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: 'auto' | 'half' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

/**
 * Bottom sheet component for mobile (PWA critical component)
 *
 * @example
 * ```tsx
 * <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Options">
 *   <p>Sheet content</p>
 * </BottomSheet>
 * ```
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  showCloseButton = true,
  closeOnOverlayClick = true,
}) => {
  // Close sheet on Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const heightClasses = {
    auto: 'h-auto max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]',
  };

  const sheet = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            variants={bottomSheetOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeOnOverlayClick ? onClose : undefined}
            className="fixed inset-0 bg-surface-000/50 z-modal lg:hidden"
            aria-hidden="true"
          />

          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-modal lg:hidden">
            <motion.div
              variants={bottomSheetContent}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                'bg-surface-100 rounded-t-3xl shadow-2xl',
                'safe-bottom',
                heightClasses[height]
              )}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'sheet-title' : undefined}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-surface-300 rounded-full" />
              </div>

              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                  {title && (
                    <h2
                      id="sheet-title"
                      className="text-lg font-semibold text-ink"
                    >
                      {title}
                    </h2>
                  )}

                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-2 -mr-2 rounded-lg hover:bg-surface-200 transition-colors"
                      aria-label="Close sheet"
                    >
                      <X className="w-5 h-5 text-ink-muted" />
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="overflow-y-auto p-6">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(sheet, document.body);
};

BottomSheet.displayName = 'BottomSheet';
