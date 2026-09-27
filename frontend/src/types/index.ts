// Subscription Types
export interface Subscription {
  plan: 'free' | 'pro' | 'premium';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate?: string;
  endDate?: string;
  trialEndsAt?: string;
  autoRenew: boolean;
  features: {
    boostedVisibility: boolean;
    boostedPosts: boolean;
    prioritySupport: boolean;
    unlimitedPortfolio: boolean;
    advancedAnalytics: boolean;
    customBadge: boolean;
    featuredListing: boolean;
  };
}

// Re-export booking notification types
export type {
  BookingStatus,
  PaymentStatus,
  CounterOfferStatus,
  BookingStatusChangedPayload,
  BookingNotificationTechnician,
  BookingNotificationCustomer,
  BookingAssignedPayload,
  CounterOfferInfo,
  BookingCounterOfferPayload,
  BookingPaymentUpdatePayload,
  BookingNotificationPayload,
  BookingNotificationType,
  BookingNotification,
  BookingNotificationState,
} from './bookingNotification';

export {
  BOOKING_NOTIFICATION_EVENTS,
  getBookingNotificationTitle,
  getStatusIcon,
  getStatusUrgency,
} from './bookingNotification';

// User Types
export interface User {
  _id: string;
  id: string; // Alias for _id for compatibility
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: 'customer' | 'technician' | 'admin' | 'corporate' | 'support';
  profilePicture?: string;
  bio?: string;
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  isEmailVerified?: boolean;
  rating?: {
    average: number;
    count: number;
  };
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
    city?: string;
    county?: string;
    country?: string;
  };
  skills?: Array<{
    name: string;
    category: string;
    yearsOfExperience: number;
    certifications?: string[];
  }>;
  availability?: {
    isAvailable: boolean;
    schedule?: Record<string, unknown>;
  };
  subscription?: Subscription;
  createdAt: string;
  updatedAt: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'customer' | 'technician';
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  user: User;
  requires2FA?: boolean;
}

// Booking Types
export interface Booking {
  _id: string;
  customer: User;
  technician?: User;
  serviceType: string;
  description: string;
  status: string;
  scheduledDate: string;
  serviceLocation: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  pricing?: {
    estimatedCost: number;
    finalCost?: number;
    currency: string;
  };
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  contactsHidden?: boolean;
  contactsHiddenReason?: string;
  bookingFee?: {
    status: string;
    amount: number;
  };
  /** `intasend`: full price held in escrow (EscrowPanel). `legacy`: 20% booking fee. */
  paymentProvider?: 'legacy' | 'intasend';
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  count: number;
  total: number;
  page: number;
  pages: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

// Error Types
export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
}

// Filter Types
export interface UserFilters extends PaginationParams {
  role?: string;
  status?: string;
  search?: string;
  skills?: string;
  minRating?: number;
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface BookingFilters extends PaginationParams {
  status?: string;
  serviceType?: string;
  startDate?: string;
  endDate?: string;
}

// Match Types
export interface Match {
  _id: string;
  technician: User;
  scores: {
    overall: number;
    skillMatch: number;
    locationProximity: number;
    availability: number;
    rating: number;
    experienceLevel: number;
    pricing: number;
    responseTime: number;
    completionRate: number;
    customerPreference: number;
  };
  distance: number;
  matchReasons: Array<{
    reason: string;
    weight: number;
    score: number;
  }>;
  createdAt: string;
}

// Message Types
export interface Attachment {
  type: 'image' | 'video' | 'audio' | 'document' | 'location' | 'price_quote';
  url: string;
  publicId?: string;
  thumbnail?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  duration?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  locationName?: string;
  price?: number;
  description?: string;
}

export interface ReadReceipt {
  user: string;
  readAt: string;
}

export interface Reaction {
  user: string;
  emoji: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: User | string;
  type: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'location' | 'booking' | 'system' | 'call' | 'price_quote';
  text?: string;
  attachments?: Attachment[];
  bookingRef?: string;
  replyTo?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy: ReadReceipt[];
  reactions: Reaction[];
  mentions?: string[];
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedFor: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantSettings {
  user: string | User;
  role: 'admin' | 'member';
  joinedAt: string;
  leftAt?: string;
  isMuted: boolean;
  mutedUntil?: string;
  isPinned: boolean;
  unreadCount: number;
  lastReadAt?: string;
  customNickname?: string;
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group' | 'booking' | 'support';
  participants: ParticipantSettings[];
  name?: string;
  description?: string;
  avatar?: {
    url: string;
    publicId: string;
  };
  booking?: string | Booking;
  lastMessage?: Message | string;
  lastMessageAt: string;
  status: 'active' | 'archived' | 'deleted';
  createdBy?: string;
  settings: {
    allowMediaSharing: boolean;
    allowCalls: boolean;
    onlyAdminsCanSend: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
