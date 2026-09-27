import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen focus-visible:ring-offset-2 focus-visible:ring-offset-surface-100 disabled:pointer-events-none disabled:opacity-50';

  const variants = {
    // The one action colour. Dark ink on amber — white on amber fails contrast.
    primary: 'bg-lumen text-on-lumen hover:bg-lumen-hover',
    // Quiet alternative next to a primary.
    secondary: 'border border-line-strong bg-surface-200 text-ink hover:border-ink-muted',
    outline: 'border border-line-strong bg-transparent text-ink hover:border-ink-muted hover:bg-surface-200',
    ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-surface-200',
    danger: 'bg-fault text-on-lumen hover:bg-fault-ink',
  };

  const sizes = {
    // WCAG 2.1 AA: 44px minimum touch target
    sm: 'h-11 min-w-[44px] px-3.5 text-body-sm',
    md: 'h-12 min-w-[48px] px-5 text-body',
    lg: 'h-14 min-w-[56px] px-7 text-lead',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
