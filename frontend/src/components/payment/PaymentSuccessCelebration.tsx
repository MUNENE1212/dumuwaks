/**
 * PaymentSuccessCelebration Component
 *
 * A triumphant payment success experience that makes the user feel like
 * the hero of their digital adventure. Features:
 * - Animated success checkmark with drawing effect
 * - Confetti celebration effects (subtle, elegant)
 * - LED glow and pulse effects
 * - Transaction details summary
 * - Next steps guidance
 * - Call-to-action buttons
 * - Dark theme compatible with rich design system
 * - Accessibility: reduced motion support
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Check, ArrowRight, FileText, Phone, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentSuccessCelebrationProps {
  /** Whether the celebration is visible */
  isVisible: boolean;
  /** Transaction ID for display */
  transactionId: string;
  /** Payment amount */
  amount: number;
  /** Currency code (e.g., KES, USD) */
  currency: string;
  /** Recipient name (optional) */
  recipientName?: string;
  /** Custom title (optional) */
  title?: string;
  /** Booking reference (optional) */
  bookingReference?: string;
  /** Custom next steps (optional) */
  nextSteps?: string[];
  /** Callback when View Booking is clicked */
  onViewBooking?: () => void;
  /** Callback when Continue is clicked */
  onContinue?: () => void;
}

/**
 * Format amount with thousand separators
 */
const formatAmount = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Truncate transaction ID for display
 */
const truncateTxnId = (txnId: string, maxLength: number = 16): string => {
  if (txnId.length <= maxLength) return txnId;
  return txnId.substring(0, maxLength) + '...';
};

const PaymentSuccessCelebration: React.FC<PaymentSuccessCelebrationProps> = ({
  isVisible,
  transactionId,
  amount,
  currency,
  recipientName,
  title = 'Payment Successful!',
  bookingReference,
  nextSteps,
  onViewBooking,
  onContinue,
}) => {
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const viewBookingBtnRef = useRef<HTMLButtonElement>(null);
  const hasTriggeredConfetti = useRef(false);

  // Button press handler with proper styling
  const buttonBaseStyles = `
    inline-flex items-center justify-center rounded-lg font-medium
    transition-all duration-200 focus-visible:outline-none focus-visible:ring-2
    focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
  `;

  const primaryButtonStyles = `
    ${buttonBaseStyles}
    h-12 min-w-[48px] px-4 py-2
    text-ink
  `;

  const outlineButtonStyles = `
    ${buttonBaseStyles}
    h-12 min-w-[48px] px-4 py-2
    border-2 bg-transparent
  `;

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Default next steps
  const defaultNextSteps = [
    'Your booking is confirmed and saved',
    'The technician will contact you shortly',
    'Check your phone for confirmation SMS',
  ];

  const stepsToDisplay = nextSteps || defaultNextSteps;

  /**
   * Trigger confetti celebration effect
   * Elegant, not overwhelming - matches design system
   */
  const triggerConfetti = () => {
    if (prefersReducedMotion || hasTriggeredConfetti.current) return;

    hasTriggeredConfetti.current = true;

    // Circuit Blue confetti matching design system
    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0.8,
      decay: 0.94,
      startVelocity: 30,
      colors: ['#e8a317', '#1fa3d6', '#ffc94a', '#f5eee1'],
      scalar: 0.8,
    };

    // Side bursts for elegant effect
    const end = Date.now() + 500;
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }

      confetti({
        ...defaults,
        particleCount: 2,
        angle: 60,
        origin: { x: 0, y: 0.6 },
      });
      confetti({
        ...defaults,
        particleCount: 2,
        angle: 120,
        origin: { x: 1, y: 0.6 },
      });
    }, 50);

    // Center burst for grand finale
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 20,
        origin: { x: 0.5, y: 0.5 },
        startVelocity: 25,
      });
    }, 150);
  };

  /**
   * Handle visibility change and trigger animations
   */
  useEffect(() => {
    if (isVisible) {
      // Staggered animation timing
      const checkmarkTimer = setTimeout(() => {
        setShowCheckmark(true);
        triggerConfetti();
      }, 100);

      const contentTimer = setTimeout(() => {
        setShowContent(true);
      }, 300);

      // Focus management for accessibility
      const focusTimer = setTimeout(() => {
        if (onViewBooking && viewBookingBtnRef.current) {
          viewBookingBtnRef.current.focus();
        }
      }, 600);

      return () => {
        clearTimeout(checkmarkTimer);
        clearTimeout(contentTimer);
        clearTimeout(focusTimer);
      };
    } else {
      setShowCheckmark(false);
      setShowContent(false);
      hasTriggeredConfetti.current = false;
    }
  }, [isVisible, onViewBooking, prefersReducedMotion]);

  if (!isVisible) return null;

  return (
    <div
      data-testid="success-container"
      className={`
        fixed inset-0 z-50
        flex items-center justify-center
        bg-surface-000/70
        ${prefersReducedMotion ? 'reduced-motion' : ''}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
    >
      <div
        data-testid="success-card"
        className={`
          glass-card
          relative max-w-md w-full mx-4
          rounded-2xl p-8
          will-change-transform transform-gpu
          ${showContent ? 'animate-scale-in' : 'opacity-0 scale-95'}
        `}
        style={{
          background: 'rgba(28, 28, 28, 0.95)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(0, 255, 157, 0.2)',
          boxShadow: `
            0 0 40px rgba(0, 255, 157, 0.15),
            0 0 80px rgba(0, 144, 197, 0.1),
            0 25px 50px rgba(0, 0, 0, 0.5)
          `,
        }}
      >
        {/* Animated Checkmark */}
        <div
          data-testid="success-checkmark"
          className={`
            mx-auto w-24 h-24 mb-6
            flex items-center justify-center
            rounded-full
            led-glow-success
            ${showCheckmark ? 'animate-pulse-glow' : 'opacity-0'}
            ${prefersReducedMotion ? '' : 'transition-all duration-500'}
          `}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 186, 124, 0.2), rgba(0, 255, 157, 0.1))',
            border: '2px solid rgba(0, 255, 157, 0.4)',
            boxShadow: '0 0 30px rgba(0, 255, 157, 0.4), inset 0 0 20px rgba(0, 255, 157, 0.1)',
          }}
        >
          <svg
            viewBox="0 0 52 52"
            className="w-14 h-14"
            fill="none"
            stroke="currentColor"
            style={{ color: '#ffc94a' }}
          >
            <path
              data-testid="checkmark-path"
              className={showCheckmark ? 'animate-draw-check' : ''}
              d="M14 27l10 10 14-18"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 60,
                strokeDashoffset: showCheckmark ? 0 : 60,
                transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 0.5s ease-out 0.2s',
              }}
            />
          </svg>
        </div>

        {/* Success Title */}
        <h1
          id="success-title"
          className={`
            text-bone text-center text-2xl font-bold mb-2
            ${showContent ? 'animate-fade-in-up' : 'opacity-0'}
          `}
          style={{ color: '#f5eee1' }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          className={`
            text-steel text-center text-sm mb-6
            ${showContent ? 'animate-fade-in-up delay-100' : 'opacity-0'}
          `}
          style={{ color: '#b8ab95' }}
        >
          Your payment has been confirmed successfully
        </p>

        {/* Screen Reader Announcement */}
        <div role="status" aria-live="polite" className="sr-only">
          Payment Successful! Your payment of {formatAmount(amount, currency)} {currency} has been
          confirmed. Transaction ID: {transactionId}
        </div>

        {/* Transaction Details Card */}
        <div
          className={`
            bg-surface-100/50 rounded-xl p-4 mb-6
            border border-steel/20
            ${showContent ? 'animate-fade-in-up delay-200' : 'opacity-0'}
          `}
          style={{ background: 'rgba(38, 18, 18, 0.5)', borderColor: 'rgba(155, 164, 176, 0.2)' }}
        >
          {/* Amount */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-steel text-sm" style={{ color: '#b8ab95' }}>
              Amount Paid
            </span>
            <span className="text-bone font-bold text-lg" style={{ color: '#f5eee1' }}>
              {currency} {formatAmount(amount, currency)}
            </span>
          </div>

          {/* Recipient */}
          {recipientName && (
            <div className="flex justify-between items-center mb-3">
              <span className="text-steel text-sm" style={{ color: '#b8ab95' }}>
                Recipient
              </span>
              <span className="text-bone text-sm" style={{ color: '#f5eee1' }}>
                {recipientName}
              </span>
            </div>
          )}

          {/* Transaction ID */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-steel text-sm" style={{ color: '#b8ab95' }}>
              Reference
            </span>
            <span
              className="text-bone font-mono text-xs"
              style={{ color: '#f5eee1' }}
              title={transactionId}
            >
              {truncateTxnId(transactionId)}
            </span>
          </div>

          {/* Booking Reference */}
          {bookingReference && (
            <div className="flex justify-between items-center mb-3">
              <span className="text-steel text-sm" style={{ color: '#b8ab95' }}>
                Booking
              </span>
              <span className="text-lumen-ink text-sm" style={{ color: '#e8a317' }}>
                {bookingReference}
              </span>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex justify-between items-center">
            <span className="text-steel text-sm" style={{ color: '#b8ab95' }}>
              <Clock className="w-3 h-3 inline mr-1" />
              Time
            </span>
            <span className="text-bone text-sm" style={{ color: '#f5eee1' }}>
              Just now
            </span>
          </div>
        </div>

        {/* Next Steps */}
        <div
          className={`
            mb-6
            ${showContent ? 'animate-fade-in-up delay-300' : 'opacity-0'}
          `}
        >
          <h3
            className="text-bone text-sm font-semibold mb-3 flex items-center"
            style={{ color: '#f5eee1' }}
          >
            <Phone className="w-4 h-4 mr-2 text-lumen-ink" style={{ color: '#e8a317' }} />
            What Happens Next
          </h3>
          <ul className="space-y-2">
            {stepsToDisplay.map((step, index) => (
              <li
                key={index}
                className="flex items-start text-steel text-sm"
                style={{ color: '#b8ab95' }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5"
                  style={{
                    background: 'rgba(0, 144, 197, 0.2)',
                    color: '#e8a317',
                  }}
                >
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div
          className={`
            flex flex-col sm:flex-row gap-3
            ${showContent ? 'animate-fade-in-up delay-400' : 'opacity-0'}
          `}
        >
          {onViewBooking && (
            <button
              ref={viewBookingBtnRef}
              onClick={onViewBooking}
              className={`${primaryButtonStyles} flex-1 bg-lumen`}
              style={{
                background: 'linear-gradient(135deg, #e8a317, #f0b43a)',
                boxShadow: '0 0 20px rgba(0, 144, 197, 0.4)',
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Booking
            </button>
          )}
          {onContinue && (
            <button
              onClick={onContinue}
              className={`${outlineButtonStyles} flex-1`}
              style={{
                borderColor: 'rgba(155, 164, 176, 0.5)',
                color: '#f5eee1',
              }}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 30px rgba(0, 255, 157, 0.4), inset 0 0 20px rgba(0, 255, 157, 0.1);
          }
          50% {
            box-shadow: 0 0 50px rgba(0, 255, 157, 0.6), inset 0 0 30px rgba(0, 255, 157, 0.2);
          }
        }

        @keyframes draw-check {
          to {
            stroke-dashoffset: 0;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-draw-check {
          animation: draw-check 0.5s ease-out forwards;
        }

        .delay-100 {
          animation-delay: 100ms;
        }

        .delay-200 {
          animation-delay: 200ms;
        }

        .delay-300 {
          animation-delay: 300ms;
        }

        .delay-400 {
          animation-delay: 400ms;
        }

        .led-glow-success {
          transition: all 0.3s ease-out;
        }

        .will-change-transform {
          will-change: transform;
        }

        .transform-gpu {
          transform: translateZ(0);
        }

        .reduced-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        .text-bone {
          color: var(--dw-text-primary, #f5eee1);
        }

        .text-steel {
          color: var(--dw-text-secondary, #b8ab95);
        }

        .text-lumen-ink {
          color: var(--dw-accent-primary, #e8a317);
        }

        .bg-lumen {
          background: var(--dw-accent-primary, #e8a317);
        }

        .bg-circuit-dark {
          background: var(--dw-circuit-600, #f0b43a);
        }

        .bg-surface-100 {
          background: var(--dw-bg-primary, #14110c);
        }
      `}</style>
    </div>
  );
};

export default PaymentSuccessCelebration;
