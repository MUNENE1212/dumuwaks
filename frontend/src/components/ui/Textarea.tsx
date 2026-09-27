import React, { useId } from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id: externalId, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={clsx(
            'flex min-h-[80px] w-full rounded-md border bg-surface-200 px-3 py-2 text-sm ring-offset-background placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            'bg-surface-200 text-ink placeholder:text-ink-muted ring-offset-line',
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

Textarea.displayName = 'Textarea';

export default Textarea;
