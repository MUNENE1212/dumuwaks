import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: true | false;
}

/**
 * Skeleton component for loading states
 *
 * @example
 * ```tsx
 * <Skeleton variant="rectangular" width="100%" height={200} />
 * <Skeleton variant="text" />
 * <Skeleton variant="circular" width={40} height={40} />
 * ```
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className,
  animation = true,
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  const defaultDimensions = {
    text: { height: '1rem' } as { width?: string | number; height?: string | number },
    circular: { width: '40px', height: '40px' } as { width?: string | number; height?: string | number },
    rectangular: { width: '100%', height: '100px' } as { width?: string | number; height?: string | number },
  };

  const finalWidth = width || (defaultDimensions[variant].width ?? undefined);
  const finalHeight = height || defaultDimensions[variant].height;

  return (
    <div
      className={cn(
        'bg-surface-200',
        variantClasses[variant],
        animation && 'animate-shimmer',
        className
      )}
      style={{
        width: finalWidth !== undefined ? (typeof finalWidth === 'number' ? `${finalWidth}px` : finalWidth) : undefined,
        height: typeof finalHeight === 'number' ? `${finalHeight}px` : finalHeight,
      }}
      aria-hidden="true"
    />
  );
};

Skeleton.displayName = 'Skeleton';

/**
 * Card skeleton component
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('p-6 border border-line rounded-2xl', className)}>
      <div className="flex items-start gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height="1.25rem" />
          <Skeleton variant="text" width="40%" height="1rem" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="70%" />
      </div>
    </div>
  );
};

CardSkeleton.displayName = 'CardSkeleton';

/**
 * List skeleton component
 */
export const ListSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="80%" height="1rem" />
            <Skeleton variant="text" width="50%" height="0.875rem" />
          </div>
        </div>
      ))}
    </div>
  );
};

ListSkeleton.displayName = 'ListSkeleton';
