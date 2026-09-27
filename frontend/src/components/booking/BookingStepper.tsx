import React from 'react';
import { clsx } from 'clsx';
import type { BookingStep, BookingStepStatus } from '@/types/booking';

/**
 * Props for BookingStepper component
 */
interface BookingStepperProps {
  steps: BookingStep[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  allowNavigation?: boolean;
  className?: string;
}

/**
 * BookingStepper Component
 * Visual stepper showing booking progress through 5 steps
 * - Step 1: Select Service
 * - Step 2: Choose Technician
 * - Step 3: Payment Plan
 * - Step 4: Schedule & Details
 * - Step 5: Confirm & Pay
 */
const BookingStepper: React.FC<BookingStepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  allowNavigation = false,
  className,
}) => {
  /**
   * Get step status based on current step
   */
  const getStepStatus = (stepId: number): BookingStepStatus => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  /**
   * Handle step click
   */
  const handleStepClick = (stepId: number) => {
    if (allowNavigation && stepId < currentStep && onStepClick) {
      onStepClick(stepId);
    }
  };

  return (
    <nav
      aria-label="Booking progress"
      className={clsx('w-full', className)}
      data-testid="booking-stepper"
    >
      {/* Desktop View - Horizontal Stepper */}
      <ol className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="flex-1 relative">
              <div
                className={clsx(
                  'flex flex-col items-center relative z-10',
                  allowNavigation && status === 'completed' && 'cursor-pointer'
                )}
                onClick={() => handleStepClick(step.id)}
                role={allowNavigation && status === 'completed' ? 'button' : undefined}
                tabIndex={allowNavigation && status === 'completed' ? 0 : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleStepClick(step.id);
                  }
                }}
                data-testid={`step-${step.id}`}
              >
                {/* Step Circle */}
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    'font-bold text-sm transition-all duration-200',
                    {
                      'bg-lumen text-on-lumen': status === 'active',
                      'bg-success text-bone': status === 'completed',
                      'bg-charcoal border-2 border-line text-steel': status === 'pending',
                    }
                  )}
                >
                  {status === 'completed' ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>

                {/* Step Title */}
                <span
                  className={clsx(
                    'mt-2 text-xs font-medium text-center',
                    'transition-colors duration-200',
                    {
                      'text-bone': status === 'active',
                      'text-success': status === 'completed',
                      'text-steel': status === 'pending',
                    }
                  )}
                >
                  {step.title}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={clsx(
                    'absolute top-5 left-1/2 right-0',
                    'h-0.5 -translate-y-1/2',
                    'transition-colors duration-200',
                    {
                      'bg-success': getStepStatus(step.id) === 'completed',
                      'bg-surface-300': getStepStatus(step.id) !== 'completed',
                    }
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile View - Compact Progress Bar */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-bone">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-sm text-steel">
            {steps[currentStep - 1]?.title}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-charcoal rounded-full overflow-hidden">
          <div
            className="h-full bg-lumen transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={`Step ${currentStep} of ${steps.length}`}
          />
        </div>

        {/* Step Dots */}
        <div className="flex justify-between mt-3">
          {steps.map((step) => {
            const status = getStepStatus(step.id);

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                disabled={!allowNavigation || status !== 'completed'}
                className={clsx(
                  'w-3 h-3 rounded-full transition-all duration-200',
                  {
                    'bg-lumen': status === 'active',
                    'bg-success': status === 'completed',
                    'bg-surface-300': status === 'pending',
                    'cursor-pointer': allowNavigation && status === 'completed',
                    'cursor-default': !allowNavigation || status !== 'completed',
                  }
                )}
                aria-label={`${step.title} - ${status}`}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
};

/**
 * Check Icon Component
 */
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

export default BookingStepper;
