/**
 * ResumeBookingModal Component
 *
 * Modal that appears when a user returns to the booking page with a saved draft.
 * Shows a summary of the saved booking and allows the user to either:
 * - Resume the booking from where they left off
 * - Start fresh with a new booking
 *
 * Features:
 * - Shows draft summary (service, technician, date, time)
 * - Shows when the draft was saved
 * - "Resume" button to continue the saved booking
 * - "Start Fresh" button to clear draft and begin new booking
 */

import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { Clock, Wrench, MapPin, Calendar, RotateCcw, Trash2, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { SerializableBookingDraft } from '@/lib/bookingPersistence';
import { formatDraftAge } from '@/lib/bookingPersistence';

interface ResumeBookingModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** The saved draft data to display */
  draft: SerializableBookingDraft | null;
  /** Called when user chooses to resume the booking */
  onResume: () => void;
  /** Called when user chooses to start fresh */
  onStartFresh: () => void;
  /** Called when modal is closed (optional, for clicking outside) */
  onClose?: () => void;
}

/**
 * ResumeBookingModal Component
 *
 * Displays a modal asking the user if they want to resume
 * their previously saved booking draft.
 */
const ResumeBookingModal: React.FC<ResumeBookingModalProps> = ({
  isOpen,
  draft,
  onResume,
  onStartFresh,
  onClose,
}) => {
  /**
   * Handle resume button click
   */
  const handleResume = useCallback(() => {
    onResume();
  }, [onResume]);

  /**
   * Handle start fresh button click
   */
  const handleStartFresh = useCallback(() => {
    onStartFresh();
  }, [onStartFresh]);

  /**
   * Handle clicking on the backdrop
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && onClose) {
        onClose();
      }
    },
    [onClose]
  );

  /**
   * Handle keyboard events for accessibility
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    },
    [onClose]
  );

  // Don't render if not open or no draft
  if (!isOpen || !draft) {
    return null;
  }

  // Format the saved time
  const savedTimeAgo = formatDraftAge();

  // Extract key information from draft
  const serviceName = draft.selectedService?.name || 'Unknown service';
  const serviceCategory = (draft.selectedService as any)?.categoryName || '';
  const technicianName = draft.selectedTechnician
    ? `${draft.selectedTechnician.firstName} ${draft.selectedTechnician.lastName}`
    : null;
  const technicianRating = draft.selectedTechnician?.rating?.average;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-100/80"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-booking-title"
      aria-describedby="resume-booking-description"
      data-testid="resume-booking-modal"
    >
      <Card
        variant="glass"
        className="w-full max-w-lg shadow-brand-lg border-lumen/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-lumen/20 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-lumen-ink" />
            </div>
            <div>
              <h2
                id="resume-booking-title"
                className="text-xl font-semibold text-bone"
              >
                Resume Your Booking?
              </h2>
              <p
                id="resume-booking-description"
                className="text-sm text-steel mt-1"
              >
                You have an unfinished booking from {savedTimeAgo}
              </p>
            </div>
          </div>
        </div>

        {/* Draft Summary */}
        <div className="p-6 space-y-4">
          {/* Service Info */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-lumen/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-lumen-ink" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-steel uppercase tracking-wider">
                Service
              </p>
              <p className="text-bone font-medium truncate">{serviceName}</p>
              {serviceCategory && (
                <p className="text-sm text-steel">{serviceCategory}</p>
              )}
            </div>
          </div>

          {/* Technician Info */}
          {technicianName && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-wrench/10 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-4 h-4 text-wrench" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-steel uppercase tracking-wider">
                  Technician
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-bone font-medium">{technicianName}</p>
                  {technicianRating !== undefined && technicianRating > 0 && (
                    <span className="text-xs text-steel">
                      ({technicianRating.toFixed(1)} rating)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Schedule Info */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-steel uppercase tracking-wider">
                Scheduled
              </p>
              <p className="text-bone font-medium">
                {draft.scheduledDate || 'Not selected'}
                {draft.scheduledTime && ` at ${draft.scheduledTime}`}
              </p>
            </div>
          </div>

          {/* Location Info */}
          {draft.location.address && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-steel uppercase tracking-wider">
                  Location
                </p>
                <p className="text-bone truncate">{draft.location.address}</p>
              </div>
            </div>
          )}

          {/* Current Step Info */}
          <div className="pt-2 border-t border-line">
            <p className="text-sm text-steel">
              You were on step {draft.currentStep} of 5
            </p>
          </div>

          {/* Note about attachments */}
          {draft.attachmentFileNames.length > 0 && (
            <div className="p-3 bg-charcoal rounded-lg border border-line">
              <p className="text-xs text-steel">
                <span className="font-medium text-bone">Note:</span>{' '}
                {draft.attachmentFileNames.length} attachment
                {draft.attachmentFileNames.length !== 1 ? 's' : ''} were in
                your draft. You will need to re-upload them.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-line flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleResume}
            className="flex-1"
            data-testid="resume-button"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Resume Booking
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleStartFresh}
            className="flex-1"
            data-testid="start-fresh-button"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Start Fresh
          </Button>
        </div>

        {/* Footer Note */}
        <div className="px-6 pb-4">
          <p className="text-xs text-steel text-center">
            Drafts are automatically cleared after 24 hours
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ResumeBookingModal;
