/**
 * BookingNotificationToast Component
 *
 * Displays real-time booking notifications as toast messages.
 * Shows status changes, assignments, counter-offers, and payment updates.
 *
 * Usage:
 * <BookingNotificationToast />
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Truck,
  MapPin,
  Wrench,
  CheckCircle,
  XCircle,
  DollarSign,
  User,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import {
  type BookingNotification,
  type BookingStatusChangedPayload,
  type BookingAssignedPayload,
  type BookingCounterOfferPayload,
  type BookingPaymentUpdatePayload,
  BOOKING_NOTIFICATION_EVENTS,
  type BookingStatus,
  type BookingNotificationType,
} from '@/types/bookingNotification';
import { formatDistanceToNow } from 'date-fns';

interface BookingNotificationToastProps {
  notification: BookingNotification;
  onClose?: () => void;
  onMarkAsRead?: (id: string) => void;
  showActions?: boolean;
}

/**
 * Get icon component based on booking status
 */
function getStatusIcon(status: BookingStatus): React.ReactNode {
  switch (status) {
    case 'en_route':
      return <Truck className="w-5 h-5 text-blue-400" />;
    case 'arrived':
      return <MapPin className="w-5 h-5 text-green-400" />;
    case 'in_progress':
      return <Wrench className="w-5 h-5 text-yellow-400" />;
    case 'completed':
    case 'verified':
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    case 'cancelled':
      return <XCircle className="w-5 h-5 text-red-400" />;
    case 'paid':
      return <DollarSign className="w-5 h-5 text-green-400" />;
    case 'payment_pending':
      return <Clock className="w-5 h-5 text-yellow-400" />;
    default:
      return <Bell className="w-5 h-5 text-steel" />;
  }
}

/**
 * Get icon based on notification type
 */
function getNotificationTypeIcon(type: BookingNotificationType): React.ReactNode {
  switch (type) {
    case BOOKING_NOTIFICATION_EVENTS.STATUS_CHANGED:
      return <AlertCircle className="w-5 h-5 text-lumen-ink" />;
    case BOOKING_NOTIFICATION_EVENTS.ASSIGNED:
      return <User className="w-5 h-5 text-lumen-ink" />;
    case BOOKING_NOTIFICATION_EVENTS.COUNTER_OFFER:
      return <DollarSign className="w-5 h-5 text-lumen-ink" />;
    case BOOKING_NOTIFICATION_EVENTS.PAYMENT_UPDATE:
      return <DollarSign className="w-5 h-5 text-lumen-ink" />;
    default:
      return <Bell className="w-5 h-5 text-lumen-ink" />;
  }
}

/**
 * Get background color class based on notification type and urgency
 */
function getNotificationBgClass(
  type: BookingNotificationType,
  payload: BookingNotification['payload']
): string {
  if (type === BOOKING_NOTIFICATION_EVENTS.STATUS_CHANGED) {
    const statusPayload = payload as BookingStatusChangedPayload;
    const status = statusPayload.newStatus;

    switch (status) {
      case 'en_route':
      case 'arrived':
        return 'bg-blue-900/30 border-blue-500/30';
      case 'in_progress':
        return 'bg-yellow-900/30 border-yellow-500/30';
      case 'completed':
      case 'verified':
      case 'paid':
        return 'bg-green-900/30 border-green-500/30';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-900/30 border-red-500/30';
      default:
        return 'bg-charcoal border-line';
    }
  }

  if (type === BOOKING_NOTIFICATION_EVENTS.COUNTER_OFFER) {
    return 'bg-yellow-900/30 border-yellow-500/30';
  }

  if (type === BOOKING_NOTIFICATION_EVENTS.PAYMENT_UPDATE) {
    const paymentPayload = payload as BookingPaymentUpdatePayload;
    if (paymentPayload.status === 'completed') {
      return 'bg-green-900/30 border-green-500/30';
    }
    if (paymentPayload.status === 'failed') {
      return 'bg-red-900/30 border-red-500/30';
    }
  }

  return 'bg-charcoal border-line';
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp));
  } catch {
    return 'Just now';
  }
}

/**
 * StatusChangedContent component
 */
function StatusChangedContent({ payload }: { payload: BookingStatusChangedPayload }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {getStatusIcon(payload.newStatus)}
        <span className="text-sm text-bone font-medium">{payload.message}</span>
      </div>
      {payload.note && (
        <p className="text-xs text-steel ml-7">{payload.note}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-steel ml-7">
        <span>Booking #{payload.bookingNumber}</span>
        {payload.pricing && (
          <span>{payload.pricing.currency} {payload.pricing.totalAmount.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}

/**
 * AssignedContent component
 */
function AssignedContent({ payload }: { payload: BookingAssignedPayload }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-bone font-medium">{payload.message}</p>
      {payload.technician && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-lumen/20 flex items-center justify-center">
            <User className="w-4 h-4 text-lumen-ink" />
          </div>
          <div>
            <p className="text-sm text-bone font-medium">{payload.technician.name}</p>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">★</span>
              <span className="text-xs text-steel">{payload.technician.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-steel">
        <Clock className="w-3 h-3" />
        <span>ETA: {payload.eta || 'Calculating...'}</span>
      </div>
    </div>
  );
}

/**
 * CounterOfferContent component
 */
function CounterOfferContent({ payload }: { payload: BookingCounterOfferPayload }) {
  const { offer, technician } = payload;
  const percentageChange = offer.originalAmount
    ? Math.round(((offer.amount - offer.originalAmount) / offer.originalAmount) * 100)
    : 0;

  return (
    <div className="space-y-2">
      <p className="text-sm text-bone font-medium">{payload.message}</p>
      <div className="bg-charcoal rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-steel">Proposed Amount</span>
          <span className="text-sm font-bold text-lumen-ink">
            KES {offer.amount.toLocaleString()}
          </span>
        </div>
        {offer.originalAmount && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-steel">Original</span>
            <span className="text-xs text-steel line-through">
              KES {offer.originalAmount.toLocaleString()}
            </span>
          </div>
        )}
        {percentageChange !== 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-steel">Change</span>
            <span className={`text-xs font-medium ${percentageChange > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {percentageChange > 0 ? '+' : ''}{percentageChange}%
            </span>
          </div>
        )}
        {offer.reason && (
          <div className="pt-2 border-t border-line">
            <p className="text-xs text-steel">Reason: {offer.reason}</p>
          </div>
        )}
      </div>
      {technician && (
        <p className="text-xs text-steel">From: {technician.name}</p>
      )}
    </div>
  );
}

/**
 * PaymentUpdateContent component
 */
function PaymentUpdateContent({ payload }: { payload: BookingPaymentUpdatePayload }) {
  const isSuccess = payload.status === 'completed';
  const isFailed = payload.status === 'failed';

  return (
    <div className="space-y-2">
      <p className="text-sm text-bone font-medium">{payload.message}</p>
      <div className="flex items-center gap-2">
        {isSuccess ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : isFailed ? (
          <XCircle className="w-5 h-5 text-red-400" />
        ) : (
          <Clock className="w-5 h-5 text-yellow-400" />
        )}
        <div>
          <p className="text-sm font-medium text-bone">
            {payload.currency} {payload.amount.toLocaleString()}
          </p>
          {payload.method && (
            <p className="text-xs text-steel capitalize">{payload.method}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * BookingNotificationToast component
 */
const BookingNotificationToast: React.FC<BookingNotificationToastProps> = ({
  notification,
  onClose,
  onMarkAsRead,
  showActions = true,
}) => {
  const { type, payload, read, createdAt } = notification;
  const bgClass = getNotificationBgClass(type, payload);

  // Get booking ID for navigation
  const bookingId =
    'bookingId' in payload ? payload.bookingId : undefined;

  const handleClick = () => {
    if (!read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const renderContent = () => {
    switch (type) {
      case BOOKING_NOTIFICATION_EVENTS.STATUS_CHANGED:
        return <StatusChangedContent payload={payload as BookingStatusChangedPayload} />;
      case BOOKING_NOTIFICATION_EVENTS.ASSIGNED:
        return <AssignedContent payload={payload as BookingAssignedPayload} />;
      case BOOKING_NOTIFICATION_EVENTS.COUNTER_OFFER:
        return <CounterOfferContent payload={payload as BookingCounterOfferPayload} />;
      case BOOKING_NOTIFICATION_EVENTS.PAYMENT_UPDATE:
        return <PaymentUpdateContent payload={payload as BookingPaymentUpdatePayload} />;
      default:
        return <p className="text-sm text-bone">New booking update</p>;
    }
  };

  return (
    <div
      className={`relative rounded-lg border shadow-lg overflow-hidden transition-all duration-300 ${bgClass} ${
        !read ? 'ring-2 ring-lumen/50' : ''
      }`}
    >
      {bookingId ? (
        <Link to={`/bookings/${bookingId}`} onClick={handleClick} className="block">
          <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                {getNotificationTypeIcon(type)}
              </div>
              <h4 className="text-sm font-semibold text-bone">
                {type === BOOKING_NOTIFICATION_EVENTS.STATUS_CHANGED
                  ? 'Booking Update'
                  : type === BOOKING_NOTIFICATION_EVENTS.ASSIGNED
                  ? 'Technician Assigned'
                  : type === BOOKING_NOTIFICATION_EVENTS.COUNTER_OFFER
                  ? 'Counter Offer'
                  : 'Payment Update'}
              </h4>
            </div>
            <div className="flex items-center gap-1">
              {!read && (
                <span className="w-2 h-2 bg-lumen rounded-full animate-pulse" />
              )}
              {onClose && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-1 hover:bg-surface-300 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-steel" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {renderContent()}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-line">
            <span className="text-xs text-steel">{formatTimeAgo(createdAt)}</span>
            {showActions && bookingId && (
              <span className="text-xs text-lumen-ink flex items-center gap-1">
                View details
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </Link>
      ) : (
        <div onClick={handleClick} className="block cursor-pointer">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  {getNotificationTypeIcon(type)}
                </div>
                <h4 className="text-sm font-semibold text-bone">
                  {type === BOOKING_NOTIFICATION_EVENTS.STATUS_CHANGED
                    ? 'Booking Update'
                    : type === BOOKING_NOTIFICATION_EVENTS.ASSIGNED
                    ? 'Technician Assigned'
                    : type === BOOKING_NOTIFICATION_EVENTS.COUNTER_OFFER
                    ? 'Counter Offer'
                    : 'Payment Update'}
                </h4>
              </div>
              <div className="flex items-center gap-1">
                {!read && (
                  <span className="w-2 h-2 bg-lumen rounded-full animate-pulse" />
                )}
                {onClose && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onClose();
                    }}
                    className="p-1 hover:bg-surface-300 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-steel" />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            {renderContent()}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-line">
              <span className="text-xs text-steel">{formatTimeAgo(createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * BookingNotificationList component
 * Displays a list of booking notifications
 */
interface BookingNotificationListProps {
  notifications: BookingNotification[];
  onMarkAsRead?: (id: string) => void;
  onRemove?: (id: string) => void;
  maxItems?: number;
}

export const BookingNotificationList: React.FC<BookingNotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onRemove,
  maxItems = 10,
}) => {
  const displayedNotifications = notifications.slice(0, maxItems);

  if (displayedNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <Bell className="w-12 h-12 text-steel mb-3" />
        <p className="text-steel text-sm">No booking notifications</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayedNotifications.map((notification) => (
        <BookingNotificationToast
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
          onClose={() => onRemove?.(notification.id)}
        />
      ))}
    </div>
  );
};

/**
 * BookingNotificationBadge component
 * Shows unread count badge for booking notifications
 */
interface BookingNotificationBadgeProps {
  count: number;
  maxCount?: number;
}

export const BookingNotificationBadge: React.FC<BookingNotificationBadgeProps> = ({
  count,
  maxCount = 99,
}) => {
  if (count === 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count;

  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-on-lumen bg-lumen rounded-full animate-pulse-glow">
      {displayCount}
    </span>
  );
};

export default BookingNotificationToast;
