/**
 * StatusDistribution Component
 *
 * Displays booking status distribution as a visual chart.
 * Updates in real-time when status distribution changes.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { StatusDistribution as StatusDistributionType } from '@/types/analytics';

interface StatusDistributionProps {
  data: StatusDistributionType | null;
  isLoading?: boolean;
}

/**
 * Get display color for booking status
 */
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    en_route: 'bg-purple-500',
    in_progress: 'bg-indigo-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
    disputed: 'bg-orange-500',
  };
  return colors[status] || 'bg-ink-faint';
};

/**
 * Format status for display
 */
const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Simple bar chart for status distribution
 */
const DistributionBar: React.FC<{ data: StatusDistributionType }> = ({ data }) => {
  if (data.distribution.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Stacked bar chart */}
      <div className="h-8 w-full rounded-lg overflow-hidden flex">
        {data.distribution.map((item) => (
          <div
            key={item.status}
            className={cn(
              'h-full transition-all duration-500',
              getStatusColor(item.status)
            )}
            style={{ width: `${item.percentage}%` }}
            title={`${formatStatus(item.status)}: ${item.count} (${item.percentage}%)`}
          />
        ))}
      </div>

      {/* Individual bars with labels */}
      <div className="space-y-2">
        {data.distribution.map((item) => (
          <div key={item.status} className="flex items-center gap-3">
            {/* Status label */}
            <div className="w-28 flex items-center gap-2">
              <div
                className={cn(
                  'w-3 h-3 rounded-full flex-shrink-0',
                  getStatusColor(item.status)
                )}
              />
              <span className="text-xs text-ink-muted truncate">
                {formatStatus(item.status)}
              </span>
            </div>

            {/* Bar container */}
            <div className="flex-1 h-4 bg-surface-300 rounded overflow-hidden">
              <div
                className={cn(
                  'h-full rounded transition-all duration-500',
                  getStatusColor(item.status)
                )}
                style={{ width: `${item.percentage}%` }}
              />
            </div>

            {/* Count and percentage */}
            <div className="w-20 text-right flex-shrink-0">
              <span className="text-xs font-medium text-ink dark:text-ink">
                {item.count}
              </span>
              <span className="text-xs text-ink-muted ml-1">
                ({item.percentage}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Simple donut chart alternative (CSS-based)
 */
const DonutChart: React.FC<{ data: StatusDistributionType }> = ({ data }) => {
  if (data.distribution.length === 0) return null;

  // Create conic gradient for donut
  const gradientStops: string[] = [];
  let currentAngle = 0;

  data.distribution.forEach((item) => {
    const colorMap: Record<string, string> = {
      pending: '#eab308',
      confirmed: '#3b82f6',
      en_route: '#a855f7',
      in_progress: '#6366f1',
      completed: '#22c55e',
      cancelled: '#ef4444',
      disputed: '#e8a317',
    };

    const color = colorMap[item.status] || '#6b7280';
    const nextAngle = currentAngle + (item.percentage * 3.6);

    gradientStops.push(`${color} ${currentAngle}deg ${nextAngle}deg`);
    currentAngle = nextAngle;
  });

  return (
    <div className="flex items-center justify-center">
      <div
        className="w-40 h-40 rounded-full relative"
        style={{
          background: `conic-gradient(${gradientStops.join(', ')})`,
        }}
      >
        {/* Center circle to create donut effect */}
        <div className="absolute inset-4 rounded-full bg-surface-200 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-ink dark:text-ink">
              {data.total}
            </p>
            <p className="text-xs text-ink-muted">
              Total
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Loading skeleton
 */
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-full bg-surface-300 rounded-lg" />
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-3">
        <div className="w-28 h-4 bg-surface-300 rounded" />
        <div className="flex-1 h-4 bg-surface-300 rounded" />
        <div className="w-20 h-4 bg-surface-300 rounded" />
      </div>
    ))}
  </div>
);

/**
 * Empty state
 */
const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-12 h-12 rounded-full bg-surface-200 flex items-center justify-center mb-4">
      <svg
        className="h-6 w-6 text-ink-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    </div>
    <p className="text-sm text-ink-muted">
      No booking data available
    </p>
  </div>
);

/**
 * StatusDistribution - Main component
 */
const StatusDistribution: React.FC<StatusDistributionProps> = ({
  data,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-surface-200 rounded-xl p-6 shadow-sm border border-line">
        <h3 className="text-lg font-semibold text-ink dark:text-ink mb-4">
          Booking Status Distribution
        </h3>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!data || data.distribution.length === 0) {
    return (
      <div className="bg-surface-200 rounded-xl p-6 shadow-sm border border-line">
        <h3 className="text-lg font-semibold text-ink dark:text-ink mb-4">
          Booking Status Distribution
        </h3>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="bg-surface-200 rounded-xl p-6 shadow-sm border border-line">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-ink dark:text-ink">
          Booking Status Distribution
        </h3>
        <span className="text-sm text-ink-muted">
          {data.total} total bookings
        </span>
      </div>

      {/* Chart and legend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <DonutChart data={data} />

        {/* Bar chart with labels */}
        <DistributionBar data={data} />
      </div>

      {/* Last updated */}
      <p className="mt-4 text-xs text-ink-muted text-right">
        Updates in real-time
      </p>
    </div>
  );
};

export default StatusDistribution;
