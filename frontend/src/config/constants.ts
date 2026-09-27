// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// App Configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Dumuwaks';
export const APP_DESCRIPTION = import.meta.env.VITE_APP_DESCRIPTION || 'Professional Maintenance & Repair Services Platform';

// Feature Flags
export const ENABLE_2FA = import.meta.env.VITE_ENABLE_2FA === 'true';
export const ENABLE_SOCIAL_LOGIN = import.meta.env.VITE_ENABLE_SOCIAL_LOGIN === 'true';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File Upload
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

// User Roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  TECHNICIAN: 'technician',
  ADMIN: 'admin',
  CORPORATE: 'corporate',
  SUPPORT: 'support',
} as const;

// Booking Status
export const BOOKING_STATUS = {
  PENDING: 'pending',
  AWAITING_ACCEPTANCE: 'awaiting_acceptance',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
  REFUNDED: 'refunded',
} as const;

// Service Categories
export const SERVICE_CATEGORIES = [
  'plumbing',
  'electrical',
  'carpentry',
  'masonry',
  'painting',
  'hvac',
  'welding',
  'other',
] as const;

// Urgency Levels
export const URGENCY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// Date Formats
export const DATE_FORMAT = 'MMM dd, yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'dumuwaks_token',
  REFRESH_TOKEN: 'dumuwaks_refresh_token',
  USER: 'dumuwaks_user',
  THEME: 'dumuwaks_theme',
} as const;
