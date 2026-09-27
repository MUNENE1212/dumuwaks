/**
 * Payment Status Tracker
 *
 * Real-time payment status tracking component with visual progress indicator.
 * Features:
 * - Polling for status updates
 * - Visual progress indicator
 * - Timeout handling
 * - Retry option if failed
 * - Payment success celebration animation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import PaymentSuccessCelebration from './PaymentSuccessCelebration';
import mpesaService from '@/services/mpesa.service';
import type { MPesaPaymentStatus } from '@/types/mpesa';

interface PaymentStatusTrackerProps {
  transactionId: string;
  /** Payment amount for celebration display */
  amount?: number;
  /** Currency code */
  currency?: string;
  /** Recipient name for celebration display */
  recipientName?: string;
  /** Booking reference for celebration display */
  bookingReference?: string;
  /** Custom next steps for celebration */
  nextSteps?: string[];
  /** Callback when user clicks View Booking in celebration */
  onViewBooking?: () => void;
  /** Callback when user clicks Continue in celebration */
  onContinue?: () => void;
  /** Whether to show celebration animation on success */
  showCelebration?: boolean;
  onStatusChange?: (status: MPesaPaymentStatus) => void;
  onSuccess?: () => void;
  onFailure?: (error: string) => void;
  onRetry?: () => void;
  maxPollingAttempts?: number;
  pollingInterval?: number;
  autoStart?: boolean;
}

type TrackerStatus = 'idle' | 'polling' | 'success' | 'failed' | 'timeout';

const PaymentStatusTracker: React.FC<PaymentStatusTrackerProps> = ({
  transactionId,
  amount,
  currency = 'KES',
  recipientName,
  bookingReference,
  nextSteps,
  onViewBooking,
  onContinue,
  showCelebration = true,
  onStatusChange,
  onSuccess,
  onFailure,
  onRetry,
  maxPollingAttempts = 30,
  pollingInterval = 2000,
  autoStart = true,
}) => {
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus>(autoStart ? 'polling' : 'idle');
  const [paymentStatus, setPaymentStatus] = useState<MPesaPaymentStatus | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  // Poll for payment status
  const pollStatus = useCallback(async () => {
    if (attempts >= maxPollingAttempts) {
      setTrackerStatus('timeout');
      setErrorMessage('Payment verification timeout. Please check your M-Pesa messages.');
      onFailure?.('Payment verification timeout');
      return;
    }

    try {
      const response = await mpesaService.checkPaymentStatus(transactionId);
      const status = response.transaction.status;
      setPaymentStatus(status);
      onStatusChange?.(status);

      // Update progress
      setProgress(Math.min((attempts / maxPollingAttempts) * 100, 95));

      if (status === 'completed') {
        setTrackerStatus('success');
        setProgress(100);
        // Show celebration animation
        if (showCelebration) {
          setShowCelebrationModal(true);
        }
        onSuccess?.();
        return;
      }

      if (['failed', 'cancelled', 'expired'].includes(status)) {
        setTrackerStatus('failed');
        setErrorMessage(response.transaction.failureReason || 'Payment failed');
        onFailure?.(response.transaction.failureReason || 'Payment failed');
        return;
      }

      // Still pending, continue polling
      setAttempts((prev) => prev + 1);
    } catch (error) {
      console.error('Status check error:', error);
      setAttempts((prev) => prev + 1);
    }
  }, [transactionId, attempts, maxPollingAttempts, onStatusChange, onSuccess, onFailure]);

  // Start polling
  useEffect(() => {
    if (trackerStatus !== 'polling') return;

    const interval = setInterval(pollStatus, pollingInterval);
    return () => clearInterval(interval);
  }, [trackerStatus, pollStatus, pollingInterval]);

  // Handle retry
  const handleRetry = () => {
    setTrackerStatus('polling');
    setPaymentStatus(null);
    setAttempts(0);
    setErrorMessage(null);
    setProgress(0);
    onRetry?.();
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (trackerStatus) {
      case 'polling':
        return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'failed':
      case 'timeout':
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Clock className="w-8 h-8 text-ink-muted" />;
    }
  };

  // Get status message
  const getStatusMessage = () => {
    switch (trackerStatus) {
      case 'polling':
        return 'Verifying payment status...';
      case 'success':
        return 'Payment confirmed successfully!';
      case 'failed':
        return errorMessage || 'Payment failed';
      case 'timeout':
        return 'Payment verification timed out';
      default:
        return 'Waiting to start verification';
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (trackerStatus) {
      case 'polling':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'failed':
      case 'timeout':
        return 'text-red-400';
      default:
        return 'text-ink-muted';
    }
  };

  return (
    <>
      {/* Payment Success Celebration Modal */}
      <PaymentSuccessCelebration
        isVisible={showCelebrationModal}
        transactionId={transactionId}
        amount={amount ?? 0}
        currency={currency}
        recipientName={recipientName}
        bookingReference={bookingReference}
        nextSteps={nextSteps}
        onViewBooking={onViewBooking}
        onContinue={onContinue ?? (() => setShowCelebrationModal(false))}
      />

      <div className="bg-surface-200 rounded-xl p-6 shadow-lg">
        {/* Status Icon */}
        <div className="flex flex-col items-center mb-4">
          {getStatusIcon()}
        </div>

      {/* Progress Bar */}
      {trackerStatus === 'polling' && (
        <div className="mb-4">
          <div className="h-2 bg-surface-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-ink-muted mt-1 text-center">
            Attempt {attempts + 1} of {maxPollingAttempts}
          </p>
        </div>
      )}

      {/* Status Message */}
      <p className={`text-center font-medium mb-4 ${getStatusColor()}`}>
        {getStatusMessage()}
      </p>

      {/* Payment Status Details */}
      {paymentStatus && (
        <div className="bg-surface-300 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-ink-muted">Status:</span>
            <span className={`font-medium ${getStatusColor()}`}>
              {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-ink-muted">Transaction ID:</span>
            <span className="font-mono text-xs text-ink-muted">
              {transactionId.substring(0, 12)}...
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (trackerStatus === 'failed' || trackerStatus === 'timeout') && (
        <div className="bg-red-900/20 rounded-lg p-3 mb-4 border border-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3">
        {trackerStatus === 'idle' && (
          <Button onClick={() => setTrackerStatus('polling')}>
            Start Verification
          </Button>
        )}

        {(trackerStatus === 'failed' || trackerStatus === 'timeout') && (
          <Button onClick={handleRetry} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry Verification
          </Button>
        )}

        {trackerStatus === 'success' && (
          <div className="text-center text-green-400">
            <CheckCircle className="w-6 h-6 inline-block mr-2" />
            Payment Complete
          </div>
        )}
      </div>

      {/* Help Text */}
      {trackerStatus === 'polling' && (
        <p className="text-xs text-ink-muted text-center mt-4">
          Please check your phone for M-Pesa confirmation. This may take up to{' '}
          {Math.ceil((maxPollingAttempts * pollingInterval) / 1000 / 60)} minutes.
        </p>
      )}
      </div>
    </>
  );
};

export default PaymentStatusTracker;
