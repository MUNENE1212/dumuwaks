import React, { useEffect, useState } from 'react';
import { Star, MessageCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import axios from '@/lib/axios';
import { Link } from 'react-router-dom';

/**
 * HonestTestimonials - Shows ONLY real reviews from verified customers
 * No fake testimonials, no stock photos, no inflated claims
 */
export const HonestTestimonials: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get('/public/reviews', {
          params: {
            limit: 6,
            minRating: 1,
            sort: '-createdAt'
          }
        });

        setReviews(response.data.data.reviews);
      } catch (err: any) {
        console.error('Failed to fetch reviews:', err);
        // Don't show error, just show "no reviews yet"
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  // No reviews yet - honest state
  if (!loading && reviews.length === 0) {
    return (
      <section className={cn('py-12 px-4', className)}>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-ink dark:text-ink mb-2">
            What Customers Say
          </h2>
          <p className="text-ink-muted">
            We're new and don't have reviews yet
          </p>
        </div>

        <div className="max-w-2xl mx-auto flex flex-col gap-8 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-purple-900/30 rounded-full p-4">
              <MessageCircle className="w-12 h-12 text-purple-400 opacity-50" />
            </div>
            <h3 className="text-2xl font-bold text-ink dark:text-ink">
              No Reviews Yet - Be the First!
            </h3>
            <p className="text-ink-muted max-w-md">
              We're a new platform and haven't completed our first bookings yet.
              We'd love for you to try Dumuwaks and share your honest experience.
            </p>
          </div>

          <div className="bg-surface-100/50 p-6 rounded-lg text-left">
            <h4 className="text-lg font-semibold text-ink dark:text-ink mb-4">
              Why Trust Dumuwaks?
            </h4>
            <ul className="space-y-3 text-ink-muted">
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span><strong>Check before you book</strong> - ratings and finished jobs on every profile</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span><strong>Transparent pricing</strong> - See exact cost before booking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span><strong>Secure payments</strong> - M-Pesa escrow protects both sides</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span><strong>Dispute resolution</strong> - We mediate if issues arise</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span><strong>Real accountability</strong> - Technicians must maintain ratings</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Link
              to="/create-booking"
              className="inline-flex items-center px-6 py-3 bg-indigo-500 text-on-lumen font-semibold rounded-lg hover:bg-indigo-600 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Be the First to Review
            </Link>
            <p className="text-sm text-ink-muted">
              After your first booking, you'll receive an email to leave your honest review.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Loading state
  if (loading) {
    return (
      <section className={cn('py-12 px-4', className)}>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-ink dark:text-ink mb-2">
            What Real Customers Say
          </h2>
          <p className="text-ink-muted">
            Loading reviews...
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-surface-200 border border-line rounded-lg">
              <div className="h-5 w-24 mb-4 bg-surface-300 rounded animate-pulse" />
              <div className="h-4 mb-2 bg-surface-300 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-surface-300 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Show real reviews
  return (
    <section className={cn('py-12 px-4', className)}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-ink dark:text-ink mb-2">
          What Real Customers Say
        </h2>
        <p className="text-ink-muted">
          {reviews.length} review{reviews.length !== 1 ? 's' : ''} from completed bookings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {reviews.map((review) => (
          <div
            key={review._id}
            className="p-6 bg-surface-200 border border-line rounded-lg hover:border-purple-500 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                {[...Array(5 - review.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-ink-muted" />
                ))}
              </div>
              <div className="inline-flex items-center px-2 py-1 bg-green-900/30 text-green-300 text-xs font-semibold rounded">
                ✓ Verified Booking
              </div>
            </div>

            <p className="text-ink-muted mb-4 italic leading-relaxed">
              "{review.text}"
            </p>

            <div className="flex flex-wrap gap-2 text-sm text-ink-muted mb-3">
              <span className="font-medium text-ink dark:text-ink">
                {review.customer.firstName}
              </span>
              <span>from {review.customer.location.city}</span>
              <span>• {review.booking.serviceCategory}</span>
            </div>

            <div className="pt-3 border-t border-line">
              <span className="text-xs text-ink-muted">
                {formatDistanceToNow(new Date(review.createdAt))} ago
              </span>
            </div>
          </div>
        ))}
      </div>

      {reviews.length > 0 && (
        <div className="text-center mb-6">
          <Link
            to="/reviews"
            className="inline-flex items-center text-purple-400 font-semibold hover:text-purple-300 transition-colors"
          >
            See all {reviews.length} real reviews →
          </Link>
        </div>
      )}

      <div className="flex items-center gap-2 p-3 bg-surface-100/50 rounded-lg text-xs text-ink-muted max-w-2xl mx-auto">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Reviews can only be left by customers after a completed booking.
          We don't remove negative reviews unless they violate our policies.
        </span>
      </div>
    </section>
  );
};
