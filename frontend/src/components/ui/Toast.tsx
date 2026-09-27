import React, { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toastSlideIn } from '@/lib/animations';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colors = {
  success: 'bg-success-500',
  error: 'bg-error-500',
  warning: 'bg-warning-500',
  info: 'bg-info-500',
};

/**
 * Individual toast component
 */
export const Toast: React.FC<ToastProps> = ({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  action,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const Icon = icons[type];

  return (
    <motion.div
      variants={toastSlideIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'pointer-events-auto w-full max-w-sm bg-surface-100 rounded-xl shadow-lg border border-line overflow-hidden'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn('flex-shrink-0 w-6 h-6 rounded-full', colors[type], 'flex items-center justify-center')}>
            <Icon className="w-4 h-4 text-ink" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <p className="text-sm font-semibold text-ink">
                {title}
              </p>
            )}
            <p className="text-sm text-ink-muted mt-0.5">
              {message}
            </p>

            {/* Action */}
            {action && (
              <button
                onClick={action.onClick}
                className="mt-2 text-sm font-medium text-primary-500 hover:text-primary-400"
              >
                {action.label}
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => onClose(id)}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-surface-200 transition-colors"
            aria-label="Close toast"
          >
            <X className="w-4 h-4 text-ink-muted" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

Toast.displayName = 'Toast';

/**
 * Toast container and manager
 */
interface ToastItem {
  id: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

let toastCount = 0;

export const toast = {
  success: (message: string, options?: Omit<ToastItem, 'id' | 'type'>) => {
    const id = `toast-${toastCount++}`;
    // This would integrate with a toast manager/store
    // For now, just log
    console.log('Toast:', { id, type: 'success', message, ...options });
    return id;
  },
  error: (message: string, options?: Omit<ToastItem, 'id' | 'type'>) => {
    const id = `toast-${toastCount++}`;
    console.error('Toast:', { id, type: 'error', message, ...options });
    return id;
  },
  warning: (message: string, options?: Omit<ToastItem, 'id' | 'type'>) => {
    const id = `toast-${toastCount++}`;
    console.warn('Toast:', { id, type: 'warning', message, ...options });
    return id;
  },
  info: (message: string, options?: Omit<ToastItem, 'id' | 'type'>) => {
    const id = `toast-${toastCount++}`;
    console.info('Toast:', { id, type: 'info', message, ...options });
    return id;
  },
};

/**
 * Toast container component (place this in your app root)
 */
export const ToastContainer: React.FC<{ toasts: ToastItem[]; onClose: (id: string) => void }> = ({
  toasts,
  onClose,
}) => {
  return createPortal(
    <div className="fixed top-4 right-4 z-toast flex flex-col gap-2 items-end max-w-screen w-full sm:w-auto pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};

ToastContainer.displayName = 'ToastContainer';
