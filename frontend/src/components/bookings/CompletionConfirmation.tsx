import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Booking, confirmCompletion } from '@/store/slices/bookingSlice';
import { useAppDispatch } from '@/store/hooks';
import { Button } from '@/components/ui';

interface CompletionConfirmationProps {
  booking: Booking;
  onUpdate?: () => void;
}

const CompletionConfirmation: React.FC<CompletionConfirmationProps> = ({ booking, onUpdate }) => {
  const dispatch = useAppDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [issues, setIssues] = useState('');

  const handleApprove = async () => {
    if (isProcessing) return;

    const confirmed = window.confirm(
      'Are you sure you want to approve job completion? This will release payment to the technician.'
    );
    if (!confirmed) return;

    try {
      setIsProcessing(true);
      await dispatch(
        confirmCompletion({
          bookingId: booking._id,
          approved: true,
          feedback: feedback || undefined,
        })
      ).unwrap();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Approval error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!issues.trim()) {
      alert('Please describe the issues with the job');
      return;
    }

    if (isProcessing) return;

    try {
      setIsProcessing(true);
      await dispatch(
        confirmCompletion({
          bookingId: booking._id,
          approved: false,
          feedback: feedback || undefined,
          issues,
        })
      ).unwrap();
      setShowRejectForm(false);
      setFeedback('');
      setIssues('');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Rejection error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-yellow-100 mb-2">
            Job Completion Confirmation Required
          </h3>
          <p className="text-sm text-yellow-300 mb-4">
            The technician has marked this job as completed. Please review the work and confirm whether it meets your expectations.
          </p>

          {!showRejectForm ? (
            <>
              {/* Optional feedback */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-yellow-100 mb-2">
                  Additional Feedback (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your experience with the service..."
                  rows={3}
                  className="w-full px-3 py-2 border border-yellow-700 rounded-lg bg-surface-200 text-ink placeholder-ink-faint focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Approve Completion'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isProcessing}
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-900/20 flex items-center justify-center"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Report Issues
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Rejection Form */}
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-yellow-100 mb-2">
                    What issues did you find? <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={issues}
                    onChange={(e) => setIssues(e.target.value)}
                    placeholder="Please describe the issues with the completed work..."
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-yellow-700 rounded-lg bg-surface-200 text-ink placeholder-ink-faint focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-yellow-100 mb-2">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Any additional feedback..."
                    rows={2}
                    className="w-full px-3 py-2 border border-yellow-700 rounded-lg bg-surface-200 text-ink placeholder-ink-faint focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectForm(false);
                    setIssues('');
                  }}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleReject}
                  disabled={isProcessing || !issues.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 flex items-center justify-center"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Submitting...' : 'Submit Issues'}
                </Button>
              </div>
            </>
          )}

          <p className="text-xs text-yellow-400 mt-4">
            <strong>Note:</strong> Approving releases the held payment to the technician. If you don't respond within 3 days of the technician marking the job done, it is released automatically — report a problem before then if something is wrong.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompletionConfirmation;
