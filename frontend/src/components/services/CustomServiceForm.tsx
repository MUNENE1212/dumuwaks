import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ServiceCategory, CustomServiceFormData } from '@/types/service';
import { DURATION_OPTIONS, SERVICE_CONSTRAINTS } from '@/types/service';
import { validateCustomService, formatPrice } from '@/services/service.service';
import { submitCustomServiceAction } from '@/store/slices/serviceSlice';
import type { AppDispatch } from '@/store/index';
import toast from 'react-hot-toast';

/**
 * Props for CustomServiceForm component
 */
interface CustomServiceFormProps {
  categories: ServiceCategory[];
  selectedCategoryId?: string;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * CustomServiceForm Component
 * Form for technicians to add custom services
 * - Fields: name, category, description, base price, icon upload
 * - Submit to admin approval queue
 * - Success/error feedback
 */
const CustomServiceForm: React.FC<CustomServiceFormProps> = ({
  categories,
  selectedCategoryId,
  onSubmitSuccess,
  onCancel,
  className,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<CustomServiceFormData>({
    name: '',
    categoryId: selectedCategoryId || '',
    description: '',
    basePriceMin: 0,
    basePriceMax: 0,
    estimatedDuration: '',
    icon: null,
  });

  // Validation state
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Icon preview
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'basePriceMin' || name === 'basePriceMax'
          ? parseFloat(value) || 0
          : value,
    }));

    // Mark as touched
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  // Handle icon file selection
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      // Validate file
      const allowedFormats = SERVICE_CONSTRAINTS.ALLOWED_ICON_FORMATS as readonly string[];
      if (!allowedFormats.includes(file.type)) {
        setErrors(['Icon must be JPG, PNG, WebP, or SVG format']);
        return;
      }

      if (file.size > SERVICE_CONSTRAINTS.MAX_ICON_SIZE) {
        setErrors(['Icon size must be less than 500KB']);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setIconPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      setFormData((prev) => ({ ...prev, icon: file }));
      setErrors([]);
    }
  };

  // Handle icon remove
  const handleIconRemove = () => {
    setFormData((prev) => ({ ...prev, icon: null }));
    setIconPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validation = validateCustomService(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);

    try {
      await dispatch(submitCustomServiceAction(formData)).unwrap();
      toast.success('Service submitted for approval!');

      // Reset form
      setFormData({
        name: '',
        categoryId: selectedCategoryId || '',
        description: '',
        basePriceMin: 0,
        basePriceMax: 0,
        estimatedDuration: '',
        icon: null,
      });
      setIconPreview(null);
      setTouched({});

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to submit service';
      setErrors([errorMessage]);
      toast.error(errorMessage);
    }
  };

  return (
    <Card variant="default" className={clsx('p-6', className)}>
      <form onSubmit={handleSubmit} noValidate>
        {/* Error Summary */}
        {errors.length > 0 && (
          <div
            className="mb-6 p-4 rounded-lg bg-error/10 border border-error"
            role="alert"
            data-testid="form-errors"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-bone font-medium">Please fix the following errors:</p>
                <ul className="mt-1 text-sm text-steel list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Service Name */}
        <div className="mb-4">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-bone mb-2"
          >
            Service Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., TAP REPAIR"
            maxLength={SERVICE_CONSTRAINTS.MAX_NAME_LENGTH}
            className={clsx(
              'w-full h-12 px-4',
              'bg-charcoal border rounded-lg',
              'text-bone placeholder:text-steel',
              'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
              'transition-colors duration-200',
              touched.name && errors.some((e) => e.includes('name'))
                ? 'border-error'
                : 'border-line'
            )}
            aria-required="true"
          />
          <p className="mt-1 text-xs text-steel">
            {formData.name.length}/{SERVICE_CONSTRAINTS.MAX_NAME_LENGTH} characters
            (will be converted to UPPERCASE)
          </p>
        </div>

        {/* Category */}
        <div className="mb-4">
          <label
            htmlFor="categoryId"
            className="block text-sm font-medium text-bone mb-2"
          >
            Category <span className="text-error">*</span>
          </label>
          <select
            id="categoryId"
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className={clsx(
              'w-full h-12 px-4',
              'bg-charcoal border rounded-lg',
              'text-bone',
              'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
              'transition-colors duration-200',
              touched.categoryId && errors.some((e) => e.includes('category'))
                ? 'border-error'
                : 'border-line'
            )}
            aria-required="true"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-bone mb-2"
          >
            Description <span className="text-error">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the service in detail..."
            rows={3}
            maxLength={SERVICE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
            className={clsx(
              'w-full px-4 py-3',
              'bg-charcoal border rounded-lg',
              'text-bone placeholder:text-steel',
              'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
              'transition-colors duration-200 resize-none',
              touched.description && errors.some((e) => e.includes('Description'))
                ? 'border-error'
                : 'border-line'
            )}
            aria-required="true"
          />
          <p className="mt-1 text-xs text-steel">
            {formData.description.length}/{SERVICE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters
          </p>
        </div>

        {/* Price Range */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-bone mb-2">
            Price Range (KES) <span className="text-error">*</span>
          </label>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="basePriceMin" className="sr-only">
                Minimum Price
              </label>
              <input
                type="number"
                id="basePriceMin"
                name="basePriceMin"
                value={formData.basePriceMin || ''}
                onChange={handleChange}
                placeholder="Min"
                min={SERVICE_CONSTRAINTS.MIN_PRICE}
                max={SERVICE_CONSTRAINTS.MAX_PRICE}
                step={100}
                className={clsx(
                  'w-full h-12 px-4',
                  'bg-charcoal border rounded-lg',
                  'text-bone placeholder:text-steel',
                  'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
                  'transition-colors duration-200',
                  touched.basePriceMin && errors.some((e) => e.includes('price'))
                    ? 'border-error'
                    : 'border-line'
                )}
                aria-label="Minimum price in KES"
              />
              <p className="mt-1 text-xs text-steel">Min: KES 100</p>
            </div>
            <div className="flex-1">
              <label htmlFor="basePriceMax" className="sr-only">
                Maximum Price
              </label>
              <input
                type="number"
                id="basePriceMax"
                name="basePriceMax"
                value={formData.basePriceMax || ''}
                onChange={handleChange}
                placeholder="Max"
                min={SERVICE_CONSTRAINTS.MIN_PRICE}
                max={SERVICE_CONSTRAINTS.MAX_PRICE}
                step={100}
                className={clsx(
                  'w-full h-12 px-4',
                  'bg-charcoal border rounded-lg',
                  'text-bone placeholder:text-steel',
                  'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
                  'transition-colors duration-200',
                  touched.basePriceMax && errors.some((e) => e.includes('price'))
                    ? 'border-error'
                    : 'border-line'
                )}
                aria-label="Maximum price in KES"
              />
              <p className="mt-1 text-xs text-steel">Max: KES 1,000,000</p>
            </div>
          </div>
          {formData.basePriceMin > 0 && formData.basePriceMax > 0 && (
            <p className="mt-2 text-sm text-lumen-ink">
              Price range: {formatPrice(formData.basePriceMin)} - {formatPrice(formData.basePriceMax)}
            </p>
          )}
        </div>

        {/* Estimated Duration */}
        <div className="mb-4">
          <label
            htmlFor="estimatedDuration"
            className="block text-sm font-medium text-bone mb-2"
          >
            Estimated Duration <span className="text-error">*</span>
          </label>
          <select
            id="estimatedDuration"
            name="estimatedDuration"
            value={formData.estimatedDuration}
            onChange={handleChange}
            className={clsx(
              'w-full h-12 px-4',
              'bg-charcoal border rounded-lg',
              'text-bone',
              'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
              'transition-colors duration-200',
              touched.estimatedDuration && errors.some((e) => e.includes('duration'))
                ? 'border-error'
                : 'border-line'
            )}
            aria-required="true"
          >
            <option value="">Select duration</option>
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Icon Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-bone mb-2">
            Service Icon (Optional)
          </label>
          <div className="flex items-start gap-4">
            {/* Icon Preview */}
            {iconPreview ? (
              <div className="relative">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-charcoal border border-line">
                  <img
                    src={iconPreview}
                    alt="Service icon preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleIconRemove}
                  className={clsx(
                    'absolute -top-2 -right-2',
                    'w-6 h-6 rounded-full',
                    'bg-error text-ink',
                    'flex items-center justify-center',
                    'hover:bg-error-600 transition-colors'
                  )}
                  aria-label="Remove icon"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  'w-16 h-16 rounded-lg',
                  'bg-charcoal border-2 border-dashed border-line',
                  'flex items-center justify-center',
                  'hover:border-steel transition-colors',
                  'text-steel hover:text-bone'
                )}
                aria-label="Upload service icon"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                id="icon"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                onChange={handleIconChange}
                className="hidden"
                aria-label="Upload icon file"
              />
              <p className="text-xs text-steel">
                JPG, PNG, WebP, or SVG. Max 500KB.
              </p>
              <p className="text-xs text-steel mt-1">
                Square format recommended (64x64px or larger)
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary">
            Submit for Approval
          </Button>
        </div>

        {/* Help Text */}
        <p className="mt-4 text-xs text-steel text-center">
          Your custom service will be reviewed by an admin before it becomes available.
          This usually takes 1-2 business days.
        </p>
      </form>
    </Card>
  );
};

export default CustomServiceForm;
