/**
 * useBookingNotifications Hook
 *
 * Custom hook for subscribing to real-time booking notification events.
 * Returns notifications and unread count for booking-related updates.
 *
 * Usage:
 * const { notifications, unreadCount, markAsRead, clearNotifications } = useBookingNotifications();
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useNavigate } from 'react-router-dom';
import socketService from '@/services/socket';
import {
  type BookingNotification,
  type BookingNotificationPayload,
  type BookingNotificationType,
  type BookingStatusChangedPayload,
  type BookingAssignedPayload,
  type BookingCounterOfferPayload,
  type BookingPaymentUpdatePayload,
  BOOKING_NOTIFICATION_EVENTS,
  getBookingNotificationTitle,
  getStatusUrgency,
} from '@/types/bookingNotification';
import { addNotification } from '@/store/slices/notificationSlice';
import toast from 'react-hot-toast';

interface UseBookingNotificationsOptions {
  /**
   * Whether to show toast notifications for new booking updates
   * @default true
   */
  showToasts?: boolean;
  /**
   * Maximum number of notifications to keep in state
   * @default 50
   */
  maxNotifications?: number;
  /**
   * Whether to play a sound on new notification
   * @default false
   */
  playSound?: boolean;
}

interface UseBookingNotificationsReturn {
  notifications: BookingNotification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (notificationId: string) => void;
  subscribeToBooking: (bookingId: string) => void;
  unsubscribeFromBooking: (bookingId: string) => void;
}

/**
 * Generate a unique ID for notifications
 */
function generateNotificationId(): string {
  return `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a BookingNotification from a socket payload
 */
function createNotification(
  type: BookingNotificationType,
  payload: BookingNotificationPayload
): BookingNotification {
  return {
    id: generateNotificationId(),
    type,
    payload,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get toast message based on notification type and payload
 */
function getToastMessage(
  type: BookingNotificationType,
  payload: BookingNotificationPayload
): string {
  switch (type) {
    case BOOKING_NOTIFICATION_EVENTS.STATUS_CHANGED:
      return (payload as BookingStatusChangedPayload).message;
    case BOOKING_NOTIFICATION_EVENTS.ASSIGNED:
      return (payload as BookingAssignedPayload).message;
    case BOOKING_NOTIFICATION_EVENTS.COUNTER_OFFER:
      return (payload as BookingCounterOfferPayload).message;
    case BOOKING_NOTIFICATION_EVENTS.PAYMENT_UPDATE:
      return (payload as BookingPaymentUpdatePayload).message;
    default:
      return 'New booking update';
  }
}

/**
 * Get toast duration based on urgency
 */
function getToastDuration(
  type: BookingNotificationType,
  payload: BookingNotificationPayload
): number {
  if (type === BOOKING_NOTIFICATION_EVENTS.STATUS_CHANGED) {
    const statusPayload = payload as BookingStatusChangedPayload;
    const urgency = getStatusUrgency(statusPayload.newStatus);
    switch (urgency) {
      case 'urgent':
        return 8000; // 8 seconds for urgent
      case 'high':
        return 6000; // 6 seconds for high
      default:
        return 4000; // 4 seconds for normal
    }
  }
  return 5000;
}

/**
 * Play notification sound
 */
function playNotificationSound(): void {
  try {
    // Create a simple notification sound using Web Audio API
    const AudioContextClass = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    // Ignore audio errors
  }
}

/**
 * useBookingNotifications Hook
 */
export function useBookingNotifications(
  options: UseBookingNotificationsOptions = {}
): UseBookingNotificationsReturn {
  const { showToasts = true, maxNotifications = 50, playSound = false } = options;

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const notificationsRef = useRef<BookingNotification[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  /**
   * Add a new notification
   */
  const addBookingNotification = useCallback(
    (type: BookingNotificationType, payload: BookingNotificationPayload) => {
      const notification = createNotification(type, payload);

      setNotifications((prev) => {
        const updated = [notification, ...prev];
        // Keep only the most recent notifications
        return updated.slice(0, maxNotifications);
      });

      // Show toast notification
      if (showToasts) {
        const message = getToastMessage(type, payload);
        const duration = getToastDuration(type, payload);

        const bookingId =
          'bookingId' in payload ? payload.bookingId : undefined;

        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-charcoal border border-line shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-line ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <span className="text-lumen-ink text-xl">
                      {type === BOOKING_NOTIFICATION_EVENTS.STATUS_CHANGED
                        ? '📋'
                        : type === BOOKING_NOTIFICATION_EVENTS.ASSIGNED
                        ? '👤'
                        : type === BOOKING_NOTIFICATION_EVENTS.COUNTER_OFFER
                        ? '💰'
                        : '💳'}
                    </span>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-bone">
                      {getBookingNotificationTitle(type)}
                    </p>
                    <p className="mt-1 text-sm text-steel">{message}</p>
                    {bookingId && (
                      <button
                        onClick={() => {
                          navigate(`/bookings/${bookingId}`);
                          toast.dismiss(t.id);
                        }}
                        className="mt-2 text-sm font-medium text-lumen-ink hover:text-lumen-ink/80"
                      >
                        View Booking
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex border-l border-line">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-steel hover:text-bone focus:outline-none"
                >
                  Close
                </button>
              </div>
            </div>
          ),
          {
            duration,
            position: 'top-right',
          }
        );
      }

      // Play sound if enabled
      if (playSound) {
        playNotificationSound();
      }

      // Also dispatch to the main notification slice for the navbar badge
      dispatch(
        addNotification({
          _id: notification.id,
          recipient: user?._id || '',
          type: 'booking',
          title: getBookingNotificationTitle(type),
          body: getToastMessage(type, payload),
          category: 'booking',
          relatedBooking: 'bookingId' in payload ? payload.bookingId : undefined,
          isRead: false,
          priority: type === BOOKING_NOTIFICATION_EVENTS.STATUS_CHANGED
            ? getStatusUrgency((payload as BookingStatusChangedPayload).newStatus)
            : 'normal',
          createdAt: notification.createdAt,
          updatedAt: notification.createdAt,
        })
      );
    },
    [showToasts, playSound, maxNotifications, dispatch, user?._id, navigate]
  );

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Remove a specific notification
   */
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  /**
   * Subscribe to a specific booking's updates
   */
  const subscribeToBooking = useCallback((bookingId: string) => {
    socketService.subscribeToBooking(bookingId);
  }, []);

  /**
   * Unsubscribe from a specific booking's updates
   */
  const unsubscribeFromBooking = useCallback((bookingId: string) => {
    socketService.unsubscribeFromBooking(bookingId);
  }, []);

  /**
   * Set up socket event listeners
   */
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    setIsConnected(socketService.isConnected());

    // Status change handler
    const handleStatusChanged = (data: BookingStatusChangedPayload) => {
      addBookingNotification(BOOKING_NOTIFICATION_EVENTS.STATUS_CHANGED, data);
    };

    // Assignment handler
    const handleAssigned = (data: BookingAssignedPayload) => {
      addBookingNotification(BOOKING_NOTIFICATION_EVENTS.ASSIGNED, data);
    };

    // Counter-offer handler
    const handleCounterOffer = (data: BookingCounterOfferPayload) => {
      addBookingNotification(BOOKING_NOTIFICATION_EVENTS.COUNTER_OFFER, data);
    };

    // Payment update handler
    const handlePaymentUpdate = (data: BookingPaymentUpdatePayload) => {
      addBookingNotification(BOOKING_NOTIFICATION_EVENTS.PAYMENT_UPDATE, data);
    };

    // Error handler
    const handleError = (error: { error: string }) => {
      console.error('[BookingNotifications] Socket error:', error.error);
    };

    // Register event listeners
    socketService.onBookingStatusChanged(handleStatusChanged);
    socketService.onBookingAssigned(handleAssigned);
    socketService.onBookingCounterOffer(handleCounterOffer);
    socketService.onBookingPaymentUpdate(handlePaymentUpdate);
    socketService.onBookingError(handleError);

    // Cleanup on unmount
    return () => {
      socketService.offBookingStatusChanged(handleStatusChanged);
      socketService.offBookingAssigned(handleAssigned);
      socketService.offBookingCounterOffer(handleCounterOffer);
      socketService.offBookingPaymentUpdate(handlePaymentUpdate);
      socketService.offBookingError(handleError);
    };
  }, [isAuthenticated, user, addBookingNotification]);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    subscribeToBooking,
    unsubscribeFromBooking,
  };
}

export default useBookingNotifications;
