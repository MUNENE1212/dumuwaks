/**
 * M-Pesa Service
 *
 * Frontend service for M-Pesa payment integration with escrow system.
 * Handles STK Push initiation, status polling, and transaction history.
 */

import axiosInstance from '@/lib/axios';
import type {
  STKPushRequest,
  STKPushResponse,
  PaymentStatusResponse,
  TransactionHistoryResponse,
  MPesaPaymentType,
  PaymentPollingOptions,
  PhoneValidationResult,
} from '@/types/mpesa';

/**
 * Validate Kenyan phone number format
 * Supports 07XX, 01XX, +2547XX, +2541XX, 2547XX, 2541XX formats
 */
export const validateKenyanPhone = (phoneNumber: string): PhoneValidationResult => {
  if (!phoneNumber) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove spaces and dashes
  const cleaned = phoneNumber.replace(/[\s\-]/g, '');

  // Valid Kenyan phone patterns
  const patterns = [
    /^(254|0)(1|7)\d{8}$/,  // 254XXXXXXXXX or 0XXXXXXXXX
    /^\+254(1|7)\d{8}$/,     // +254XXXXXXXXX
  ];

  const isValid = patterns.some(pattern => pattern.test(cleaned));

  if (!isValid) {
    return {
      isValid: false,
      error: 'Invalid Kenyan phone number. Use format 07XX or 2547XX',
    };
  }

  // Format to 254XXX format for API
  let formattedNumber = cleaned;
  if (formattedNumber.startsWith('0')) {
    formattedNumber = '254' + formattedNumber.substring(1);
  } else if (formattedNumber.startsWith('+')) {
    formattedNumber = formattedNumber.substring(1);
  }

  return { isValid: true, formattedNumber };
};

/**
 * Initiate M-Pesa STK Push payment
 */
export const initiatePayment = async (
  phoneNumber: string,
  amount: number,
  bookingId: string,
  type: MPesaPaymentType = 'booking_fee'
): Promise<STKPushResponse> => {
  // Validate phone number
  const validation = validateKenyanPhone(phoneNumber);
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.error || 'Invalid phone number',
      error: validation.error,
    };
  }

  const response = await axiosInstance.post('/payments/mpesa/stkpush', {
    phoneNumber: validation.formattedNumber,
    amount,
    bookingId,
    type,
  });

  return response.data;
};

/**
 * Check payment status
 */
export const checkPaymentStatus = async (
  transactionId: string
): Promise<PaymentStatusResponse> => {
  const response = await axiosInstance.get(`/payments/mpesa/status/${transactionId}`);
  return response.data;
};

/**
 * Get transaction history
 */
export const getTransactionHistory = async (
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<TransactionHistoryResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) {
    params.append('status', status);
  }

  const response = await axiosInstance.get(`/payments/mpesa/history?${params}`);
  return response.data;
};

/**
 * Poll for payment status until completion, failure, or timeout
 */
export const pollPaymentStatus = async (
  transactionId: string,
  options: PaymentPollingOptions = {}
): Promise<PaymentStatusResponse> => {
  const {
    maxAttempts = 30,
    intervalMs = 2000,
    onSuccess,
    onFailure,
    onTimeout,
  } = options;

  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const statusResponse = await checkPaymentStatus(transactionId);

      if (statusResponse.transaction.status === 'completed') {
        onSuccess?.(transactionId);
        return statusResponse;
      }

      if (['failed', 'cancelled', 'expired'].includes(statusResponse.transaction.status)) {
        const error = statusResponse.transaction.failureReason || 'Payment failed';
        onFailure?.(error);
        return statusResponse;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    } catch (error) {
      console.error('Status check error:', error);
      // Continue polling on network errors
      attempts++;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  // Timeout reached
  onTimeout?.();
  throw new Error('Payment timeout. Please check your phone or try again.');
};

/**
 * Initiate payment and poll for status
 * Combines initiatePayment and pollPaymentStatus for convenience
 */
export const initiatePaymentWithPolling = async (
  phoneNumber: string,
  amount: number,
  bookingId: string,
  type: MPesaPaymentType = 'booking_fee',
  pollingOptions?: PaymentPollingOptions
): Promise<{
  stkResponse: STKPushResponse;
  statusResponse?: PaymentStatusResponse;
}> => {
  // Initiate STK Push
  const stkResponse = await initiatePayment(phoneNumber, amount, bookingId, type);

  if (!stkResponse.success || !stkResponse.data?.transactionId) {
    return { stkResponse };
  }

  // Poll for status
  try {
    const statusResponse = await pollPaymentStatus(
      stkResponse.data.transactionId,
      pollingOptions
    );
    return { stkResponse, statusResponse };
  } catch (error) {
    // Return STK response even if polling fails
    return { stkResponse };
  }
};

/**
 * Format amount for display (Kenyan Shilling)
 */
export const formatAmount = (amount: number, currency: string = 'KES'): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';

  // Remove non-digits
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Format as 254 XXX XXX XXX
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  // Format as 0XXX XXX XXX
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  return phoneNumber;
};

/**
 * Get payment type label
 */
export const getPaymentTypeLabel = (type: MPesaPaymentType): string => {
  const labels: Record<MPesaPaymentType, string> = {
    booking_fee: 'Booking Fee',
    booking_payment: 'Booking Payment',
    escrow_funding: 'Escrow Funding',
    escrow_payout: 'Escrow Payout',
    technician_payout: 'Technician Payout',
    refund: 'Refund',
    tip: 'Tip',
  };
  return labels[type] || type;
};

/**
 * Get status color class
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    initiated: 'text-yellow-400',
    pending: 'text-yellow-400',
    processing: 'text-blue-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
    cancelled: 'text-ink-muted',
    expired: 'text-orange-400',
    refunded: 'text-purple-400',
  };
  return colors[status] || 'text-ink-muted';
};

const mpesaService = {
  validateKenyanPhone,
  initiatePayment,
  checkPaymentStatus,
  getTransactionHistory,
  pollPaymentStatus,
  initiatePaymentWithPolling,
  formatAmount,
  formatPhoneNumber,
  getPaymentTypeLabel,
  getStatusColor,
};

export default mpesaService;
