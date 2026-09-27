import React, { useState, useEffect } from 'react';
import { X, Star, Sparkles, Gift, Zap, Trophy, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';

interface ReviewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  technicianName: string;
  serviceCategory: string;
  onReviewSubmitted: () => void;
}

/**
 * ReviewRequestModal - Non-intrusive, dopamine-incentivized review collection
 *
 * Psychology principles:
 * 1. Immediate reward anticipation (visual feedback)
 * 2. Progress disclosure (5-step star rating)
 * 3. Social proof (show impact of review)
 * 4. Achievement unlocking (badges/milestones)
 * 5. Effortless interaction (minimal clicks)
 */
export const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  technicianName,
  serviceCategory,
  onReviewSubmitted
}) => {
  const [step, setStep] = useState<'rating' | 'written' | 'celebration'>('rating');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('rating');
      setRating(0);
      setHoveredRating(0);
      setReviewText('');
      setShowConfetti(false);
    }
  }, [isOpen]);

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);

    // Auto-advance to written review after rating selection with small delay for visual feedback
    setTimeout(() => {
      setStep('written');
    }, 300);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post('/reviews', {
        booking: bookingId,
        rating,
        text: reviewText.trim() || `Great ${serviceCategory} service from ${technicianName}!`
      });

      // Show celebration
      setShowConfetti(true);
      setStep('celebration');

      // Trigger celebration callback
      setTimeout(() => {
        onReviewSubmitted();
        setTimeout(() => onClose(), 3000);
      }, 2000);
    } catch (error: unknown) {
      console.error('Failed to submit review:', error);
      toast.error(getErrorMessage(error, 'Failed to submit review. Please try again.'));
      setIsSubmitting(false);
    }
  };

  const skipReview = () => {
    // Allow skip without penalty
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-000/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-surface-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-request-title"
        >
          {/* Header */}
          <div className=" bg-primary-500 p-6 text-on-lumen">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-ink/20 rounded-full p-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="review-request-title" className="text-xl font-bold">How was your experience?</h2>
                  <p className="text-sm text-ink/90 mt-1">
                    {step === 'rating' && 'Rate your recent service'}
                    {step === 'written' && 'Share your thoughts (optional)'}
                    {step === 'celebration' && 'Thank you! 🎉'}
                  </p>
                </div>
              </div>
              <button
                onClick={skipReview}
                className="text-ink/80 hover:text-ink transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-1 rounded-full transition-colors ${
                step === 'rating' ? 'bg-primary-500' : 'bg-primary-500'
              }`} />
              <div className={`flex-1 h-1 rounded-full transition-colors ${
                step === 'written' || step === 'celebration' ? '' : 'bg-surface-300'
              }`} />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'rating' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="mb-6">
                  <p className="text-ink-muted mb-4">
                    Your {serviceCategory} service with <strong>{technicianName}</strong>
                  </p>

                  {/* Interactive Star Rating */}
                  <div className="flex justify-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        onClick={() => handleRatingClick(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className="transition-transform"
                        aria-label={`Rate ${star} stars`}
                      >
                        <Star
                          className={`w-12 h-12 transition-colors ${
                            (hoveredRating || rating) >= star
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-ink-muted'
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>

                  {/* Rating Label */}
                  {rating > 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-lg font-semibold text-primary-400"
                    >
                      {rating === 5 && 'Excellent! 👏'}
                      {rating === 4 && 'Very Good!'}
                      {rating === 3 && 'Good'}
                      {rating === 2 && 'Fair'}
                      {rating === 1 && 'Poor'}
                    </motion.p>
                  )}
                </div>

                {/* Impact Message - Dopamine Hit */}
                {rating > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className=" bg-primary-900/20 rounded-xl p-4 border border-primary-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-900/50 rounded-full p-2">
                        <Gift className="w-5 h-5 text-primary-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-primary-100">
                          Your review helps {technicianName} grow!
                        </p>
                        <p className="text-xs text-primary-300 mt-1">
                          Reviews improve technician rankings and visibility
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 'written' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="mb-4">
                  <p className="text-ink-muted text-sm mb-3">
                    Tell others about your experience (optional)
                  </p>

                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="What did you like? Was the technician professional? Was the pricing fair?"
                    className="w-full h-32 px-4 py-3 border border-line-strong rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-surface-300 text-ink text-ink resize-none"
                    maxLength={500}
                  />

                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-ink-muted">
                      {reviewText.length}/500 characters
                    </p>
                    <button
                      onClick={() => setReviewText('')}
                      className="text-xs text-primary-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Quick Tags - Make it Easy */}
                <div className="mb-6">
                  <p className="text-xs text-ink-muted mb-2">
                    Quick tap to add:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Professional', 'On time', 'Fair pricing', 'Skilled', 'Friendly', 'Clean work'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (!reviewText.includes(tag)) {
                            setReviewText(reviewText ? `${reviewText} ${tag}` : tag);
                          }
                        }}
                        className="px-3 py-1.5 bg-surface-300 rounded-full text-sm text-ink-muted hover:bg-primary-900/30 hover:text-primary-300 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'celebration' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="mb-6">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="inline-block"
                  >
                    <div className=" bg-primary-500 rounded-full p-4">
                      <Trophy className="w-12 h-12 text-ink" />
                    </div>
                  </motion.div>
                </div>

                <h3 className="text-2xl font-bold text-ink dark:text-ink mb-2">
                  Review Submitted!
                </h3>

                <p className="text-ink-muted mb-6">
                  You're helping build trust in our community
                </p>

                {/* Achievement Unlocked */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className=" bg-yellow-900/20 rounded-xl p-4 border border-yellow-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-900/50 rounded-full p-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-yellow-100">
                        Achievement Unlocked: First Review!
                      </p>
                      <p className="text-xs text-yellow-300 mt-1">
                        You've earned the "Community Pioneer" badge
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Footer Actions */}
          {step !== 'celebration' && (
            <div className="px-6 pb-6">
              {step === 'rating' && (
                <button
                  onClick={skipReview}
                  className="w-full text-sm text-ink-muted hover:text-ink-muted transition-colors py-2"
                >
                  Maybe later
                </button>
              )}

              {step === 'written' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('rating')}
                    className="flex-1 px-4 py-3 text-ink-muted hover:bg-surface-300 rounded-xl transition-colors font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-primary-500 text-on-lumen rounded-xl font-medium hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-ink/30 border-t-line rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Submit Review
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReviewRequestModal;
