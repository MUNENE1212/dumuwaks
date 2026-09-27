/**
 * EscrowTimer Component
 *
 * Countdown timer showing time until auto-release or expiry.
 * Displays visual urgency indicator based on remaining time.
 *
 * @module components/escrow/EscrowTimer
 */

import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { formatTimeRemaining } from '@/services/escrow.service';

interface EscrowTimerProps {
  /** Expiry date ISO string or Date object */
  expiresAt: string | Date;
  /** Called when timer expires */
  onExpire?: () => void;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

/**
 * Calculate time remaining until expiry
 */
function calculateTimeRemaining(expiresAt: string | Date): TimeRemaining {
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  const total = Math.max(0, expiry - now);

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}

/**
 * Get urgency level based on remaining time
 */
function getUrgencyLevel(timeRemaining: TimeRemaining): 'safe' | 'warning' | 'urgent' | 'critical' {
  const { days, hours, minutes } = timeRemaining;

  if (days > 1) return 'safe';
  if (days > 0 || hours > 12) return 'warning';
  if (hours > 1 || minutes > 30) return 'urgent';
  return 'critical';
}

/**
 * Get urgency styling classes
 */
function getUrgencyClasses(level: 'safe' | 'warning' | 'urgent' | 'critical'): {
  bg: string;
  text: string;
  border: string;
  pulse: string;
} {
  const styles = {
    safe: {
      bg: 'bg-green-900/20',
      text: 'text-green-400',
      border: 'border-green-800',
      pulse: ''
    },
    warning: {
      bg: 'bg-yellow-900/20',
      text: 'text-yellow-400',
      border: 'border-yellow-800',
      pulse: ''
    },
    urgent: {
      bg: 'bg-orange-900/20',
      text: 'text-orange-400',
      border: 'border-orange-800',
      pulse: 'animate-pulse'
    },
    critical: {
      bg: 'bg-red-900/20',
      text: 'text-red-400',
      border: 'border-red-800',
      pulse: 'animate-pulse'
    }
  };

  return styles[level];
}

/**
 * EscrowTimer Component
 */
export const EscrowTimer: React.FC<EscrowTimerProps> = ({
  expiresAt,
  onExpire,
  compact = false,
  className
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(expiresAt)
  );
  const [hasExpired, setHasExpired] = useState(false);

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(expiresAt);
      setTimeRemaining(remaining);

      if (remaining.total === 0 && !hasExpired) {
        setHasExpired(true);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, hasExpired, onExpire]);

  const urgencyLevel = getUrgencyLevel(timeRemaining);
  const urgencyStyles = getUrgencyClasses(urgencyLevel);

  // Expired state
  if (hasExpired) {
    return (
      <div
        className={clsx(
          'rounded-lg border px-3 py-2',
          'bg-surface-200 border-line',
          className
        )}
      >
        <div className="flex items-center gap-2 text-ink-muted">
          <ExpiryIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Expired</span>
        </div>
      </div>
    );
  }

  // Compact inline display
  if (compact) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 text-sm font-medium',
          urgencyStyles.text,
          urgencyStyles.pulse,
          className
        )}
      >
        <ClockIcon className="h-4 w-4" />
        {formatTimeRemaining(timeRemaining.total)}
      </span>
    );
  }

  // Full display
  return (
    <div
      className={clsx(
        'rounded-lg border px-4 py-3 transition-colors duration-300',
        urgencyStyles.bg,
        urgencyStyles.border,
        urgencyStyles.pulse,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <ClockIcon className={clsx('h-5 w-5', urgencyStyles.text)} />
        <span className={clsx('text-sm font-semibold', urgencyStyles.text)}>
          Auto-Release Timer
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Days */}
        {timeRemaining.days > 0 && (
          <TimeBlock
            value={timeRemaining.days}
            label="Days"
            urgencyLevel={urgencyLevel}
          />
        )}

        {/* Hours */}
        <TimeBlock
          value={timeRemaining.hours}
          label="Hrs"
          urgencyLevel={urgencyLevel}
          padZero={timeRemaining.days > 0}
        />

        {/* Minutes */}
        <TimeBlock
          value={timeRemaining.minutes}
          label="Min"
          urgencyLevel={urgencyLevel}
          padZero
        />

        {/* Seconds */}
        <TimeBlock
          value={timeRemaining.seconds}
          label="Sec"
          urgencyLevel={urgencyLevel}
          padZero
        />
      </div>

      <p className={clsx('text-xs mt-2', urgencyStyles.text, 'opacity-75')}>
        Funds will be automatically released after this time
      </p>
    </div>
  );
};

/**
 * Time Block Component
 */
const TimeBlock: React.FC<{
  value: number;
  label: string;
  urgencyLevel: 'safe' | 'warning' | 'urgent' | 'critical';
  padZero?: boolean;
}> = ({ value, label, urgencyLevel, padZero = false }) => {
  const displayValue = padZero ? value.toString().padStart(2, '0') : value;

  const bgClasses = {
    safe: 'bg-green-800',
    warning: 'bg-yellow-800',
    urgent: 'bg-orange-800',
    critical: 'bg-red-800'
  };

  const textClasses = {
    safe: 'text-green-100',
    warning: 'text-yellow-100',
    urgent: 'text-orange-100',
    critical: 'text-red-100'
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={clsx(
          'rounded-md px-3 py-2 min-w-[48px] text-center',
          bgClasses[urgencyLevel]
        )}
      >
        <span
          className={clsx(
            'text-xl font-bold tabular-nums',
            textClasses[urgencyLevel]
          )}
        >
          {displayValue}
        </span>
      </div>
      <span className={clsx('text-xs mt-1', textClasses[urgencyLevel])}>
        {label}
      </span>
    </div>
  );
};

/**
 * Clock Icon
 */
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

/**
 * Expiry Icon
 */
const ExpiryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

export default EscrowTimer;
