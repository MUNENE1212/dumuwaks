/**
 * Analytics Types for Admin Dashboard
 *
 * Type definitions for real-time analytics data structures.
 */

// Real-time metrics from the server
export interface RealtimeMetrics {
  activeBookings: number;
  activeBookingsByStatus: Record<string, number>;
  revenueToday: number;
  revenueYesterday: number;
  revenueChangePercent: number;
  techniciansOnline: number;
  customersOnline: number;
  bookingsLastHour: number;
  averageResponseTime: number;
  timestamp: string;
}

// Status distribution item
export interface StatusDistributionItem {
  status: string;
  count: number;
  percentage: number;
}

// Full status distribution response
export interface StatusDistribution {
  total: number;
  distribution: StatusDistributionItem[];
}

// Trend data point
export interface TrendDataPoint {
  date: string;
  count?: number;
  revenue?: number;
}

// Trend data response
export interface TrendData {
  period: '24h' | '7d' | '30d' | '90d';
  startDate: string;
  endDate: string;
  bookings: TrendDataPoint[];
  revenue: TrendDataPoint[];
  users: TrendDataPoint[];
}

// Activity event types
export type ActivityType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'payment_released'
  | 'technician_online'
  | 'technician_offline'
  | 'user_registered'
  | 'review_submitted';

// Activity event
export interface ActivityEvent {
  id: string;
  type: ActivityType;
  data: {
    id?: string;
    bookingNumber?: string;
    service?: string;
    customer?: string;
    technician?: string;
    amount?: number;
    name?: string;
    rating?: number;
    [key: string]: unknown;
  };
  timestamp: string;
}

// Socket event names for analytics
export const ANALYTICS_EVENTS = {
  // Client -> Server
  SUBSCRIBE: 'analytics:subscribe',
  UNSUBSCRIBE: 'analytics:unsubscribe',
  GET_REALTIME: 'analytics:get_realtime',
  GET_TRENDS: 'analytics:get_trends',
  GET_STATUS_DISTRIBUTION: 'analytics:get_status_distribution',
  GET_ACTIVITY_FEED: 'analytics:get_activity_feed',

  // Server -> Client
  METRICS_UPDATE: 'analytics:metrics_update',
  ACTIVITY: 'analytics:activity',
  ACTIVITY_FEED: 'analytics:activity_feed',
  STATUS_DISTRIBUTION: 'analytics:status_distribution',
  TRENDS: 'analytics:trends',
  ERROR: 'analytics:error',
} as const;

// Traction KPIs (GET /admin/analytics/traction)
export interface TractionWeek {
  weekStart: string; // YYYY-MM-DD, Monday, East Africa Time
  count: number;
}

export interface TractionData {
  asOf: string;
  weeks: number;
  technicians: { registered: number; verified: number };
  customers: { registered: number };
  completedJobs: { total: number; inWindow: number; perWeek: TractionWeek[] };
  repeatCustomerRate: number | null; // 0-1, null when no customer has a completed job
  inAppPaymentShare: number | null; // 0-1, null when no completed jobs in the window
  platformRevenueByMonth?: { month: string; amountKes: number }[];
}

// API response types
export interface AnalyticsApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ActivityFeedResponse {
  success: boolean;
  data: ActivityEvent[];
  count: number;
}

// Chart data types
export interface ChartDataPoint {
  x: string;
  y: number;
}

export interface StatusChartData {
  name: string;
  value: number;
  color: string;
}

// Metric card props
export interface MetricCardData {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
}

// Time period options
export type TimePeriod = '24h' | '7d' | '30d' | '90d';

// Activity feed filter
export interface ActivityFilter {
  types?: ActivityType[];
  limit?: number;
}
