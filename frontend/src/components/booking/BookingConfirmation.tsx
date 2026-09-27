import React from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { BookingConfirmationData, EscrowStatus } from '@/types/booking';
import { format } from 'date-fns';

/**
 * Props for BookingConfirmation component
 */
interface BookingConfirmationProps {
  confirmation: BookingConfirmationData;
  phoneNumber?: string;
  onViewBooking?: () => void;
  onContactTechnician?: () => void;
  onNewBooking?: () => void;
  className?: string;
}

/**
 * BookingConfirmation Component
 * Post-booking confirmation screen showing:
 * - Booking ID and reference
 * - Escrow status
 * - Next steps instructions
 * - Contact technician button
 * - View booking details button
 */
const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  confirmation,
  phoneNumber,
  onViewBooking,
  onContactTechnician,
  onNewBooking,
  className,
}) => {
  const navigate = useNavigate();

  const {
    bookingId,
    bookingNumber,
    escrowStatus,
    escrowDeposit,
    service,
    technician,
    scheduledDate,
    scheduledTime,
    nextSteps,
  } = confirmation;

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

  /**
   * Get escrow status display info
   */
  const getEscrowStatusInfo = (
    status: EscrowStatus
  ): { label: string; color: string; icon: React.ReactNode } => {
    switch (status) {
      case 'funded':
        return {
          label: 'Deposit Received',
          color: 'text-success',
          icon: <CheckCircleIcon className="w-6 h-6" />,
        };
      case 'pending':
        return {
          label: 'Payment Processing',
          color: 'text-lumen-ink',
          icon: <ClockIcon className="w-6 h-6" />,
        };
      case 'partially_released':
        return {
          label: 'Partially Released',
          color: 'text-warning',
          icon: <ClockIcon className="w-6 h-6" />,
        };
      case 'released':
        return {
          label: 'Payment Complete',
          color: 'text-success',
          icon: <CheckCircleIcon className="w-6 h-6" />,
        };
      case 'refunded':
        return {
          label: 'Refunded',
          color: 'text-steel',
          icon: <RefreshIcon className="w-6 h-6" />,
        };
      case 'disputed':
        return {
          label: 'Under Dispute',
          color: 'text-error',
          icon: <AlertIcon className="w-6 h-6" />,
        };
      default:
        return {
          label: 'Unknown',
          color: 'text-steel',
          icon: <AlertIcon className="w-6 h-6" />,
        };
    }
  };

  const escrowInfo = getEscrowStatusInfo(escrowStatus);

  return (
    <div
      className={clsx('max-w-2xl mx-auto space-y-6', className)}
      data-testid="booking-confirmation"
    >
      {/* Success Header */}
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircleIcon className="w-10 h-10 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-bone">Booking Confirmed!</h1>
        <p className="text-steel mt-2">
          Your booking has been successfully created and your deposit is being processed.
        </p>
      </div>

      {/* Booking Reference Card */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-bone">Booking Reference</h2>
          <span className="text-lumen-ink font-mono font-bold text-lg">
            #{bookingNumber}
          </span>
        </div>

        {/* Service & Technician Info */}
        <div className="space-y-4">
          {/* Service */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-charcoal rounded-lg flex items-center justify-center text-lumen-ink">
              <ServiceIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-steel uppercase">Service</p>
              <p className="text-bone font-medium">{service.name}</p>
              <p className="text-xs text-steel">{service.category}</p>
            </div>
          </div>

          {/* Technician */}
          <div className="flex items-start gap-3">
            {technician.profilePicture ? (
              <img
                src={technician.profilePicture}
                alt={`${technician.firstName} ${technician.lastName}`}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-charcoal flex items-center justify-center text-bone font-bold text-sm">
                {technician.firstName[0]}
                {technician.lastName[0]}
              </div>
            )}
            <div className="flex-1">
              <p className="text-xs text-steel uppercase">Technician</p>
              <p className="text-bone font-medium">
                {technician.firstName} {technician.lastName}
              </p>
            </div>
          </div>

          {/* Schedule */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-charcoal rounded-lg flex items-center justify-center text-lumen-ink">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-steel uppercase">Scheduled</p>
              <p className="text-bone font-medium">{formatDate(scheduledDate)}</p>
              <p className="text-sm text-steel">at {formatTime(scheduledTime)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Escrow Status Card */}
      <Card variant="default" className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx('w-12 h-12 rounded-full bg-charcoal flex items-center justify-center', escrowInfo.color)}>
              {escrowInfo.icon}
            </div>
            <div>
              <p className="text-sm text-steel">Escrow Status</p>
              <p className={clsx('font-semibold', escrowInfo.color)}>
                {escrowInfo.label}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-steel">Deposit Amount</p>
            <p className="text-lg font-bold text-bone">
              KES {escrowDeposit.toLocaleString()}
            </p>
          </div>
        </div>

        {escrowStatus === 'funded' && (
          <div className="mt-4 p-3 bg-success/10 rounded-lg border border-success/20">
            <p className="text-sm text-success flex items-center gap-2">
              <ShieldIcon className="w-4 h-4" />
              Your deposit is secured in escrow until job completion
            </p>
          </div>
        )}
      </Card>

      {/* SMS Confirmation Notice */}
      {phoneNumber && (
        <Card variant="default" className="p-6 border-lumen/30 bg-lumen/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-lumen/20 flex items-center justify-center flex-shrink-0">
              <PhoneIcon className="w-5 h-5 text-lumen-ink" />
            </div>
            <div>
              <p className="text-bone font-medium">
                You'll receive SMS updates
              </p>
              <p className="text-sm text-steel mt-1">
                Booking confirmations and reminders will be sent to{' '}
                <span className="text-lumen-ink font-medium">{phoneNumber}</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Next Steps */}
      <Card variant="default" className="p-6">
        <h3 className="text-lg font-semibold text-bone mb-4">What Happens Next?</h3>
        <ol className="space-y-3">
          {nextSteps.map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-lumen text-on-lumen text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {index + 1}
              </span>
              <p className="text-sm text-steel">{step}</p>
            </li>
          ))}
        </ol>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          variant="primary"
          onClick={
            onViewBooking || (() => navigate(`/bookings/${bookingId}`))
          }
          className="w-full py-3"
        >
          View Booking Details
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={
              onContactTechnician ||
              (() => navigate(`/messages?technician=${technician._id}`))
            }
          >
            <MessageIcon className="w-4 h-4 mr-2" />
            Contact Technician
          </Button>
          <Button
            variant="outline"
            onClick={onNewBooking || (() => navigate('/bookings/create'))}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Support Info */}
      <div className="text-center py-4">
        <p className="text-sm text-steel">
          Need help?{' '}
          <a
            href="/support"
            className="text-lumen-ink hover:text-lumen-ink underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

/**
 * Icon Components
 */
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const ServiceIcon: React.FC<{ className?: string }> = ({ className }) => (
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

const MessageIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M12 4v16m8-8H4"
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

export default BookingConfirmation;
