/**
 * CounterOfferNegotiation Component
 * Enhanced negotiation UI with offer history, price comparison, and multiple rounds
 *
 * Task #74: Real-Time Pricing & Negotiation
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  History,
  DollarSign,
  User,
  AlertCircle,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import {
  CounterOffer,
  NegotiationHistoryItem,
  PRICING_SOCKET_EVENTS
} from '@/types/pricing';
import { Booking } from '@/types';
import socketService from '@/services/socket';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';

interface CounterOfferNegotiationProps {
  booking: Booking;
  counterOffer: CounterOffer | null;
  negotiationHistory: NegotiationHistoryItem[];
  maxRounds: number;
  roundsRemaining: number;
  userRole: 'customer' | 'technician';
  onAccept: (bookingId: string) => Promise<void>;
  onReject: (bookingId: string, reason?: string) => Promise<void>;
  onCounterPropose: (bookingId: string, amount: number, reason: string) => Promise<void>;
  className?: string;
}

const CounterOfferNegotiation: React.FC<CounterOfferNegotiationProps> = ({
  booking,
  counterOffer,
  negotiationHistory: initialHistory,
  maxRounds,
  roundsRemaining: initialRoundsRemaining,
  userRole,
  onAccept,
  onReject,
  onCounterPropose,
  className = ''
}) => {
  const [negotiationHistory, setNegotiationHistory] = useState(initialHistory);
  const [roundsRemaining, setRoundsRemaining] = useState(initialRoundsRemaining);
  const [isLoading, setIsLoading] = useState(false);
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterReason, setCounterReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Subscribe to real-time negotiation updates
  useEffect(() => {
    if (!booking._id) return;

    // Subscribe to counter-offer updates
    socketService.emit(PRICING_SOCKET_EVENTS.COUNTER_OFFER_SUBSCRIBE, {
      bookingId: booking._id
    });

    // Listen for new counter-offers
    socketService.on(PRICING_SOCKET_EVENTS.COUNTER_OFFER_NEW, (data: any) => {
      if (data.bookingId === booking._id) {
        toast.success('New counter-offer received!');
        // Refresh would happen via parent component
      }
    });

    // Listen for acceptance
    socketService.on(PRICING_SOCKET_EVENTS.COUNTER_OFFER_ACCEPTED, (data: any) => {
      if (data.bookingId === booking._id) {
        toast.success('Counter-offer accepted!');
      }
    });

    // Listen for rejection
    socketService.on(PRICING_SOCKET_EVENTS.COUNTER_OFFER_REJECTED, (data: any) => {
      if (data.bookingId === booking._id) {
        toast.error('Counter-offer rejected');
        if (data.canRenegotiate) {
          setShowCounterForm(true);
        }
      }
    });

    return () => {
      socketService.emit(PRICING_SOCKET_EVENTS.COUNTER_OFFER_UNSUBSCRIBE, {
        bookingId: booking._id
      });
      socketService.off(PRICING_SOCKET_EVENTS.COUNTER_OFFER_NEW);
      socketService.off(PRICING_SOCKET_EVENTS.COUNTER_OFFER_ACCEPTED);
      socketService.off(PRICING_SOCKET_EVENTS.COUNTER_OFFER_REJECTED);
    };
  }, [booking._id]);

  const formatCurrency = (amount: number, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatTimeRemaining = (validUntil: string) => {
    const now = new Date();
    const expiry = new Date(validUntil);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const getTimeRemainingClass = (validUntil: string) => {
    const now = new Date();
    const expiry = new Date(validUntil);
    const diff = expiry.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours <= 0) return 'text-red-600 dark:text-red-400';
    if (hours < 1) return 'text-orange-600 dark:text-orange-400';
    if (hours < 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept(booking._id);
      toast.success('Counter-offer accepted!');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to accept counter-offer'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject(booking._id, rejectReason);
      toast.success('Counter-offer rejected');
      setShowRejectForm(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to reject counter-offer'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCounterPropose = async () => {
    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!counterReason.trim()) {
      toast.error('Please provide a reason for your counter-proposal');
      return;
    }

    setIsLoading(true);
    try {
      await onCounterPropose(booking._id, amount, counterReason);
      toast.success('Counter-proposal sent!');
      setShowCounterForm(false);
      setCounterAmount('');
      setCounterReason('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to send counter-proposal'));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      case 'superseded':
        return <RefreshCw className="h-5 w-5 text-gray-400" />;
      case 'withdrawn':
        return <XCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'rejected':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'pending':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'expired':
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  // Calculate price difference from original
  const originalPrice = booking.pricing?.estimatedCost || 0;
  const proposedPrice = counterOffer?.proposedPricing?.totalAmount || 0;
  const priceDifference = proposedPrice - originalPrice;
  const percentageChange = originalPrice > 0 ? ((priceDifference / originalPrice) * 100).toFixed(1) : '0';

  if (!counterOffer || counterOffer.status !== 'pending') {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary-500" />
            Counter Offer
          </h3>
          {counterOffer.validUntil && (
            <span className={`text-sm ${getTimeRemainingClass(counterOffer.validUntil)}`}>
              <Clock className="h-4 w-4 inline mr-1" />
              {formatTimeRemaining(counterOffer.validUntil)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Round {counterOffer.round || 1} of {maxRounds} - {roundsRemaining} rounds remaining
        </p>
      </div>

      {/* Price comparison */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Original price */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Original</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(originalPrice, counterOffer.proposedPricing.currency)}
            </p>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 text-gray-400" />
          </div>

          {/* Proposed price */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Proposed</p>
            <p className={`text-xl font-bold ${priceDifference > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {formatCurrency(proposedPrice, counterOffer.proposedPricing.currency)}
            </p>
            {priceDifference !== 0 && (
              <p className={`text-sm ${priceDifference > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {priceDifference > 0 ? '+' : ''}{formatCurrency(priceDifference, counterOffer.proposedPricing.currency)}
                ({priceDifference > 0 ? '+' : ''}{percentageChange}%)
              </p>
            )}
          </div>
        </div>

        {/* Reason */}
        {counterOffer.reason && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Reason:</strong> {counterOffer.reason}
            </p>
            {counterOffer.additionalNotes && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {counterOffer.additionalNotes}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Negotiation history */}
      {negotiationHistory.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
            <History className="h-4 w-4" />
            Negotiation History
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {negotiationHistory.map((item) => (
              <div
                key={`${item.round}-${item.proposedAt}`}
                className={`p-3 rounded-lg border ${getStatusColor(item.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Round {item.round}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      by {item.proposedBy === 'technician' ? 'Technician' : 'Customer'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(item.proposedAmount, counterOffer.proposedPricing.currency)}
                  </span>
                </div>
                {item.reason && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer actions */}
      {userRole === 'customer' && counterOffer.status === 'pending' && (
        <div className="p-4">
          {!showRejectForm && !showCounterForm ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleAccept}
                variant="primary"
                disabled={isLoading}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Offer
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                variant="outline"
                disabled={isLoading}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              {roundsRemaining > 0 && (
                <Button
                  onClick={() => setShowCounterForm(true)}
                  variant="secondary"
                  disabled={isLoading}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Counter ({roundsRemaining} left)
                </Button>
              )}
            </div>
          ) : showRejectForm ? (
            <div className="space-y-4">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)"
                rows={2}
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleReject}
                  variant="danger"
                  disabled={isLoading}
                  className="flex-1"
                >
                  Confirm Rejection
                </Button>
                <Button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectReason('');
                  }}
                  variant="outline"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Counter Amount (KES)
                </label>
                <Input
                  type="number"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  placeholder={originalPrice.toString()}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for Counter *
                </label>
                <Textarea
                  value={counterReason}
                  onChange={(e) => setCounterReason(e.target.value)}
                  placeholder="Explain why you're proposing this amount..."
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCounterPropose}
                  variant="primary"
                  disabled={isLoading || !counterAmount || !counterReason.trim()}
                  className="flex-1"
                >
                  Send Counter Proposal
                </Button>
                <Button
                  onClick={() => {
                    setShowCounterForm(false);
                    setCounterAmount('');
                    setCounterReason('');
                  }}
                  variant="outline"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                This will be round {(counterOffer.round || 1) + 1} of {maxRounds}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Technician view (read-only) */}
      {userRole === 'technician' && counterOffer.status === 'pending' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            <Clock className="h-4 w-4 inline mr-1" />
            Waiting for customer response...
          </p>
        </div>
      )}
    </div>
  );
};

export default CounterOfferNegotiation;
