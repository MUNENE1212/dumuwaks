/**
 * Analytics Service for Admin Dashboard
 *
 * Provides API methods for fetching analytics data.
 * Works alongside socket service for real-time updates.
 */

import axios from '@/lib/axios';
import type {
  RealtimeMetrics,
  StatusDistribution,
  TrendData,
  ActivityEvent,
  AnalyticsApiResponse,
  ActivityFeedResponse,
  TimePeriod,
  TractionData,
} from '@/types/analytics';

const BASE_URL = '/admin/analytics';

/**
 * Get current real-time platform metrics
 *
 * @returns Promise with realtime metrics data
 */
export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  const response = await axios.get<AnalyticsApiResponse<RealtimeMetrics>>(
    `${BASE_URL}/realtime`
  );
  return response.data.data;
}

/**
 * Get historical trend data
 *
 * @param period - Time period for trends
 * @returns Promise with trend data
 */
export async function getTrends(period: TimePeriod = '7d'): Promise<TrendData> {
  const response = await axios.get<AnalyticsApiResponse<TrendData>>(
    `${BASE_URL}/trends`,
    { params: { period } }
  );
  return response.data.data;
}

/**
 * Get booking status distribution
 *
 * @returns Promise with status distribution
 */
export async function getStatusDistribution(): Promise<StatusDistribution> {
  const response = await axios.get<AnalyticsApiResponse<StatusDistribution>>(
    `${BASE_URL}/status-distribution`
  );
  return response.data.data;
}

/**
 * Get recent platform activity feed
 *
 * @param limit - Number of activities to return (default: 20)
 * @returns Promise with activity events
 */
export async function getActivityFeed(limit: number = 20): Promise<ActivityEvent[]> {
  const response = await axios.get<ActivityFeedResponse>(
    `${BASE_URL}/activity-feed`,
    { params: { limit } }
  );
  return response.data.data;
}

/**
 * Get traction KPIs for the weekly review
 *
 * @param weeks - Weeks of history (4-52, default 12)
 * @returns Promise with traction figures, including revenue
 */
export async function getTraction(weeks: number = 12): Promise<TractionData> {
  const response = await axios.get<AnalyticsApiResponse<TractionData>>(
    `${BASE_URL}/traction`,
    { params: { weeks } }
  );
  return response.data.data;
}

/**
 * Clear metrics cache (force refresh)
 *
 * @returns Promise indicating success
 */
export async function clearCache(): Promise<void> {
  await axios.post(`${BASE_URL}/clear-cache`);
}

/**
 * Format currency for display (Kenyan Shillings)
 *
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with abbreviations for large numbers
 *
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format percentage with sign
 *
 * @param value - Percentage value
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Calculate trend direction
 *
 * @param change - Change percentage
 * @returns Trend direction
 */
export function getTrendDirection(change: number): 'up' | 'down' | 'neutral' {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'neutral';
}

/**
 * Get relative time string
 *
 * @param timestamp - ISO timestamp
 * @returns Relative time string
 */
export function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default {
  getRealtimeMetrics,
  getTrends,
  getStatusDistribution,
  getActivityFeed,
  getTraction,
  clearCache,
  formatCurrency,
  formatNumber,
  formatPercentage,
  getTrendDirection,
  getRelativeTime,
};
