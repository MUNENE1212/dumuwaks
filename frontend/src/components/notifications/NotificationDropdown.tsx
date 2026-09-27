import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationAction,
  clearReadNotifications,
  clearError,
  type Notification
} from '@/store/slices/notificationSlice';
import type { RootState, AppDispatch } from '@/store/index';
import { Bell, X, Check, Trash2, CheckCheck } from 'lucide-react';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown = ({ isOpen, onClose }: NotificationDropdownProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications, unreadCount, isLoading, error } = useSelector(
    (state: RootState) => state.notifications
  );

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchNotifications({ page: 1, limit: 20 }));
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleMarkAsRead = async (notificationId: string) => {
    await dispatch(markNotificationAsRead(notificationId));
  };

  const handleMarkAllAsRead = async () => {
    await dispatch(markAllNotificationsAsRead());
  };

  const handleDelete = async (notificationId: string) => {
    await dispatch(deleteNotificationAction(notificationId));
  };

  const handleClearRead = async () => {
    await dispatch(clearReadNotifications());
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.relatedBooking) {
      return `/bookings/${notification.relatedBooking}`;
    }
    if (notification.relatedPost) {
      return `/posts/${notification.relatedPost}`;
    }
    if (notification.relatedMessage) {
      return `/messages`;
    }
    return null;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-200';
      case 'high':
        return 'bg-orange-100 border-orange-200';
      case 'normal':
        return 'bg-blue-100 border-blue-200';
      default:
        return 'bg-surface-300 border-line';
    }
  };

  const getCategoryIcon = (category: string) => {
    // You can add more icons based on category
    return <Bell className="w-4 h-4" />;
  };

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter((n: Notification) => !n.isRead)
    : notifications;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-96 bg-surface-200 rounded-lg shadow-xl border border-line z-50 max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-line">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-ink">Notifications</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-surface-300 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-ink-muted" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-on-lumen'
                  : 'bg-surface-300 text-ink hover:bg-surface-400'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'unread'
                  ? 'bg-blue-600 text-on-lumen'
                  : 'bg-surface-300 text-ink hover:bg-surface-400'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Actions */}
          {notifications.length > 0 && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
              <button
                onClick={handleClearRead}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface-300 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear read
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Notifications List */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="w-12 h-12 text-ink-muted mb-3" />
              <p className="text-ink-muted text-sm">
                {activeTab === 'unread'
                  ? 'No unread notifications'
                  : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {filteredNotifications.map((notification: Notification) => {
                const link = getNotificationLink(notification);
                const NotificationContent = (
                  <div
                    className={`p-4 hover:bg-surface-100 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    } ${getPriorityColor(notification.priority)} border-l-4`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        !notification.isRead ? 'bg-blue-600 text-on-lumen' : 'bg-surface-400 text-ink-muted'
                      }`}>
                        {getCategoryIcon(notification.category)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-medium ${
                            !notification.isRead ? 'text-ink' : 'text-ink'
                          }`}>
                            {notification.title}
                          </h4>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.isRead && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMarkAsRead(notification._id);
                                }}
                                className="p-1 hover:bg-surface-200 rounded transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(notification._id);
                              }}
                              className="p-1 hover:bg-surface-200 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-ink-muted" />
                            </button>
                          </div>
                        </div>

                        <p className="text-sm text-ink-muted mt-1 line-clamp-2">
                          {notification.body}
                        </p>

                        {/* Sender info if available */}
                        {notification.sender && (
                          <p className="text-xs text-ink-muted mt-1">
                            From: {notification.sender.firstName} {notification.sender.lastName}
                          </p>
                        )}

                        {/* Time */}
                        <p className="text-xs text-ink-muted mt-2">
                          {getTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                return link ? (
                  <Link
                    key={notification._id}
                    to={link}
                    onClick={() => {
                      if (!notification.isRead) {
                        handleMarkAsRead(notification._id);
                      }
                      onClose();
                    }}
                  >
                    {NotificationContent}
                  </Link>
                ) : (
                  <div key={notification._id}>
                    {NotificationContent}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-line bg-surface-100">
            <Link
              to="/notifications"
              onClick={onClose}
              className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all notifications
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationDropdown;
