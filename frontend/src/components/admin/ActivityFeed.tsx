/**
 * ActivityFeed Component
 *
 * Displays auto-scrolling feed of platform events.
 * Shows different event types with appropriate icons and formatting.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  XCircle,
  DollarSign,
  User,
  Star,
  Power,
  PowerOff,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityEvent, ActivityType } from '@/types/analytics';
import { getRelativeTime } from '@/services/analytics.service';

interface ActivityFeedProps {
  activities: ActivityEvent[];
  isLoading?: boolean;
  maxItems?: number;
  autoScroll?: boolean;
  onActivityClick?: (activity: ActivityEvent) => void;
}

/**
 * Get icon for activity type
 */
const getActivityIcon = (type: ActivityType): React.ReactNode => {
  const iconClass = 'h-4 w-4';

  switch (type) {
    case 'booking_created':
      return <Calendar className={iconClass} />;
    case 'booking_confirmed':
      return <CheckCircle className={iconClass} />;
    case 'booking_completed':
      return <CheckCircle className={iconClass} />;
    case 'booking_cancelled':
      return <XCircle className={iconClass} />;
    case 'payment_received':
      return <DollarSign className={iconClass} />;
    case 'payment_released':
      return <DollarSign className={iconClass} />;
    case 'technician_online':
      return <Power className={iconClass} />;
    case 'technician_offline':
      return <PowerOff className={iconClass} />;
    case 'user_registered':
      return <User className={iconClass} />;
    case 'review_submitted':
      return <Star className={iconClass} />;
    default:
      return <MessageSquare className={iconClass} />;
  }
};

/**
 * Get color for activity type
 */
const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case 'booking_created':
      return 'bg-blue-500';
    case 'booking_confirmed':
      return 'bg-green-500';
    case 'booking_completed':
      return 'bg-emerald-500';
    case 'booking_cancelled':
      return 'bg-red-500';
    case 'payment_received':
      return 'bg-yellow-500';
    case 'payment_released':
      return 'bg-amber-500';
    case 'technician_online':
      return 'bg-green-400';
    case 'technician_offline':
      return 'bg-ink-faint';
    case 'user_registered':
      return 'bg-purple-500';
    case 'review_submitted':
      return 'bg-orange-500';
    default:
      return 'bg-ink-faint';
  }
};

/**
 * Get human-readable label for activity type
 */
const getActivityLabel = (type: ActivityType): string => {
  switch (type) {
    case 'booking_created':
      return 'New Booking';
    case 'booking_confirmed':
      return 'Booking Confirmed';
    case 'booking_completed':
      return 'Booking Completed';
    case 'booking_cancelled':
      return 'Booking Cancelled';
    case 'payment_received':
      return 'Payment Received';
    case 'payment_released':
      return 'Payment Released';
    case 'technician_online':
      return 'Technician Online';
    case 'technician_offline':
      return 'Technician Offline';
    case 'user_registered':
      return 'New User';
    case 'review_submitted':
      return 'Review Submitted';
    default:
      return 'Activity';
  }
};

/**
 * Format activity description based on type and data
 */
const formatActivityDescription = (activity: ActivityEvent): string => {
  const { type, data } = activity;

  switch (type) {
    case 'booking_created':
      return `Booking #${data.bookingNumber || data.id?.slice(-6)} for ${data.service || 'service'}`;
    case 'booking_confirmed':
      return `${data.technician || 'Technician'} confirmed booking`;
    case 'booking_completed':
      return `Booking #${data.bookingNumber || data.id?.slice(-6)} completed`;
    case 'booking_cancelled':
      return `Booking #${data.bookingNumber || data.id?.slice(-6)} cancelled`;
    case 'payment_received':
      return `KES ${(data.amount || 0).toLocaleString()} received`;
    case 'payment_released':
      return `KES ${(data.amount || 0).toLocaleString()} released to technician`;
    case 'technician_online':
      return `${data.name || 'Technician'} is now online`;
    case 'technician_offline':
      return `${data.name || 'Technician'} went offline`;
    case 'user_registered':
      return `${data.name || 'New user'} joined the platform`;
    case 'review_submitted':
      return `${data.rating || 5}-star review submitted`;
    default:
      return 'Platform activity';
  }
};

/**
 * Individual activity item component
 */
const ActivityItem: React.FC<{
  activity: ActivityEvent;
  onClick?: (activity: ActivityEvent) => void;
  isNew?: boolean;
}> = ({ activity, onClick, isNew }) => {
  const icon = getActivityIcon(activity.type);
  const color = getActivityColor(activity.type);
  const label = getActivityLabel(activity.type);
  const description = formatActivityDescription(activity);
  const relativeTime = getRelativeTime(activity.timestamp);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer',
        'hover:bg-surface-300/50',
        isNew && 'bg-purple-900/20 animate-pulse'
      )}
      onClick={() => onClick?.(activity)}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 p-2 rounded-full text-ink', color)}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink dark:text-ink">
            {label}
          </p>
          <span className="text-xs text-ink-muted whitespace-nowrap">
            {relativeTime}
          </span>
        </div>
        <p className="text-sm text-ink-muted truncate">
          {description}
        </p>
      </div>

      {/* New indicator */}
      {isNew && (
        <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900 text-purple-200">
          New
        </span>
      )}
    </div>
  );
};

/**
 * Loading skeleton for activity items
 */
const ActivityItemSkeleton: React.FC = () => (
  <div className="flex items-start gap-3 p-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-300 animate-pulse" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-24 bg-surface-300 rounded animate-pulse" />
      <div className="h-3 w-48 bg-surface-300 rounded animate-pulse" />
    </div>
  </div>
);

/**
 * Empty state for activity feed
 */
const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-12 h-12 rounded-full bg-surface-200 flex items-center justify-center mb-4">
      <MessageSquare className="h-6 w-6 text-ink-muted" />
    </div>
    <p className="text-sm text-ink-muted">
      No recent activity
    </p>
    <p className="text-xs text-ink-muted mt-1">
      Activity will appear here as it happens
    </p>
  </div>
);

/**
 * ActivityFeed - Main component
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isLoading = false,
  maxItems = 20,
  autoScroll = true,
  onActivityClick,
}) => {
  const feedRef = useRef<HTMLDivElement>(null);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());

  // Track new activities for highlighting
  useEffect(() => {
    if (activities.length > 0 && activities[0]) {
      const firstActivityId = activities[0].id;
      const currentIds = new Set(activities.slice(0, 5).map(a => a.id));
      setNewActivityIds(currentIds);

      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setNewActivityIds(new Set());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [activities]);

  // Auto-scroll to top when new activity arrives
  useEffect(() => {
    if (autoScroll && feedRef.current && activities.length > 0 && activities[0]) {
      feedRef.current.scrollTop = 0;
    }
  }, [activities, autoScroll]);

  // Filter to max items
  const displayedActivities = activities.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink-muted">
          Live Activity
        </h3>
        <span className="text-xs text-ink-muted">
          {activities.length} events
        </span>
      </div>

      {/* Activity list */}
      <div
        ref={feedRef}
        className="max-h-[400px] overflow-y-auto space-y-1 rounded-lg border border-line bg-surface-200/50"
      >
        {displayedActivities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onClick={onActivityClick}
            isNew={newActivityIds.has(activity.id)}
          />
        ))}
      </div>

      {/* Show more indicator */}
      {activities.length > maxItems && (
        <p className="text-xs text-center text-ink-muted">
          Showing {maxItems} of {activities.length} activities
        </p>
      )}
    </div>
  );
};

export default ActivityFeed;
