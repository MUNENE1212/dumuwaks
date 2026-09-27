/**
 * QueuePositionDisplay Component
 * Shows customer their position in the technician's queue
 *
 * Task #73: Real-Time Availability & Queue System
 */

import React, { useState, useEffect } from 'react';
import socketService from '@/services/socket';
import {
  AVAILABILITY_EVENTS,
  QueuePositionUpdatePayload,
} from '@/types/availability';

interface QueuePositionDisplayProps {
  bookingId: string;
  className?: string;
}

/**
 * Display queue position with real-time updates
 */
export function QueuePositionDisplay({ bookingId, className = '' }: QueuePositionDisplayProps) {
  const [position, setPosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number>(0);
  const [technicianName, setTechnicianName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    /**
     * Handle queue position updates
     */
    const handlePositionUpdate = (data: QueuePositionUpdatePayload) => {
      if (data.bookingId === bookingId) {
        setPosition(data.position);
        setEstimatedWait(data.estimatedWait);
        setTechnicianName(data.technicianName || '');
        setMessage(data.message || '');
        setError(null);
      }
    };

    /**
     * Handle queue errors
     */
    const handleError = (data: { error: string }) => {
      setError(data.error);
    };

    // Subscribe to queue updates
    socketService.emit(AVAILABILITY_EVENTS.QUEUE_SUBSCRIBE, { bookingId });

    // Listen for updates
    socketService.on(AVAILABILITY_EVENTS.POSITION_UPDATE, handlePositionUpdate);
    socketService.on(AVAILABILITY_EVENTS.QUEUE_ERROR, handleError);

    // Cleanup
    return () => {
      socketService.emit(AVAILABILITY_EVENTS.QUEUE_UNSUBSCRIBE, { bookingId });
      socketService.off(AVAILABILITY_EVENTS.POSITION_UPDATE, handlePositionUpdate);
      socketService.off(AVAILABILITY_EVENTS.QUEUE_ERROR, handleError);
    };
  }, [bookingId]);

  /**
   * Format estimated wait time
   */
  const formatWaitTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  };

  // Loading state
  if (position === null && !error) {
    return (
      <div className={`bg-blue-900/20 border border-blue-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-blue-700 rounded w-3/4"></div>
            <div className="h-3 bg-blue-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-red-900/20 border border-red-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  // No technician assigned yet
  if (message && position === 0) {
    return (
      <div className={`bg-surface-200/50 border border-line rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-ink-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-ink-muted">{message}</p>
        </div>
      </div>
    );
  }

  // Next in line
  if (position === 1) {
    return (
      <div className={`bg-green-900/20 border border-green-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-ink"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-200">
                You're next in line!
              </p>
              {technicianName && (
                <p className="text-xs text-green-300">
                  {technicianName} will be with you shortly
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // In queue
  return (
    <div className={`bg-blue-900/20 border border-blue-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-ink">#{position}</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-200">
              Queue Position: #{position}
            </p>
            <p className="text-xs text-blue-300">
              Estimated wait: ~{formatWaitTime(estimatedWait)}
            </p>
            {technicianName && (
              <p className="text-xs text-blue-400 mt-1">
                Technician: {technicianName}
              </p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

export default QueuePositionDisplay;
