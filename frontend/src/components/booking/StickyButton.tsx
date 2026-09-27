/**
 * StickyButton Component
 *
 * A sticky action button that appears at the bottom of the screen on mobile devices.
 * Provides a better UX for forms by keeping the primary action always accessible.
 *
 * Features:
 * - Position: fixed at bottom on mobile (hidden on md+ screens by default)
 * - Full width on mobile
 * - Smooth shadow/border transition
 * - Only visible when form is valid (optional)
 * - Proper z-index to stay above content
 */

import React from 'react';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';

interface StickyButtonProps {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the form is valid - button will be disabled if false */
  isValid?: boolean;
  /** Show on desktop as well (in the normal flow position) */
  showOnDesktop?: boolean;
  /** Additional container class names */
  containerClassName?: string;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Additional button class names */
  className?: string;
  /** Button content */
  children: React.ReactNode;
}

const StickyButton: React.FC<StickyButtonProps> = ({
  isValid = true,
  showOnDesktop = false,
  containerClassName,
  children,
  disabled,
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  type = 'button',
  onClick,
}) => {
  return (
    <>
      {/* Spacer for mobile to prevent content from being hidden behind sticky button */}
      <div className={clsx(
        'h-20 md:hidden',
        containerClassName
      )} />

      {/* Sticky container - only visible on mobile */}
      <div
        className={clsx(
          'fixed bottom-0 left-0 right-0 z-sticky',
          'bg-charcoal/95',
          'border-t border-steel/30',
          'p-4 safe-area-inset-bottom',
          'transition-all duration-300 ease-out',
          'md:hidden', // Hidden on desktop by default
          showOnDesktop && 'md:relative md:border-0 md:p-0 md:bg-transparent',
          containerClassName
        )}
      >
        <Button
          type={type}
          variant={variant}
          size={size}
          disabled={disabled || !isValid}
          isLoading={isLoading}
          onClick={onClick}
          className={clsx(
            'w-full min-h-touch-lg', // Full width and proper touch target on mobile
            'transition-all duration-200',
            isValid
              ? 'shadow-led hover:shadow-led-lg'
              : 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          {children}
        </Button>
      </div>

      {/* Desktop version - rendered in normal flow if showOnDesktop is true */}
      {showOnDesktop && (
        <div className="hidden md:block">
          <Button
            type={type}
            variant={variant}
            size={size}
            disabled={disabled || !isValid}
            isLoading={isLoading}
            onClick={onClick}
            className={className}
          >
            {children}
          </Button>
        </div>
      )}
    </>
  );
};

export default StickyButton;
