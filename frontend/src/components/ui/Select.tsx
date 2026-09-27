import React, { useId } from 'react';
import { clsx } from 'clsx';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string; color?: string }>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className, children, id: externalId, ...props }, ref) => {
    const autoId = useId();
    const id = externalId || autoId;
    const errorId = error ? `${id}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink-muted">
            {label}
            {props.required && <span className="text-fault-ink ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={clsx(
            'flex h-10 w-full rounded-md border bg-surface-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            'bg-surface-200 text-ink ring-offset-line',
            '[&>option]:bg-surface-200 [&>option]:text-ink dark:[&>option]:bg-surface-200 dark:[&>option]:text-ink',
            error
              ? 'border-fault focus-visible:ring-fault'
              : 'border-line-strong focus-visible:border-lumen focus-visible:ring-lumen',
            className
          )}
          {...props}
        >
          {options ? (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>
        {error && <p id={errorId} className="mt-1 text-sm text-fault-ink" role="alert">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-ink-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
