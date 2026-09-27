/**
 * TechnicianTracker Component
 *
 * Real-time technician location tracking display for customers.
 * Shows the technician's current position, ETA, and tracking status.
 *
 * Features:
 * - Real-time position updates via Socket.IO
 * - Live ETA display with automatic recalculation
 * - Visual status indicators
 * - Pause/resume state handling
 * - Kenya coordinate display
 *
 * Usage:
 * <TechnicianTracker
 *   bookingId="booking123"
 *   destination={{ coordinates: [36.8219, -1.2921], address: "123 Main St" }}
 *   technicianName="John Doe"
 * />
 */

import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Clock, Navigation, Pause, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { trackingService, TrackingPositionUpdate, TrackingStateEvent, TrackingStatus } from '@/services/tracking.service';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Destination {
  coordinates: [number, number];
  address: string;
}

interface TechnicianTrackerProps {
  bookingId: string;
  destination: Destination;
  technicianName?: string;
  technicianId?: string;
  onTrackingCompleted?: () => void;
  className?: string;
}

interface TrackingState {
  status: TrackingStatus;
  isPaused: boolean;
  position: {
    coordinates: [number, number];
    timestamp: Date | string;
  } | null;
  eta: {
    minutes: number | null;
    text: string | null;
    distance?: number;
    distanceText?: string;
  };
  startTime: Date | string | null;
}

// ============================================
// COMPONENT
// ============================================

const TechnicianTracker: React.FC<TechnicianTrackerProps> = ({
  bookingId,
  destination,
  technicianName = 'Your technician',
  technicianId,
  onTrackingCompleted,
  className
}) => {
  const [trackingState, setTrackingState] = useState<TrackingState>({
    status: 'active',
    isPaused: false,
    position: null,
    eta: {
      minutes: null,
      text: null
    },
    startTime: null
  });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleTrackingState = useCallback((data: TrackingStateEvent) => {
    if (data.bookingId === bookingId) {
      setTrackingState({
        status: data.status,
        isPaused: data.isPaused,
        position: data.position,
        eta: data.eta,
        startTime: data.startTime
      });
      setLastUpdate(new Date());
      setError(null);
    }
  }, [bookingId]);

  const handlePositionUpdate = useCallback((data: TrackingPositionUpdate) => {
    if (data.bookingId === bookingId) {
      setTrackingState(prev => ({
        ...prev,
        position: data.position,
        eta: data.eta,
        isPaused: data.isPaused
      }));
      setLastUpdate(new Date());
      setError(null);
    }
  }, [bookingId]);

  const handleTrackingPaused = useCallback((data: { bookingId: string; message?: string }) => {
    if (data.bookingId === bookingId) {
      setTrackingState(prev => ({
        ...prev,
        isPaused: true,
        status: 'paused'
      }));
      setError(null);
    }
  }, [bookingId]);

  const handleTrackingResumed = useCallback((data: { bookingId: string }) => {
    if (data.bookingId === bookingId) {
      setTrackingState(prev => ({
        ...prev,
        isPaused: false,
        status: 'active'
      }));
      setError(null);
    }
  }, [bookingId]);

  const handleTrackingCompleted = useCallback((data: { bookingId: string }) => {
    if (data.bookingId === bookingId) {
      setTrackingState(prev => ({
        ...prev,
        status: 'completed'
      }));
      if (onTrackingCompleted) {
        onTrackingCompleted();
      }
    }
  }, [bookingId, onTrackingCompleted]);

  const handleTrackingError = useCallback((data: { bookingId: string | null; error: string }) => {
    if (data.bookingId === bookingId) {
      setError(data.error);
    }
  }, [bookingId]);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    // Subscribe to tracking updates
    trackingService.subscribeToTracking(bookingId);

    // Set up event listeners
    trackingService.onTrackingState(handleTrackingState);
    trackingService.onPositionUpdate(handlePositionUpdate);
    trackingService.onTrackingPaused(handleTrackingPaused);
    trackingService.onTrackingResumed(handleTrackingResumed);
    trackingService.onTrackingCompleted(handleTrackingCompleted);
    trackingService.onTrackingError(handleTrackingError);

    // Cleanup on unmount
    return () => {
      trackingService.unsubscribeFromTracking(bookingId);
      trackingService.removeListener('state', handleTrackingState);
      trackingService.removeListener('position', handlePositionUpdate);
      trackingService.removeListener('paused', handleTrackingPaused);
      trackingService.removeListener('resumed', handleTrackingResumed);
      trackingService.removeListener('completed', handleTrackingCompleted);
      trackingService.removeListener('error', handleTrackingError);
    };
  }, [
    bookingId,
    handleTrackingState,
    handlePositionUpdate,
    handleTrackingPaused,
    handleTrackingResumed,
    handleTrackingCompleted,
    handleTrackingError
  ]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return '';

    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 120) return '1 min ago';
    return `${Math.floor(diff / 60)} min ago`;
  };

  const formatCoordinates = (coords: [number, number] | null): string => {
    if (!coords) return 'Unknown';
    const [lng, lat] = coords;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  // ============================================
  // RENDER
  // ============================================

  // Completed state
  if (trackingState.status === 'completed') {
    return (
      <div className={cn(
        'rounded-xl border-2 border-green-800 bg-green-900/20 p-6',
        className
      )}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-800">
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-300">
              Technician Arrived!
            </h3>
            <p className="text-sm text-green-400">
              {technicianName} has arrived at your location
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !trackingState.position) {
    return (
      <div className={cn(
        'rounded-xl border border-red-800 bg-red-900/20 p-4',
        className
      )}>
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Tracking Error</span>
        </div>
        <p className="mt-2 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  const { position, eta, isPaused, status } = trackingState;

  return (
    <div className={cn(
      'rounded-xl border border-blue-800 bg-blue-900/20 p-6 shadow-sm',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            isPaused ? 'bg-yellow-900' : 'bg-blue-900'
          )}>
            <Navigation className={cn(
              'h-5 w-5',
              isPaused ? 'text-yellow-400' : 'text-blue-400 animate-pulse'
            )} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">
              {technicianName} is on the way
            </h3>
            <p className="text-sm text-ink-muted">
              {isPaused ? 'Location sharing paused' : 'Tracking in progress'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {isPaused ? (
          <span className="flex items-center gap-1 rounded-full bg-yellow-900 px-3 py-1 text-xs font-medium text-yellow-300">
            <Pause className="h-3 w-3" />
            Paused
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-green-900 px-3 py-1 text-xs font-medium text-green-300">
            <Play className="h-3 w-3" />
            Live
          </span>
        )}
      </div>

      {/* ETA Card */}
      <div className="mb-4 rounded-lg bg-surface-200 p-4 shadow-sm border border-line">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900">
              <Clock className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-ink-muted">Estimated Arrival</p>
              <p className="text-2xl font-bold text-ink">
                {eta.text || 'Calculating...'}
              </p>
            </div>
          </div>

          {eta.distanceText && (
            <div className="text-right">
              <p className="text-sm text-ink-muted">Distance</p>
              <p className="text-lg font-semibold text-ink-muted">
                {eta.distanceText}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Current Location */}
      <div className="space-y-3">
        {/* Technician Position */}
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-ink-muted">Technician Location</p>
            <p className="text-sm text-ink-muted font-mono">
              {position ? formatCoordinates(position.coordinates) : 'Waiting for location...'}
            </p>
          </div>
        </div>

        {/* Destination */}
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-green-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-ink-muted">Your Location</p>
            <p className="text-sm text-ink-muted">
              {destination.address}
            </p>
          </div>
        </div>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <div className="mt-4 pt-4 border-t border-line">
          <p className="text-xs text-ink-muted">
            Last updated: {formatTimeAgo(lastUpdate)}
          </p>
        </div>
      )}

      {/* Paused Notice */}
      {isPaused && (
        <div className="mt-4 rounded-lg bg-yellow-900/20 border border-yellow-800 p-3">
          <p className="text-sm text-yellow-300">
            The technician has temporarily paused location sharing. You will be notified when tracking resumes.
          </p>
        </div>
      )}
    </div>
  );
};

export default TechnicianTracker;
