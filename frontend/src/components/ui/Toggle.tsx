import React, { ButtonHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

/**
 * Toggle switch component
 *
 * @example
 * ```tsx
 * <Toggle
 *   label="Enable notifications"
 *   checked={enabled}
 *   onCheckedChange={setEnabled}
 * />
 * ```
 */
const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      className,
      label,
      checked: controlledChecked,
      onCheckedChange,
      size = 'md',
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = useState(false);
    const checked = controlledChecked !== undefined ? controlledChecked : internalChecked;

    const handleToggle = () => {
      const newChecked = !checked;
      if (controlledChecked === undefined) {
        setInternalChecked(newChecked);
      }
      onCheckedChange?.(newChecked);
    };

    const sizeClasses = {
      sm: 'w-10 h-6',
      md: 'w-12 h-7',
      lg: 'w-14 h-8',
    };

    const thumbSizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const thumbTranslateClasses = {
      sm: checked ? 'translate-x-4' : 'translate-x-1',
      md: checked ? 'translate-x-5' : 'translate-x-1',
      lg: checked ? 'translate-x-6' : 'translate-x-1',
    };

    return (
      <div className="flex items-center gap-3">
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={handleToggle}
          className={cn(
            'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            checked ? '' : 'bg-surface-400',
            disabled && 'opacity-50 cursor-not-allowed',
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <span
            className={cn(
              'pointer-events-none inline-block rounded-full bg-surface-200 shadow ring-0 transition duration-200 ease-in-out',
              thumbSizeClasses[size],
              thumbTranslateClasses[size]
            )}
            aria-hidden="true"
          />
        </button>

        {label && (
          <span className="text-sm font-medium text-ink-muted">
            {label}
          </span>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };

/* Checkbox Component */
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, indeterminate, ...props }, ref) => {
    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            className={cn(
              'h-5 w-5 rounded border-line-strong text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'border-line bg-surface-100 focus:ring-primary-400 focus:ring-offset-line',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500',
              className
            )}
            {...props}
          />
        </div>

        {label && (
          <div className="flex-1">
            <label
              htmlFor={props.id}
              className="text-sm font-medium text-ink-muted cursor-pointer"
            >
              {label}
            </label>
            {error && (
              <p className="mt-1 text-sm text-error-500 dark:text-error-400">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

/* Radio Component */
export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  value: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="radio"
            className={cn(
              'h-5 w-5 border-line-strong text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'border-line bg-surface-100 focus:ring-primary-400 focus:ring-offset-line',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500',
              className
            )}
            {...props}
          />
        </div>

        {label && (
          <div className="flex-1">
            <label
              htmlFor={props.id}
              className="text-sm font-medium text-ink-muted cursor-pointer"
            >
              {label}
            </label>
            {error && (
              <p className="mt-1 text-sm text-error-500 dark:text-error-400">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
