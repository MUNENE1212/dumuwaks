import axios from '@/lib/axios';

/**
 * Get all notifications for the current user
 */
export const getNotifications = async (params: {
  page?: number;
  limit?: number;
  category?: string;
  isRead?: boolean;
} = {}) => {
  const response = await axios.get('/notifications', { params });
  return response.data;
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async () => {
  const response = await axios.get('/notifications', {
    params: { isRead: false, limit: 1 }
  });
  return response.data.unreadCount || 0;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId: string) => {
  const response = await axios.put(`/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  const response = await axios.put('/notifications/mark-all-read');
  return response.data;
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId: string) => {
  const response = await axios.delete(`/notifications/${notificationId}`);
  return response.data;
};

/**
 * Clear all read notifications
 */
export const clearReadNotifications = async () => {
  const response = await axios.delete('/notifications/clear-read');
  return response.data;
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async () => {
  const response = await axios.get('/notifications/preferences');
  return response.data;
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (preferences: {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  whatsappNotifications?: boolean;
}) => {
  const response = await axios.put('/notifications/preferences', preferences);
  return response.data;
};
