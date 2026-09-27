/**
 * OnlineCounter Component
 * Shows "X plumbers online now" in category views
 *
 * Task #73: Real-Time Availability & Queue System
 */

import React, { useState, useEffect } from 'react';
import socketService from '@/services/socket';
import { AVAILABILITY_EVENTS, OnlineCountPayload } from '@/types/availability';

interface OnlineCounterProps {
  category: string;
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Display online technician count with real-time updates
 */
export function OnlineCounter({
  category,
  showLabel = true,
  className = '',
  size = 'md',
}: OnlineCounterProps) {
  const [count, setCount] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    /**
     * Handle online count updates
     */
    const handleOnlineCount = (data: OnlineCountPayload) => {
      if (data.category === category) {
        setCount(data.count);
        // Trigger animation
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
      }
    };

    // Request initial count
    socketService.emit(AVAILABILITY_EVENTS.GET_ONLINE_COUNT, { category });

    // Listen for updates
    socketService.on(AVAILABILITY_EVENTS.CATEGORY_ONLINE_COUNT, handleOnlineCount);

    // Cleanup
    return () => {
      socketService.off(AVAILABILITY_EVENTS.CATEGORY_ONLINE_COUNT, handleOnlineCount);
    };
  }, [category]);

  /**
   * Get category display name
   */
  const getCategoryName = (cat: string): string => {
    const names: Record<string, string> = {
      plumbing: 'Plumbers',
      electrical: 'Electricians',
      carpentry: 'Carpenters',
      masonry: 'Masons',
      painting: 'Painters',
      hvac: 'HVAC Technicians',
      welding: 'Welders',
      other: 'Technicians',
    };
    return names[cat] || 'Technicians';
  };

  /**
   * Size classes
   */
  const sizeClasses = {
    sm: {
      badge: 'w-2 h-2',
      text: 'text-xs',
      padding: 'px-2 py-1',
    },
    md: {
      badge: 'w-2.5 h-2.5',
      text: 'text-sm',
      padding: 'px-3 py-1.5',
    },
    lg: {
      badge: 'w-3 h-3',
      text: 'text-base',
      padding: 'px-4 py-2',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={`
        inline-flex items-center space-x-2
        bg-green-900/20
        border border-green-800
        rounded-full ${classes.padding}
        ${className}
      `}
    >
      {/* Animated green dot */}
      <span className="relative flex h-3 w-3">
        <span
          className={`
            absolute inline-flex h-full w-full rounded-full bg-green-400
            ${isAnimating ? 'animate-ping' : 'opacity-75'}
          `}
        ></span>
        <span
          className={`
            relative inline-flex rounded-full ${classes.badge} bg-green-500
            transition-transform duration-200
            ${isAnimating ? 'scale-125' : 'scale-100'}
          `}
        ></span>
      </span>

      {/* Count and label */}
      <div className="flex items-center space-x-1">
        <span className={`font-semibold text-green-300 ${classes.text}`}>
          {count}
        </span>
        {showLabel && (
          <span className={`text-green-400 ${classes.text}`}>
            {getCategoryName(category)} online
          </span>
        )}
      </div>
    </div>
  );
}

export default OnlineCounter;
