import React from 'react';
import { cn } from '@/lib/utils';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed';
  thickness?: 'thin' | 'medium' | 'thick';
  label?: string;
  className?: string;
}

/**
 * Divider component for visual separation
 *
 * @example
 * ```tsx
 * <Divider />
 * <Divider label="Or" />
 * <Divider orientation="vertical" className="h-8" />
 * ```
 */
export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  thickness = 'thin',
  label,
  className,
}) => {
  const baseClasses = 'border-line';

  const orientationClasses = {
    horizontal: 'w-full border-t',
    vertical: 'h-full border-l',
  };

  const variantClasses = {
    solid: 'border-solid',
    dashed: 'border-dashed',
  };

  const thicknessClasses = {
    thin: 'border',
    medium: 'border-2',
    thick: 'border-4',
  };

  const combinedClasses = cn(
    baseClasses,
    orientationClasses[orientation],
    variantClasses[variant],
    thicknessClasses[thickness],
    className
  );

  if (label) {
    return (
      <div className="relative flex items-center w-full py-4">
        <div className="flex-1 border-t border-line" />
        <span className="flex-shrink-0 mx-4 text-sm font-medium text-ink-muted">
          {label}
        </span>
        <div className="flex-1 border-t border-line" />
      </div>
    );
  }

  return <div className={combinedClasses} aria-hidden="true" />;
};

Divider.displayName = 'Divider';
