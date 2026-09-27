/**
 * FeeTierModal Component
 *
 * Modal for editing or adding a booking fee tier.
 * Provides form validation and preview functionality.
 *
 * @module components/admin/FeeTierModal
 */

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import type { BookingFeeTier } from '@/services/feeConfig.service';

/**
 * Props for the FeeTierModal component
 */
interface FeeTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tier: BookingFeeTier) => void;
  tier?: BookingFeeTier | null;
  mode: 'add' | 'edit';
  existingTiers: BookingFeeTier[];
}

/**
 * Default tier values
 */
const defaultTier: BookingFeeTier = {
  minAmount: 0,
  maxAmount: null,
  percentage: 12,
  label: '',
  isActive: true,
};

/**
 * Fee Tier Modal Component
 */
const FeeTierModal: React.FC<FeeTierModalProps> = ({
  isOpen,
  onClose,
  onSave,
  tier,
  mode,
  existingTiers,
}) => {
  const [formData, setFormData] = useState<BookingFeeTier>(tier || defaultTier);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens or tier changes
  useEffect(() => {
    if (isOpen) {
      setFormData(tier || defaultTier);
      setErrors([]);
    }
  }, [isOpen, tier]);

  // Handle input changes
  const handleChange = (field: keyof BookingFeeTier, value: string | number | boolean | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear errors when user types
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Validate label
    if (!formData.label || formData.label.trim() === '') {
      newErrors.push('Label is required');
    }

    // Validate percentage
    if (typeof formData.percentage !== 'number' || formData.percentage < 0 || formData.percentage > 100) {
      newErrors.push('Percentage must be between 0 and 100');
    }

    // Validate minAmount
    if (typeof formData.minAmount !== 'number' || formData.minAmount < 0) {
      newErrors.push('Minimum amount must be a non-negative number');
    }

    // Validate maxAmount
    if (formData.maxAmount !== null) {
      if (typeof formData.maxAmount !== 'number' || formData.maxAmount <= formData.minAmount) {
        newErrors.push('Maximum amount must be greater than minimum amount');
      }
    }

    // Check for overlaps with existing tiers (excluding current tier if editing)
    const otherTiers = existingTiers.filter((t) => {
      if (mode === 'edit' && tier) {
        return t.label !== tier.label;
      }
      return true;
    });

    for (const existing of otherTiers) {
      const newMin = formData.minAmount;
      const newMax = formData.maxAmount;
      const existingMin = existing.minAmount;
      const existingMax = existing.maxAmount;

      // Check for overlap
      const hasOverlap = newMax === null
        ? newMin <= (existingMax === null ? Infinity : existingMax)
        : existingMax === null
        ? existingMin <= newMax
        : newMin <= existingMax && newMax >= existingMin;

      if (hasOverlap) {
        newErrors.push(`Overlap with existing tier "${existing.label}"`);
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error: unknown) {
      setErrors([error instanceof Error ? error.message : 'Failed to save tier']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-surface-000/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-surface-100 border border-line shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2
              id="modal-title"
              className="text-lg font-semibold text-bone"
            >
              {mode === 'add' ? 'Add New Fee Tier' : 'Edit Fee Tier'}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-steel hover:text-bone hover:bg-surface-300 transition-colors"
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-error/10 border border-error/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-error shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-error">Validation Error</h4>
                    <ul className="mt-1 text-sm text-error/80 list-disc list-inside">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Label */}
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-steel mb-2">
                Tier Label
              </label>
              <input
                type="text"
                id="label"
                value={formData.label}
                onChange={(e) => handleChange('label', e.target.value)}
                placeholder="e.g., Standard, Premium, Large Jobs"
                className="w-full px-4 py-2.5 bg-charcoal border border-line rounded-lg text-bone placeholder-steel/50 focus:outline-none focus:ring-2 focus:ring-lumen focus:border-transparent"
                required
              />
            </div>

            {/* Amount Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="minAmount" className="block text-sm font-medium text-steel mb-2">
                  Minimum Amount (KES)
                </label>
                <input
                  type="number"
                  id="minAmount"
                  value={formData.minAmount}
                  onChange={(e) => handleChange('minAmount', parseFloat(e.target.value) || 0)}
                  min="0"
                  className="w-full px-4 py-2.5 bg-charcoal border border-line rounded-lg text-bone focus:outline-none focus:ring-2 focus:ring-lumen focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="maxAmount" className="block text-sm font-medium text-steel mb-2">
                  Maximum Amount (KES)
                </label>
                <input
                  type="number"
                  id="maxAmount"
                  value={formData.maxAmount ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleChange('maxAmount', value === '' ? null : parseFloat(value));
                  }}
                  placeholder="Leave empty for no limit"
                  min="0"
                  className="w-full px-4 py-2.5 bg-charcoal border border-line rounded-lg text-bone placeholder-steel/50 focus:outline-none focus:ring-2 focus:ring-lumen focus:border-transparent"
                />
                <p className="mt-1 text-xs text-steel">Leave empty for unlimited</p>
              </div>
            </div>

            {/* Fee Percentage */}
            <div>
              <label htmlFor="percentage" className="block text-sm font-medium text-steel mb-2">
                Booking Fee Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="percentage"
                  value={formData.percentage}
                  onChange={(e) => handleChange('percentage', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  step="0.5"
                  className="w-full px-4 py-2.5 pr-12 bg-charcoal border border-line rounded-lg text-bone focus:outline-none focus:ring-2 focus:ring-lumen focus:border-transparent"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-steel">%</span>
              </div>
              <p className="mt-1 text-xs text-steel">
                This percentage will be charged as a booking fee for amounts in this tier
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-line bg-charcoal text-lumen-ink focus:ring-lumen focus:ring-offset-0"
              />
              <label htmlFor="isActive" className="text-sm text-steel">
                Tier is active
              </label>
            </div>

            {/* Preview */}
            <div className="bg-charcoal/50 rounded-lg p-4 border border-line">
              <h4 className="text-sm font-medium text-steel mb-2">Preview</h4>
              <div className="text-sm text-bone">
                <p>
                  <span className="text-steel">Tier:</span>{' '}
                  <span className="font-medium">{formData.label || 'Unnamed'}</span>
                </p>
                <p>
                  <span className="text-steel">Range:</span>{' '}
                  KES {formData.minAmount.toLocaleString()} - {formData.maxAmount ? `KES ${formData.maxAmount.toLocaleString()}` : 'No limit'}
                </p>
                <p>
                  <span className="text-steel">Fee:</span>{' '}
                  <span className="font-medium text-lumen-ink">{formData.percentage}%</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-steel hover:text-bone hover:bg-surface-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={clsx(
                  'px-4 py-2 text-sm font-medium text-ink rounded-lg transition-colors',
                  'bg-lumen hover:bg-lumen-hover',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isSubmitting ? 'Saving...' : mode === 'add' ? 'Add Tier' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeeTierModal;
