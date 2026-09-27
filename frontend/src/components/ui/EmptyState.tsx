import React from 'react';
import { cn } from '@/lib/utils';
import { FileX, Search, AlertCircle, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  illustration?: 'no-data' | 'no-results' | 'error' | 'no-messages' | 'custom';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
  customIcon?: React.ReactNode;
}

/**
 * Empty state component for no data scenarios
 *
 * @example
 * ```tsx
 * <EmptyState
 *   illustration="no-data"
 *   title="No bookings yet"
 *   description="When you make a booking, it will appear here."
 *   action={{ label: 'Find Services', onClick: handleAction }}
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration = 'no-data',
  title,
  description,
  action,
  className,
  customIcon,
}) => {
  const illustrations = {
    'no-data': Inbox,
    'no-results': Search,
    error: AlertCircle,
    'no-messages': FileX,
    custom: null,
  };

  const Icon = illustrations[illustration];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 space-y-4',
        className
      )}
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-surface-200 flex items-center justify-center">
        {customIcon || (Icon && <Icon className="w-8 h-8 text-ink-muted" />)}
      </div>

      {/* Title */}
      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-ink">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-ink-muted">
            {description}
          </p>
        )}
      </div>

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-on-lumen font-semibold rounded-xl transition-colors duration-200 min-h-[48px]"
        >
          {action.icon && <span>{action.icon}</span>}
          {action.label}
        </button>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
