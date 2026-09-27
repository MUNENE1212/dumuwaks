import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import type { Service } from '@/types/service';
import type { PricingData } from '@/types/technicianService';
import ServiceDiscovery from '@/components/services/ServiceDiscovery';
import ServicePricingForm from './ServicePricingForm';

/**
 * Props for ServiceSelectorModal component
 */
interface ServiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (service: Service, pricing: PricingData) => void;
  excludeServiceIds?: string[];
}

/**
 * ServiceSelectorModal Component
 * Modal that shows WORD BANK for selecting services
 * When service is selected, shows pricing form
 * On submit, calls onSelect callback
 */
const ServiceSelectorModal: React.FC<ServiceSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  excludeServiceIds = [],
}) => {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle service selection from ServiceDiscovery
  const handleServiceSelect = useCallback((service: Service) => {
    // Check if service is already added
    if (excludeServiceIds.includes(service._id)) {
      return; // Service already added, don't select
    }

    setSelectedService(service);
    setShowPricingForm(true);
  }, [excludeServiceIds]);

  // Handle pricing form submission
  const handlePricingSubmit = useCallback(
    async (pricing: PricingData) => {
      if (!selectedService) return;

      setIsSubmitting(true);
      try {
        await onSelect(selectedService, pricing);
        // Reset and close on success
        setSelectedService(null);
        setShowPricingForm(false);
        onClose();
      } catch (error) {
        console.error('Error adding service:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedService, onSelect, onClose]
  );

  // Handle pricing form cancel
  const handlePricingCancel = useCallback(() => {
    setSelectedService(null);
    setShowPricingForm(false);
  }, []);

  // Handle back to service selection
  const handleBack = useCallback(() => {
    setSelectedService(null);
    setShowPricingForm(false);
  }, []);

  // Handle modal close with confirmation if service is selected
  const handleModalClose = useCallback(() => {
    if (showPricingForm) {
      // Ask for confirmation if pricing form is open
      if (
        window.confirm(
          'You have unsaved changes. Are you sure you want to close?'
        )
      ) {
        setSelectedService(null);
        setShowPricingForm(false);
        onClose();
      }
    } else {
      onClose();
    }
  }, [showPricingForm, onClose]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose();
      }
    },
    [handleModalClose]
  );

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleModalClose();
      }
    },
    [handleModalClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--dw-z-modal-backdrop)] flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-selector-title"
      data-testid="service-selector-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-000/70"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={clsx(
          'relative w-full max-w-2xl max-h-[90vh]',
          'bg-charcoal rounded-xl shadow-2xl',
          'border border-line',
          'flex flex-col overflow-hidden',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div className="flex items-center gap-3">
            {showPricingForm && (
              <button
                type="button"
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
                aria-label="Back to service selection"
              >
                <svg className="w-5 h-5 text-steel" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2
              id="service-selector-title"
              className="text-xl font-bold text-bone"
            >
              {showPricingForm ? 'Set Your Pricing' : 'Add Service from WORD BANK'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-steel" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!showPricingForm ? (
            <div data-testid="service-discovery-view">
              <p className="text-steel text-sm mb-4">
                Select a service from our WORD BANK. Customers will find you when they search for these services.
              </p>
              <ServiceDiscovery
                onServiceSelect={handleServiceSelect}
                showCustomServiceOption={false}
                className="mt-4"
              />
              {excludeServiceIds.length > 0 && (
                <p className="text-xs text-steel mt-4 text-center">
                  {excludeServiceIds.length} service{excludeServiceIds.length !== 1 ? 's' : ''} already added
                </p>
              )}
            </div>
          ) : selectedService ? (
            <div data-testid="service-pricing-view">
              <ServicePricingForm
                service={selectedService}
                onSubmit={handlePricingSubmit}
                onCancel={handlePricingCancel}
                isEditing={false}
              />
            </div>
          ) : null}
        </div>

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-surface-000/50 flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="animate-spin h-8 w-8 text-lumen-ink"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-bone font-medium">Adding service...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceSelectorModal;
