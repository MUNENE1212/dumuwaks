/**
 * M-Pesa Payment Modal
 *
 * Modal component for initiating M-Pesa STK Push payments with escrow integration.
 * Features:
 * - Kenyan phone number validation (07XX, 01XX formats)
 * - STK Push initiation
 * - Real-time status polling
 * - Loading animations and user feedback
 * - M-Pesa branding colors
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Smartphone, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import mpesaService, { validateKenyanPhone, formatAmount } from '@/services/mpesa.service';
import type { MPesaPaymentType, MPesaPaymentStatus } from '@/types/mpesa';

interface MPesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency?: string;
  bookingId: string;
  paymentType?: MPesaPaymentType;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentFailure?: (error: string) => void;
}

type PaymentStep = 'input' | 'processing' | 'polling' | 'success' | 'failed';

const MPesaPaymentModal: React.FC<MPesaPaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  currency = 'KES',
  bookingId,
  paymentType = 'booking_fee',
  onPaymentSuccess,
  onPaymentFailure,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [step, setStep] = useState<PaymentStep>('input');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhoneNumber('');
      setPhoneError(null);
      setStep('input');
      setTransactionId(null);
      setCheckoutRequestId(null);
      setStatusMessage('');
      setPollingAttempts(0);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Poll for payment status
  const pollStatus = useCallback(async (txnId: string) => {
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds

    while (pollingAttempts < maxAttempts) {
      try {
        const response = await mpesaService.checkPaymentStatus(txnId);

        if (response.transaction.status === 'completed') {
          setStep('success');
          setStatusMessage('Payment completed successfully!');
          toast.success('Payment successful!');
          onPaymentSuccess(txnId);
          return;
        }

        if (['failed', 'cancelled', 'expired'].includes(response.transaction.status)) {
          setStep('failed');
          setErrorMessage(response.transaction.failureReason || 'Payment failed');
          onPaymentFailure?.(response.transaction.failureReason || 'Payment failed');
          return;
        }

        // Still pending, continue polling
        setPollingAttempts((prev) => prev + 1);
        setStatusMessage(`Waiting for payment confirmation... (${pollingAttempts + 1}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Status check error:', error);
        setPollingAttempts((prev) => prev + 1);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Timeout
    setStep('failed');
    setErrorMessage('Payment timeout. Please check your M-Pesa messages.');
    onPaymentFailure?.('Payment timeout');
  }, [pollingAttempts, onPaymentSuccess, onPaymentFailure]);

  // Handle payment initiation
  const handlePayment = async () => {
    // Validate phone number
    const validation = validateKenyanPhone(phoneNumber);
    if (!validation.isValid) {
      setPhoneError(validation.error || 'Invalid phone number');
      return;
    }

    setPhoneError(null);
    setStep('processing');
    setStatusMessage('Initiating payment...');

    try {
      const response = await mpesaService.initiatePayment(
        validation.formattedNumber!,
        amount,
        bookingId,
        paymentType
      );

      if (!response.success || !response.data) {
        setStep('failed');
        setErrorMessage(response.error || response.message || 'Failed to initiate payment');
        onPaymentFailure?.(response.error || 'Failed to initiate payment');
        return;
      }

      // STK Push successful, start polling
      setTransactionId(response.data.transactionId);
      setCheckoutRequestId(response.data.checkoutRequestId);
      setStep('polling');
      setStatusMessage('STK Push sent! Please check your phone and enter your M-Pesa PIN.');
      toast.success('STK Push sent! Check your phone and enter PIN.');

      // Start polling
      pollStatus(response.data.transactionId);
    } catch (error: unknown) {
      setStep('failed');
      const message = getErrorMessage(error, 'Payment initiation failed');
      setErrorMessage(message);
      onPaymentFailure?.(message);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setStep('input');
    setTransactionId(null);
    setCheckoutRequestId(null);
    setStatusMessage('');
    setPollingAttempts(0);
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  const getPaymentTypeLabel = () => {
    switch (paymentType) {
      case 'booking_fee':
        return 'Booking Fee';
      case 'booking_payment':
        return 'Completion Payment';
      case 'escrow_funding':
        return 'Escrow Funding';
      default:
        return 'Payment';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mpesa-payment-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="mpesa-payment-title" className="text-lg font-bold dark:text-gray-100">M-Pesa {getPaymentTypeLabel()}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Secure payment via M-Pesa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Amount Display */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-5 mb-5 text-white">
            <div className="text-sm opacity-90 mb-1">Amount to Pay</div>
            <div className="text-4xl font-bold">{formatAmount(amount, currency)}</div>
            {paymentType === 'booking_fee' && (
              <div className="text-xs opacity-80 mt-2">
                20% refundable booking deposit held in escrow
              </div>
            )}
          </div>

          {/* Step: Input */}
          {step === 'input' && (
            <>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  M-Pesa Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="0712 345 678"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setPhoneError(null);
                  }}
                  className={`w-full ${phoneError ? 'border-red-500' : ''}`}
                />
                {phoneError && (
                  <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Enter your M-Pesa number. You will receive an STK Push notification.
                </p>
              </div>

              {/* Security Features */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-5 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-blue-900 dark:text-blue-300">
                    Payment Protection
                  </span>
                </div>
                <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Funds held securely in escrow
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    100% refundable if you cancel
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Released after job completion
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Pay Now
                </Button>
              </div>
            </>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">{statusMessage}</p>
            </div>
          )}

          {/* Step: Polling */}
          {step === 'polling' && (
            <div className="text-center py-8">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25" />
                <div className="relative w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-white animate-bounce" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Check Your Phone
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{statusMessage}</p>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Transaction ID: {transactionId}
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Waiting for M-Pesa confirmation...
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Payment Successful!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{statusMessage}</p>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Transaction ID: {transactionId}
                </p>
              </div>
              <Button
                onClick={onClose}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Done
              </Button>
            </div>
          )}

          {/* Step: Failed */}
          {step === 'failed' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Payment Failed
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{errorMessage}</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRetry}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Shield className="w-4 h-4" />
            <span>Powered by Safaricom M-Pesa</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MPesaPaymentModal;
