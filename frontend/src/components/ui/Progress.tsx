import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

/**
 * Progress bar component
 *
 * @example
 * ```tsx
 * <Progress value={75} max={100} size="md" showLabel />
 * ```
 */
export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  label,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    primary: 'bg-gradient-primary',
    secondary: 'bg-secondary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showLabel) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-ink-muted">
              {label}
            </span>
          )}
          {showLabel && (
            <span className="text-sm font-medium text-ink">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full bg-surface-200 rounded-full overflow-hidden',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

Progress.displayName = 'Progress';

/**
 * Step progress indicator component
 */
export interface Step {
  id: string;
  label: string;
  status?: 'complete' | 'current' | 'pending';
}

export interface StepProgressProps {
  steps: Step[];
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({ steps, className }) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isComplete = step.status === 'complete';
          const isCurrent = step.status === 'current';
          const isPending = step.status === 'pending';
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200',
                    isComplete && 'bg-success-500 text-ink',
                    isCurrent && 'bg-primary-500 text-on-lumen',
                    isPending && 'bg-surface-200 text-ink-muted'
                  )}
                >
                  {isComplete ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium transition-colors duration-200',
                    (isCurrent || isComplete) && 'text-ink',
                    isPending && 'text-ink-muted'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2">
                  <div
                    className={cn(
                      'h-full transition-all duration-200',
                      isComplete ? 'bg-success-500' : 'bg-surface-200'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

StepProgress.displayName = 'StepProgress';
