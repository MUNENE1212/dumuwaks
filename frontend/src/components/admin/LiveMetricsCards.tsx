/**
 * LiveMetricsCards Component
 *
 * Displays real-time metric cards with animated counters and trend indicators.
 * Updates in real-time via WebSocket connection.
 */

import React, { useEffect, useState } from 'react';
import {
  Activity,
  DollarSign,
  Users,
  Wrench,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RealtimeMetrics } from '@/types/analytics';
import { formatCurrency, formatNumber, formatPercentage, getTrendDirection } from '@/services/analytics.service';

interface LiveMetricsCardsProps {
  metrics: RealtimeMetrics | null;
  isLoading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  isAnimating?: boolean;
}

/**
 * Individual metric card with animation support
 */
const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  color,
  trend,
  isAnimating,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    // For revenue, up is good, down is bad
    // For response time, down is good, up is bad
    if (trend === 'up') {
      return changeLabel?.toLowerCase().includes('response')
        ? 'text-red-500'
        : 'text-green-500';
    }
    if (trend === 'down') {
      return changeLabel?.toLowerCase().includes('response')
        ? 'text-green-500'
        : 'text-red-500';
    }
    return 'text-ink-muted';
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-surface-200 p-6 shadow-sm',
        'border border-line',
        'transition-all duration-300 hover:shadow-md',
        isAnimating && 'ring-2 ring-purple-800'
      )}
    >
      {/* Pulse indicator for live data */}
      <div className="absolute top-3 right-3">
        <span className="flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      </div>

      {/* Icon and color accent */}
      <div className={cn('inline-flex p-3 rounded-lg mb-4', color)}>
        {icon}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-ink-muted mb-1">
        {title}
      </p>

      {/* Value */}
      <p className="text-2xl font-bold text-ink dark:text-ink">
        {value}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-ink-muted mt-1">
          {subtitle}
        </p>
      )}

      {/* Change indicator */}
      {change !== undefined && (
        <div className={cn('flex items-center gap-1 mt-2', getTrendColor())}>
          {getTrendIcon()}
          <span className="text-sm font-medium">
            {formatPercentage(change)}
          </span>
          {changeLabel && (
            <span className="text-xs text-ink-muted">
              {changeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Loading skeleton for metric cards
 */
const MetricCardSkeleton: React.FC = () => (
  <div className="rounded-xl bg-surface-200 p-6 shadow-sm border border-line animate-pulse">
    <div className="h-12 w-12 rounded-lg bg-surface-300 mb-4" />
    <div className="h-4 w-24 bg-surface-300 rounded mb-2" />
    <div className="h-8 w-32 bg-surface-300 rounded" />
  </div>
);

/**
 * LiveMetricsCards - Main component
 */
const LiveMetricsCards: React.FC<LiveMetricsCardsProps> = ({
  metrics,
  isLoading = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // Track when metrics update for animation
  useEffect(() => {
    if (metrics) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [metrics]);

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const activeBookingsTotal = Object.values(metrics.activeBookingsByStatus).reduce((a, b) => a + b, 0);

  const cards: MetricCardProps[] = [
    {
      title: 'Active Bookings',
      value: formatNumber(activeBookingsTotal),
      subtitle: `${metrics.activeBookingsByStatus?.en_route || 0} en route`,
      icon: <Activity className="h-6 w-6 text-ink" />,
      color: 'bg-purple-500',
    },
    {
      title: 'Revenue Today',
      value: formatCurrency(metrics.revenueToday),
      change: metrics.revenueChangePercent,
      changeLabel: 'vs yesterday',
      icon: <DollarSign className="h-6 w-6 text-ink" />,
      color: 'bg-green-500',
      trend: getTrendDirection(metrics.revenueChangePercent),
    },
    {
      title: 'Technicians Online',
      value: metrics.techniciansOnline,
      subtitle: 'Available for bookings',
      icon: <Wrench className="h-6 w-6 text-ink" />,
      color: 'bg-blue-500',
    },
    {
      title: 'Customers Online',
      value: formatNumber(metrics.customersOnline),
      subtitle: 'Active on platform',
      icon: <Users className="h-6 w-6 text-ink" />,
      color: 'bg-orange-500',
    },
    {
      title: 'Bookings Last Hour',
      value: metrics.bookingsLastHour,
      subtitle: 'New requests',
      icon: <Zap className="h-6 w-6 text-ink" />,
      color: 'bg-yellow-500',
    },
    {
      title: 'Avg Response Time',
      value: `${metrics.averageResponseTime}m`,
      subtitle: 'Technician acceptance',
      icon: <Clock className="h-6 w-6 text-ink" />,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span>Live data - updates every 30 seconds</span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, index) => (
          <MetricCard
            key={card.title}
            {...card}
            isAnimating={isAnimating && index === 0}
          />
        ))}
      </div>
    </div>
  );
};

export default LiveMetricsCards;
