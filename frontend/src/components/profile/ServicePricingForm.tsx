import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import type { Service } from '@/types/service';
import type { PricingData, PricingType } from '@/types/technicianService';
import {
  ESTIMATED_DURATION_OPTIONS,
  PRICING_TYPE_LABELS,
  PRICING_TYPE_DESCRIPTIONS,
  TECHNICIAN_SERVICE_CONSTRAINTS,
} from '@/types/technicianService';
import { formatPrice, validatePricingData } from '@/services/technicianService.service';
import Button from '@/components/ui/Button';

/**
 * Props for ServicePricingForm component
 */
interface ServicePricingFormProps {
  service: Service;
  onSubmit: (pricing: PricingData) => void;
  onCancel: () => void;
  initialValues?: Partial<PricingData>;
  isEditing?: boolean;
}

/**
 * ServicePricingForm Component
 * Form for technicians to set pricing for a service from the WORD BANK
 * Supports hourly, fixed, and negotiable pricing types
 */
const ServicePricingForm: React.FC<ServicePricingFormProps> = ({
  service,
  onSubmit,
  onCancel,
  initialValues,
  isEditing = false,
}) => {
  const [pricingType, setPricingType] = useState<PricingType>(
    initialValues?.pricingType || 'fixed'
  );
  const [hourlyRate, setHourlyRate] = useState<string>(
    initialValues?.hourlyRate?.toString() || ''
  );
  const [fixedPrice, setFixedPrice] = useState<string>(
    initialValues?.fixedPrice?.toString() || ''
  );
  const [minPrice, setMinPrice] = useState<string>(
    initialValues?.minPrice?.toString() || ''
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    initialValues?.maxPrice?.toString() || ''
  );
  const [estimatedDuration, setEstimatedDuration] = useState<string>(
    initialValues?.estimatedDuration || ''
  );
  const [description, setDescription] = useState<string>(
    initialValues?.description || ''
  );
  const [callOutFee, setCallOutFee] = useState<string>(
    initialValues?.callOutFee?.toString() || ''
  );
  const [negotiable, setNegotiable] = useState<boolean>(
    initialValues?.negotiable ?? true
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear errors when form changes
  useEffect(() => {
    if (errors.length > 0) {
      setErrors([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingType, hourlyRate, fixedPrice, minPrice, maxPrice, estimatedDuration]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    const pricingData: PricingData = {
      pricingType,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      fixedPrice: fixedPrice ? parseFloat(fixedPrice) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      estimatedDuration,
      description: description.trim() || undefined,
      callOutFee: callOutFee ? parseFloat(callOutFee) : undefined,
      negotiable,
    };

    // Validate pricing data
    const validation = validatePricingData(pricingData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    onSubmit(pricingData);
    setIsSubmitting(false);
  };

  // Handle number input change
  const handleNumberChange = (
    value: string,
    setter: (value: string) => void
  ) => {
    // Allow empty string or valid numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  return (
    <div className="w-full" data-testid="service-pricing-form">
      {/* Service Info Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-bone uppercase">
          {service.name}
        </h3>
        <p className="text-sm text-steel mt-1">{service.description}</p>
        {service.basePriceMin && service.basePriceMax && (
          <p className="text-sm text-lumen-ink mt-2">
            Suggested: {formatPrice(service.basePriceMin)} - {formatPrice(service.basePriceMax)}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Display Errors */}
        {errors.length > 0 && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/30">
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-error flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pricing Type Selection */}
        <div>
          <label className="block text-sm font-medium text-bone mb-2">
            Pricing Type <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(PRICING_TYPE_LABELS) as PricingType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPricingType(type)}
                className={clsx(
                  'p-4 rounded-lg border text-left transition-all duration-200',
                  pricingType === type
                    ? 'border-lumen bg-lumen/10 text-bone'
                    : 'border-line bg-charcoal text-steel hover:border-steel'
                )}
                data-testid={`pricing-type-${type}`}
              >
                <div className="font-medium">{PRICING_TYPE_LABELS[type]}</div>
                <div className="text-xs mt-1 opacity-75">
                  {PRICING_TYPE_DESCRIPTIONS[type]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Hourly Rate Input */}
        {pricingType === 'hourly' && (
          <div>
            <label htmlFor="hourlyRate" className="block text-sm font-medium text-bone mb-2">
              Hourly Rate (KES) <span className="text-error">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-steel">KES</span>
              <input
                type="text"
                id="hourlyRate"
                value={hourlyRate}
                onChange={(e) => handleNumberChange(e.target.value, setHourlyRate)}
                placeholder="e.g., 1500"
                className={clsx(
                  'w-full h-12 pl-14 pr-4',
                  'bg-charcoal border border-line rounded-lg',
                  'text-bone placeholder:text-steel',
                  'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
                  'transition-colors duration-200'
                )}
                data-testid="hourly-rate-input"
              />
            </div>
            <p className="mt-1 text-xs text-steel">
              Your rate per hour for this service
            </p>
          </div>
        )}

        {/* Fixed Price Input */}
        {pricingType === 'fixed' && (
          <div>
            <label htmlFor="fixedPrice" className="block text-sm font-medium text-bone mb-2">
              Fixed Price (KES) <span className="text-error">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-steel">KES</span>
              <input
                type="text"
                id="fixedPrice"
                value={fixedPrice}
                onChange={(e) => handleNumberChange(e.target.value, setFixedPrice)}
                placeholder="e.g., 5000"
                className={clsx(
                  'w-full h-12 pl-14 pr-4',
                  'bg-charcoal border border-line rounded-lg',
                  'text-bone placeholder:text-steel',
                  'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
                  'transition-colors duration-200'
                )}
                data-testid="fixed-price-input"
              />
            </div>
            <p className="mt-1 text-xs text-steel">
              Standard price for this service
            </p>
          </div>
        )}

        {/* Negotiable Price Range */}
        {pricingType === 'negotiable' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="minPrice" className="block text-sm font-medium text-bone mb-2">
                  Minimum Price (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-steel">KES</span>
                  <input
                    type="text"
                    id="minPrice"
                    value={minPrice}
                    onChange={(e) => handleNumberChange(e.target.value, setMinPrice)}
                    placeholder="e.g., 2000"
                    className={clsx(
                      'w-full h-12 pl-14 pr-4',
                      'bg-charcoal border border-line rounded-lg',
                      'text-bone placeholder:text-steel',
                      'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
                      'transition-colors duration-200'
                    )}
                    data-testid="min-price-input"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="maxPrice" className="block text-sm font-medium text-bone mb-2">
                  Maximum Price (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-steel">KES</span>
                  <input
                    type="text"
                    id="maxPrice"
                    value={maxPrice}
                    onChange={(e) => handleNumberChange(e.target.value, setMaxPrice)}
                    placeholder="e.g., 10000"
                    className={clsx(
                      'w-full h-12 pl-14 pr-4',
                      'bg-charcoal border border-line rounded-lg',
                      'text-bone placeholder:text-steel',
                      'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
                      'transition-colors duration-200'
                    )}
                    data-testid="max-price-input"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-steel">
              Set a price range or leave blank to negotiate each job individually
            </p>
          </div>
        )}

        {/* Estimated Duration */}
        <div>
          <label htmlFor="estimatedDuration" className="block text-sm font-medium text-bone mb-2">
            Estimated Duration <span className="text-error">*</span>
          </label>
          <select
            id="estimatedDuration"
            value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(e.target.value)}
            className={clsx(
              'w-full h-12 px-4',
              'bg-charcoal border border-line rounded-lg',
              'text-bone',
              'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
              'transition-colors duration-200'
            )}
            data-testid="estimated-duration-select"
          >
            <option value="">Select duration...</option>
            {ESTIMATED_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Call-out Fee */}
        <div>
          <label htmlFor="callOutFee" className="block text-sm font-medium text-bone mb-2">
            Call-out Fee (KES) <span className="text-steel text-xs font-normal">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-steel">KES</span>
            <input
              type="text"
              id="callOutFee"
              value={callOutFee}
              onChange={(e) => handleNumberChange(e.target.value, setCallOutFee)}
              placeholder="e.g., 500"
              className={clsx(
                'w-full h-12 pl-14 pr-4',
                'bg-charcoal border border-line rounded-lg',
                'text-bone placeholder:text-steel',
                'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
                'transition-colors duration-200'
              )}
              data-testid="call-out-fee-input"
            />
          </div>
          <p className="mt-1 text-xs text-steel">
            Fee charged for traveling to the customer's location
          </p>
        </div>

        {/* Price Negotiable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-bone">
              Allow Price Negotiation
            </label>
            <p className="text-xs text-steel">
              Let customers propose different prices
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNegotiable(!negotiable)}
            className={clsx(
              'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
              negotiable ? 'bg-lumen' : 'bg-charcoal border border-line'
            )}
            data-testid="negotiable-toggle"
          >
            <span
              className={clsx(
                'inline-block h-5 w-5 transform rounded-full bg-surface-200 shadow transition-transform',
                negotiable ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-bone mb-2">
            Service Description <span className="text-steel text-xs font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={TECHNICIAN_SERVICE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
            placeholder="Add any specific details about how you offer this service..."
            className={clsx(
              'w-full px-4 py-3',
              'bg-charcoal border border-line rounded-lg',
              'text-bone placeholder:text-steel',
              'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
              'transition-colors duration-200 resize-none'
            )}
            data-testid="description-input"
          />
          <p className="mt-1 text-xs text-steel text-right">
            {description.length}/{TECHNICIAN_SERVICE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            data-testid="submit-pricing-btn"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isEditing ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              isEditing ? 'Update Service' : 'Add Service'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ServicePricingForm;
