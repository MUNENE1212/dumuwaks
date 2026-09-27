import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';
import { Booking, submitCounterOffer } from '@/store/slices/bookingSlice';
import { useAppDispatch } from '@/store/hooks';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { counterOfferSchema, type CounterOfferFormData } from '@/lib/validation';

interface CounterOfferModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
}

const CounterOfferModal: React.FC<CounterOfferModalProps> = ({ booking, isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CounterOfferFormData>({
    resolver: zodResolver(counterOfferSchema),
    defaultValues: {
      proposedAmount: booking.pricing.totalAmount,
      reason: '',
      additionalNotes: '',
    },
  });

  if (!isOpen) return null;

  const proposedAmount = watch('proposedAmount');
  const priceDifference = (proposedAmount || 0) - booking.pricing.totalAmount;
  const percentageChange = ((priceDifference / booking.pricing.totalAmount) * 100).toFixed(1);

  const onSubmit = async (data: CounterOfferFormData) => {
    try {
      setIsSubmitting(true);
      await dispatch(
        submitCounterOffer({
          bookingId: booking._id,
          proposedAmount: data.proposedAmount,
          reason: data.reason,
          additionalNotes: data.additionalNotes || '',
        })
      ).unwrap();
      toast.success('Counter offer submitted successfully!');
      onClose();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to submit counter offer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-000 bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-surface-200 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="counter-offer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <h2 id="counter-offer-title" className="text-xl font-semibold text-ink">
            Submit Counter Offer
          </h2>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink"
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Original Price */}
          <div className="bg-surface-300/50 rounded-lg p-4">
            <p className="text-sm text-ink-muted">Original Price</p>
            <p className="text-2xl font-bold text-ink">
              {booking.pricing.currency} {booking.pricing.totalAmount.toLocaleString()}
            </p>
          </div>

          {/* Proposed Amount */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Your Proposed Price
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ink-muted" />
              <Input
                type="number"
                {...register('proposedAmount', { valueAsNumber: true })}
                className="pl-10"
                placeholder="Enter proposed amount"
                min="0"
                step="1"
              />
            </div>
            {errors.proposedAmount && (
              <p className="mt-1 text-sm text-red-600">{errors.proposedAmount.message}</p>
            )}
            {!errors.proposedAmount && priceDifference !== 0 && !isNaN(priceDifference) && (
              <p
                className={`mt-1 text-sm ${
                  priceDifference > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {priceDifference > 0 ? '+' : ''}
                {booking.pricing.currency} {Math.abs(priceDifference).toLocaleString()} (
                {priceDifference > 0 ? '+' : ''}
                {percentageChange}%)
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Reason for Counter Offer *
            </label>
            <Textarea
              {...register('reason')}
              placeholder="e.g., Additional materials needed, More time required, etc."
              rows={3}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Additional Notes (Optional)
            </label>
            <Textarea
              {...register('additionalNotes')}
              placeholder="Any additional information for the customer..."
              rows={2}
            />
          </div>

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              The customer has 24 hours to accept or reject your counter offer.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Counter Offer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CounterOfferModal;
