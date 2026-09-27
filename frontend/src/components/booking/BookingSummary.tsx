import React from 'react';
import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import type {
  BookingSummaryData,
  PaymentPlan,
  Service,
  AvailableTechnician,
} from '@/types/booking';
import { formatRating } from '@/utils/rating';
import { format } from 'date-fns';

/**
 * Props for BookingSummary component
 */
interface BookingSummaryProps {
  summary: BookingSummaryData;
  phoneNumber?: string;
  onEditStep?: (step: number) => void;
  onEditPhoneNumber?: () => void;
  isProcessing?: boolean;
  className?: string;
}

/**
 * BookingSummary Component
 * Final booking summary before payment showing:
 * - Service name and details
 * - Technician info
 * - Selected date/time
 * - Payment plan breakdown
 * - Escrow deposit amount
 * - Platform fee display
 * - Total amount
 */
const BookingSummary: React.FC<BookingSummaryProps> = ({
  summary,
  phoneNumber,
  onEditStep,
  onEditPhoneNumber,
  isProcessing = false,
  className,
}) => {
  const {
    service,
    technician,
    paymentPlan,
    scheduledDate,
    scheduledTime,
    location,
    description,
    escrowDeposit,
    platformFee,
    totalAmount,
    quantity,
  } = summary;

  /**
   * Format price
   */
  const formatPrice = (amount: number): string => {
    return `KES ${amount.toLocaleString()}`;
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  /**
   * Format time
   */
  const formatTime = (timeString: string): string => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  return (
    <div className={clsx('space-y-4', className)} data-testid="booking-summary">
      {/* Service Details */}
      <SummarySection
        title="Service"
        stepNumber={1}
        onEdit={onEditStep ? () => onEditStep(1) : undefined}
        isProcessing={isProcessing}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-charcoal rounded-lg flex items-center justify-center text-lumen-ink">
            <ServiceIcon />
          </div>
          <div className="flex-1">
            <h4 className="text-bone font-semibold uppercase">{service.name}</h4>
            <p className="text-sm text-steel mt-1">{service.description}</p>
            {quantity && quantity > 1 && (
              <p className="text-sm text-lumen-ink mt-1">Quantity: {quantity}</p>
            )}
            <p className="text-xs text-steel mt-1">
              Est. duration: {service.estimatedDuration}
            </p>
          </div>
        </div>
      </SummarySection>

      {/* Technician Details */}
      <SummarySection
        title="Technician"
        stepNumber={2}
        onEdit={onEditStep ? () => onEditStep(2) : undefined}
        isProcessing={isProcessing}
      >
        <div className="flex items-center gap-4">
          {technician.profilePicture ? (
            <img
              src={technician.profilePicture}
              alt={`${technician.firstName} ${technician.lastName}`}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-charcoal flex items-center justify-center text-bone font-bold">
              {technician.firstName[0]}
              {technician.lastName[0]}
            </div>
          )}
          <div className="flex-1">
            <h4 className="text-bone font-semibold">
              {technician.firstName} {technician.lastName}
            </h4>
            <div className="flex items-center gap-2 text-sm text-steel mt-1">
              <span className="flex items-center text-lumen-ink">
                <StarIcon className="w-4 h-4 mr-1" />
                {formatRating(technician.rating.average)}
              </span>
              <span>|</span>
              <span>{technician.completedJobs} jobs</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-bone font-medium">
              {formatPrice(technician.priceRange.min)}
              {technician.priceRange.max !== technician.priceRange.min &&
                ` - ${formatPrice(technician.priceRange.max)}`}
            </p>
          </div>
        </div>
      </SummarySection>

      {/* Payment Plan (if applicable) */}
      {paymentPlan && (
        <SummarySection
          title="Payment Plan"
          stepNumber={3}
          onEdit={onEditStep ? () => onEditStep(3) : undefined}
          isProcessing={isProcessing}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-bone font-semibold">{paymentPlan.name}</h4>
              <p className="text-sm text-steel mt-1">{paymentPlan.description}</p>
              {paymentPlan.frequency === 'installment' && paymentPlan.installments && (
                <p className="text-xs text-steel mt-1">
                  {paymentPlan.installments} installments
                </p>
              )}
              {paymentPlan.milestones && paymentPlan.milestones.length > 0 && (
                <div className="mt-2 space-y-1">
                  {paymentPlan.milestones.map((milestone, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-xs text-steel"
                    >
                      <span className="w-2 h-2 bg-lumen rounded-full" />
                      {milestone.name} ({milestone.percentage}%)
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-lumen-ink font-medium">
                {paymentPlan.depositPercentage}% deposit
              </p>
            </div>
          </div>
        </SummarySection>
      )}

      {/* Schedule & Location */}
      <SummarySection
        title="Schedule & Location"
        stepNumber={4}
        onEdit={onEditStep ? () => onEditStep(4) : undefined}
        isProcessing={isProcessing}
      >
        <div className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-lumen-ink mt-0.5" />
            <div>
              <p className="text-bone font-medium">{formatDate(scheduledDate)}</p>
              <p className="text-sm text-steel">at {formatTime(scheduledTime)}</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <LocationIcon className="w-5 h-5 text-lumen-ink mt-0.5" />
            <div>
              <p className="text-bone font-medium">{location.address}</p>
              {location.landmarks && (
                <p className="text-sm text-steel">Near: {location.landmarks}</p>
              )}
              {location.accessInstructions && (
                <p className="text-xs text-steel mt-1">
                  Access: {location.accessInstructions}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <div className="mt-3 pt-3 border-t border-line">
              <p className="text-sm text-steel">
                <span className="font-medium text-bone">Job Details:</span> {description}
              </p>
            </div>
          )}
        </div>
      </SummarySection>

      {/* Pricing Breakdown */}
      <Card variant="glass" className="p-4">
        <h3 className="text-lg font-bold text-bone mb-4">Payment Summary</h3>

        <div className="space-y-3">
          {/* Service Cost */}
          <div className="flex justify-between text-sm">
            <span className="text-steel">
              Service Cost
              {quantity && quantity > 1 && ` (x${quantity})`}
            </span>
            <span className="text-bone">{formatPrice(totalAmount)}</span>
          </div>

          {/* Platform Fee */}
          <div className="flex justify-between text-sm">
            <span className="text-steel">Platform Fee</span>
            <span className="text-bone">{formatPrice(platformFee)}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-line pt-3">
            <div className="flex justify-between">
              <span className="text-bone font-medium">Total Amount</span>
              <span className="text-bone font-bold">
                {formatPrice(totalAmount + platformFee)}
              </span>
            </div>
          </div>

          {/* Escrow Deposit */}
          <div className="bg-charcoal rounded-lg p-3 mt-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-bone font-medium">Escrow Deposit Required</p>
                <p className="text-xs text-steel">
                  {paymentPlan?.depositPercentage || 20}% of total - Refundable
                </p>
              </div>
              <div className="text-right">
                <p className="text-lumen-ink font-bold text-lg">
                  {formatPrice(escrowDeposit)}
                </p>
                <p className="text-xs text-steel">Due now</p>
              </div>
            </div>
          </div>

          {/* Remaining Balance */}
          <div className="flex justify-between text-sm text-steel">
            <span>Remaining Balance</span>
            <span>
              {formatPrice(totalAmount + platformFee - escrowDeposit)} (due after completion)
            </span>
          </div>
        </div>
      </Card>

      {/* Terms Notice */}
      <div className="bg-charcoal/50 rounded-lg p-4 text-sm text-steel">
        <p className="font-medium text-bone mb-2">Important:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Your deposit is held in escrow until job completion</li>
          <li>Full refund if technician cancels or no-shows</li>
          <li>Remaining balance is due after job verification</li>
          <li>
            By proceeding, you agree to our{' '}
            <a href="/terms" className="text-lumen-ink hover:underline">
              Terms of Service
            </a>
          </li>
        </ul>
      </div>

      {/* SMS Confirmation Notice */}
      {phoneNumber && (
        <Card variant="default" className="p-4 border-lumen/30 bg-lumen/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-lumen/20 flex items-center justify-center flex-shrink-0">
              <PhoneIcon className="w-5 h-5 text-lumen-ink" />
            </div>
            <div className="flex-1">
              <p className="text-bone font-medium text-sm">
                SMS Confirmation
              </p>
              <p className="text-steel text-xs mt-1">
                You'll receive an SMS confirmation at{' '}
                <span className="text-lumen-ink font-medium">{phoneNumber}</span>
              </p>
              {onEditPhoneNumber && (
                <button
                  type="button"
                  onClick={onEditPhoneNumber}
                  disabled={isProcessing}
                  className={clsx(
                    'mt-2 text-xs text-lumen-ink hover:text-lumen-ink',
                    'underline underline-offset-2',
                    'transition-colors duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  aria-label="Edit phone number"
                >
                  Change phone number
                </button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

/**
 * Summary Section Component
 */
interface SummarySectionProps {
  title: string;
  stepNumber: number;
  onEdit?: () => void;
  isProcessing?: boolean;
  children: React.ReactNode;
}

const SummarySection: React.FC<SummarySectionProps> = ({
  title,
  stepNumber,
  onEdit,
  isProcessing,
  children,
}) => {
  return (
    <Card variant="default" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-lumen text-on-lumen text-xs font-bold flex items-center justify-center">
            {stepNumber}
          </span>
          <h3 className="text-bone font-medium">{title}</h3>
        </div>
        {onEdit && !isProcessing && (
          <button
            onClick={onEdit}
            className="text-sm text-lumen-ink hover:text-lumen-ink transition-colors"
            aria-label={`Edit ${title.toLowerCase()}`}
          >
            Edit
          </button>
        )}
      </div>
      {children}
    </Card>
  );
};

/**
 * Icon Components
 */
const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const ServiceIcon: React.FC = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const LocationIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      strokeWidth={2}
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const PhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

export default BookingSummary;
