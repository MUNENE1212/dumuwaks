import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message?: string | string[];
  onClose?: () => void;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  onClose,
  className,
}) => {
  const icons = {
    error: AlertCircle,
    success: CheckCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconStyles = {
    error: 'text-red-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  const Icon = icons[variant];

  const messages = Array.isArray(message) ? message : message ? [message] : [];

  if (messages.length === 0 && !title) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        styles[variant],
        className
      )}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', iconStyles[variant])} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium">
              {title}
            </h3>
          )}
          {messages.length > 0 && (
            <div className={cn('text-sm', title && 'mt-2')}>
              {messages.length === 1 ? (
                <p>{messages[0]}</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5">
                  {messages.map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex rounded-md p-1.5 hover:bg-opacity-20 hover:bg-surface-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
