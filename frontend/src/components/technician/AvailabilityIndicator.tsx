/**
 * AvailabilityIndicator Component
 * Shows technician availability status indicator
 *
 * Task #73: Real-Time Availability & Queue System
 */

import React from 'react';
import { AvailabilityStatus } from '@/types/availability';

interface AvailabilityIndicatorProps {
  status: AvailabilityStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Status configuration
 */
const STATUS_CONFIG: Record<
  AvailabilityStatus,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
    animate?: boolean;
  }
> = {
  online: {
    color: 'text-green-300',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-800',
    label: 'Online',
    animate: true,
  },
  busy: {
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-800',
    label: 'Busy',
  },
  away: {
    color: 'text-orange-300',
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-800',
    label: 'Away',
  },
  offline: {
    color: 'text-ink-muted',
    bgColor: 'bg-ink-faint',
    borderColor: 'border-line',
    label: 'Offline',
  },
};

/**
 * Display availability status indicator
 */
export function AvailabilityIndicator({
  status,
  showLabel = false,
  size = 'md',
  className = '',
}: AvailabilityIndicatorProps) {
  const config = STATUS_CONFIG[status];

  /**
   * Size classes
   */
  const sizeClasses = {
    sm: {
      dot: 'w-2 h-2',
      text: 'text-xs',
    },
    md: {
      dot: 'w-2.5 h-2.5',
      text: 'text-sm',
    },
    lg: {
      dot: 'w-3 h-3',
      text: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {/* Status dot */}
      <span className="relative flex h-3 w-3">
        {config.animate && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.bgColor} opacity-75 animate-ping`}
          ></span>
        )}
        <span
          className={`relative inline-flex rounded-full ${classes.dot} ${config.bgColor}`}
        ></span>
      </span>

      {/* Status label */}
      {showLabel && (
        <span className={`font-medium ${config.color} ${classes.text}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

export default AvailabilityIndicator;
