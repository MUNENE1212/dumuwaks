import React, { useId } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id: externalId, ...props }, ref) => {
    const autoId = useId();
    const id = externalId || autoId;
    const errorId = error ? `${id}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-body-sm font-medium text-ink">
            {label}
            {props.required && <span className="text-fault-ink ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={clsx(
            // WCAG 2.1 AA: Minimum 44px height for touch targets
            'flex h-11 w-full rounded-sm border bg-surface-300 px-3.5 py-2.5 text-body text-ink placeholder:text-ink-faint file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-fault focus-visible:ring-fault'
              : 'border-line-strong focus-visible:border-lumen focus-visible:ring-lumen',
            className
          )}
          {...props}
        />
        {error && <p id={errorId} className="mt-1 text-sm text-fault-ink" role="alert">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-ink-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
