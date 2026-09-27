import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

/**
 * Badge component for status indicators and labels
 *
 * @example
 * ```tsx
 * <Badge variant="success" size="md">
 *   Active
 * </Badge>
 * ```
 */
const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      dot = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-full font-mono uppercase tracking-[0.06em]';

    const variantClasses = {
      primary: 'bg-lumen/10 text-lumen-ink',
      secondary: 'bg-surface-300 text-ink-muted',
      success: 'bg-ok/10 text-ok-ink',
      warning: 'bg-warn/10 text-warn-ink',
      error: 'bg-fault/10 text-fault-ink',
      info: 'bg-circuit/10 text-circuit-ink',
    };

    const sizeClasses = {
      sm: 'px-2 h-5 text-[10.5px]',
      md: 'px-2.5 h-6 text-[11px]',
      lg: 'px-3 h-7 text-xs',
    };

    const dotClasses = dot ? 'pl-1.5' : '';

    const combinedClasses = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      dotClasses,
      className
    );

    return (
      <div ref={ref} className={combinedClasses} {...props}>
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
