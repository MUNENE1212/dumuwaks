/**
 * ApprovalModal Component
 *
 * Modal component for approve/reject actions on pending services.
 * Displays service details and provides form for approval notes or rejection reason.
 *
 * @module components/admin/ApprovalModal
 */

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';
import type { PendingService } from '@/types/service';
import { formatPrice, getPriceRangeDisplay } from '@/services/service.service';

/**
 * Modal action types
 */
type ModalAction = 'approve' | 'reject';

/**
 * Props for the ApprovalModal component
 */
interface ApprovalModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** The pending service being reviewed */
  service: PendingService | null;
  /** The action being performed */
  action: ModalAction;
  /** Callback when approve action is confirmed */
  onApprove: (id: string, notes?: string) => Promise<void>;
  /** Callback when reject action is confirmed */
  onReject: (id: string, reason: string) => Promise<void>;
  /** Whether an action is currently loading */
  isLoading: boolean;
}

/**
 * ApprovalModal component for reviewing and taking action on pending services.
 *
 * Features:
 * - Displays full service details
 * - For approve: optional notes textarea
 * - For reject: required reason textarea
 * - WCAG 2.1 AA accessible
 * - Responsive design
 * - Keyboard navigation support
 *
 * @param props - Component props
 * @returns The rendered modal component
 */
const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  service,
  action,
  onApprove,
  onReject,
  isLoading,
}) => {
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal closes or service changes
  useEffect(() => {
    if (!isOpen) {
      setNotes('');
      setReason('');
      setError('');
    }
  }, [isOpen, service]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Trap focus within modal
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      return () => document.removeEventListener('keydown', handleTab);
    }
  }, [isOpen]);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!service) return;

    if (action === 'reject' && !reason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    setError('');

    try {
      if (action === 'approve') {
        await onApprove(service._id, notes.trim() || undefined);
      } else {
        await onReject(service._id, reason.trim());
      }
      onClose();
    } catch (err) {
      // Error is handled by parent component
    }
  };

  /**
   * Get category name from ID (placeholder - would normally be looked up)
   */
  const getCategoryName = (categoryId: string): string => {
    // This would normally be looked up from the categories list
    return categoryId || 'Unknown Category';
  };

  if (!isOpen || !service) return null;

  const isApprove = action === 'approve';
  const title = isApprove ? 'Approve Service' : 'Reject Service';
  const confirmText = isApprove ? 'Approve' : 'Reject';
  const confirmVariant = isApprove ? 'primary' : 'danger';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-000/70"
        onClick={isLoading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={clsx(
          'relative w-full max-w-lg rounded-xl shadow-glass-lg',
          'bg-charcoal border border-line',
          'animate-scale-in'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <h2
            id="modal-title"
            className={clsx(
              'text-xl font-semibold',
              isApprove ? 'text-lumen-ink' : 'text-error'
            )}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              'text-steel hover:text-bone hover:bg-surface-300',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Service Details */}
        <div className="p-6 space-y-4">
          <div className="glass rounded-lg p-4 space-y-3">
            <h3 className="text-bone font-semibold text-lg">
              {service.name}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-steel">Category:</span>
                <span className="ml-2 text-bone">
                  {getCategoryName(service.categoryId)}
                </span>
              </div>
              <div>
                <span className="text-steel">Duration:</span>
                <span className="ml-2 text-bone">
                  {service.estimatedDuration}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-steel">Price Range:</span>
                <span className="ml-2 text-lumen-ink font-medium">
                  {getPriceRangeDisplay(service.basePriceMin, service.basePriceMax)}
                </span>
              </div>
            </div>
            <p className="text-steel text-sm">
              {service.description}
            </p>
            {service.requestedBy && (
              <div className="pt-3 border-t border-line">
                <span className="text-steel text-sm">Requested by:</span>
                <span className="ml-2 text-bone text-sm">
                  {service.requestedBy.firstName} {service.requestedBy.lastName}
                </span>
                <span className="ml-2 text-steel text-xs">
                  ({service.requestedBy.email})
                </span>
              </div>
            )}
          </div>

          {/* Action Form */}
          <div className="space-y-3">
            <label
              htmlFor="action-textarea"
              className="block text-sm font-medium text-bone"
            >
              {isApprove ? 'Approval Notes (optional)' : 'Rejection Reason (required)'}
            </label>
            <textarea
              ref={textareaRef}
              id="action-textarea"
              value={isApprove ? notes : reason}
              onChange={(e) => {
                if (isApprove) {
                  setNotes(e.target.value);
                } else {
                  setReason(e.target.value);
                }
                setError('');
              }}
              placeholder={
                isApprove
                  ? 'Add optional notes for the technician...'
                  : 'Please provide a reason for rejection...'
              }
              rows={4}
              disabled={isLoading}
              className={clsx(
                'w-full px-4 py-3 rounded-lg',
                'bg-surface-100 border transition-colors',
                'text-bone placeholder:text-steel/60',
                'focus:outline-none focus:ring-2',
                error
                  ? 'border-error focus:ring-error/50'
                  : 'border-line focus:ring-lumen/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-describedby={error ? 'textarea-error' : undefined}
            />
            {error && (
              <p
                id="textarea-error"
                className="text-sm text-error"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-line">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;
