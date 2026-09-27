import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  User,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { Booking, acceptBooking, rejectBooking } from '@/store/slices/bookingSlice';
import { useAppDispatch } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import CounterOfferModal from './CounterOfferModal';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';

interface BookingCardProps {
  booking: Booking;
  userRole: string;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, userRole }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);

  const handleAcceptBooking = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      await dispatch(acceptBooking(booking._id)).unwrap();
      toast.success('Booking accepted successfully!');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to accept booking'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectBooking = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;

    const reason = prompt('Please provide a reason for rejecting this booking (optional):');
    if (reason === null) return; // User cancelled

    try {
      setIsProcessing(true);
      await dispatch(rejectBooking({ bookingId: booking._id, reason })).unwrap();
      toast.success('Booking rejected. Finding another technician...');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to reject booking'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCounterOffer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCounterOfferModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; color: string; icon: React.ReactNode }
    > = {
      pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: <Clock className="h-4 w-4" />,
      },
      matching: {
        label: 'Finding Technician',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <Loader className="h-4 w-4 animate-spin" />,
      },
      assigned: {
        label: 'Assigned',
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: <User className="h-4 w-4" />,
      },
      accepted: {
        label: 'Accepted',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle className="h-4 w-4" />,
      },
      rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <XCircle className="h-4 w-4" />,
      },
      en_route: {
        label: 'En Route',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        icon: <MapPin className="h-4 w-4" />,
      },
      arrived: {
        label: 'Arrived',
        color: 'bg-teal-100 text-teal-800 border-teal-300',
        icon: <MapPin className="h-4 w-4" />,
      },
      in_progress: {
        label: 'In Progress',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <Loader className="h-4 w-4" />,
      },
      completed: {
        label: 'Completed',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle className="h-4 w-4" />,
      },
      verified: {
        label: 'Verified',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: <CheckCircle className="h-4 w-4" />,
      },
      paused: {
        label: 'Paused',
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: <AlertCircle className="h-4 w-4" />,
      },
      cancelled: {
        label: 'Cancelled',
        color: 'bg-surface-300 text-ink border-line-strong',
        icon: <XCircle className="h-4 w-4" />,
      },
      disputed: {
        label: 'Disputed',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <AlertCircle className="h-4 w-4" />,
      },
      paid: {
        label: 'Paid',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle className="h-4 w-4" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <div
        className={cn(
          'inline-flex items-center space-x-1 rounded-full border px-3 py-1 text-sm font-semibold',
          config.color
        )}
      >
        {config.icon}
        <span>{config.label}</span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString;
  };

  const getOtherParty = () => {
    if (userRole === 'customer') {
      return booking.technician;
    } else {
      return booking.customer;
    }
  };

  const otherParty = getOtherParty();

  return (
    <div
      className="rounded-lg border border-line bg-surface-200 p-4 sm:p-6 shadow-sm transition-all hover:shadow-md cursor-pointer"
      onClick={() => navigate(`/bookings/${booking._id}`)}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h3 className="text-base sm:text-lg font-semibold text-ink truncate">
              {booking.serviceType}
            </h3>
            {getStatusBadge(booking.status)}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">#{booking.bookingNumber}</p>
        </div>

        {booking.pricing && (
          <div className="text-left sm:text-right">
            <div className="text-xl sm:text-2xl font-bold text-ink">
              {booking.pricing.currency} {booking.pricing.totalAmount.toLocaleString()}
            </div>
            <p className="text-xs text-ink-muted">Total Amount</p>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-sm text-ink-muted">
        {booking.description}
      </p>

      {/* Details Grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Date & Time */}
        <div className="flex items-start space-x-2">
          <Calendar className="mt-0.5 h-4 w-4 text-ink-muted" />
          <div>
            <p className="text-sm font-medium text-ink">
              {formatDate(booking.timeSlot.date)}
            </p>
            <p className="text-xs text-ink-muted">
              {formatTime(booking.timeSlot.startTime)}
              {booking.timeSlot.endTime && ` - ${formatTime(booking.timeSlot.endTime)}`}
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start space-x-2">
          <MapPin className="mt-0.5 h-4 w-4 text-ink-muted" />
          <div>
            <p className="text-sm font-medium text-ink">
              {booking.serviceLocation.city || 'Service Location'}
            </p>
            <p className="line-clamp-1 text-xs text-ink-muted">
              {booking.serviceLocation.address}
            </p>
          </div>
        </div>

        {/* Other Party (Customer or Technician) */}
        {otherParty && (
          <div
            className="flex items-start space-x-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${otherParty._id}`);
            }}
            title={`View ${otherParty.firstName} ${otherParty.lastName}'s profile`}
          >
            <User className="mt-0.5 h-4 w-4 text-ink-muted" />
            <div>
              <p className="text-sm font-medium text-ink hover:text-primary-600 transition-colors">
                {otherParty.firstName} {otherParty.lastName}
              </p>
              <p className="text-xs text-ink-muted">
                {userRole === 'customer' ? 'Technician' : 'Customer'}
              </p>
            </div>
          </div>
        )}

        {/* Urgency */}
        <div className="flex items-start space-x-2">
          <AlertCircle className="mt-0.5 h-4 w-4 text-ink-muted" />
          <div>
            <p className="text-sm font-medium text-ink capitalize">
              {booking.urgency} Priority
            </p>
            <p className="text-xs text-ink-muted">Urgency Level</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-line pt-3 sm:pt-4">
        {/* Payment Required Banner - Show for any booking with pending payment */}
        {userRole === 'customer' && booking.bookingFee?.status === 'pending' && (
          <div className="flex-1 rounded-lg bg-red-900/20 border border-red-800 p-3 mr-2">
            <p className="text-sm text-red-300 font-medium">
              🚨 Payment Required: Complete booking fee payment to proceed
            </p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            navigate(`/bookings/${booking._id}`);
          }}
          className="w-full sm:w-auto"
        >
          View Details
        </Button>

        {/* Complete Payment Button - Show for ANY booking with pending payment */}
        {userRole === 'customer' && booking.bookingFee?.status === 'pending' && (
          <Button
            variant="primary"
            size="sm"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              navigate(`/bookings/${booking._id}?action=pay`);
            }}
            className="w-full sm:w-auto flex items-center justify-center bg-red-600 hover:bg-red-700"
          >
            <DollarSign className="mr-1 h-4 w-4" />
            Complete Payment Now
          </Button>
        )}

        {/* Status-specific actions */}
        {userRole === 'technician' && booking.status === 'assigned' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCounterOffer}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              Counter Offer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectBooking}
              disabled={isProcessing}
              className="w-full sm:w-auto text-red-600 border-red-300 hover:bg-red-50"
            >
              {isProcessing ? 'Processing...' : 'Decline'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAcceptBooking}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              {isProcessing ? 'Processing...' : 'Accept'}
            </Button>
          </>
        )}

        {userRole === 'customer' && booking.status === 'completed' && (
          <Button
            variant="primary"
            size="sm"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              // Handle payment
            }}
            className="w-full sm:w-auto flex items-center justify-center"
          >
            <DollarSign className="mr-1 h-4 w-4" />
            Pay Now
          </Button>
        )}
      </div>

      {/* Counter Offer Modal */}
      <CounterOfferModal
        booking={booking}
        isOpen={showCounterOfferModal}
        onClose={() => setShowCounterOfferModal(false)}
      />
    </div>
  );
};

export default BookingCard;
