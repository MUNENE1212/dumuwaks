import React, { ImgHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

export interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fallback?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

/**
 * Avatar component with fallback and status indicator
 *
 * @example
 * ```tsx
 * <Avatar
 *   src="/avatar.jpg"
 *   alt="John Doe"
 *   size="lg"
 *   status="online"
 *   fallback="JD"
 * />
 * ```
 */
const Avatar = forwardRef<HTMLImageElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = 'Avatar',
      size = 'md',
      fallback,
      status,
      ...props
    },
    ref
  ) => {
    const [imgError, setImgError] = React.useState(!src);

    const sizeClasses = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
      '2xl': 'w-20 h-20 text-2xl',
    };

    const statusColors = {
      online: 'bg-success-500',
      offline: 'bg-surface-400',
      away: 'bg-warning-500',
      busy: 'bg-error-500',
    };

    const containerSize = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16',
      '2xl': 'w-20 h-20',
    };

    const statusSize = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-3.5 h-3.5',
      '2xl': 'w-4 h-4',
    };

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <div className="relative inline-block">
        <div
          className={cn(
            'rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center text-ink font-semibold',
            containerSize[size],
            className
          )}
        >
          {imgError || !src ? (
            fallback ? (
              <span className={sizeClasses[size]}>{fallback}</span>
            ) : (
              <User className={sizeClasses[size]} />
            )
          ) : (
            <img
              ref={ref}
              src={src}
              alt={alt}
              onError={() => setImgError(true)}
              className={cn('w-full h-full object-cover', sizeClasses[size])}
              {...props}
            />
          )}
        </div>

        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full border-2 border-line',
              statusColors[status],
              statusSize[size]
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
