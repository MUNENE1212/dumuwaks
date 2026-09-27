import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createBooking, CreateBookingData } from '@/store/slices/bookingSlice';
import { acceptMatch, AcceptMatchParams } from '@/store/slices/matchingSlice';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Calendar, FileText, DollarSign, ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRating } from '@/utils/rating';
import BookingFeePaymentModal from '@/components/bookings/BookingFeePaymentModal';
import PriceEstimate from '@/components/bookings/PriceEstimate';
import ServiceTypeSelector from '@/components/bookings/ServiceTypeSelector';
import LocationInput, { LocationData } from '@/components/booking/LocationInput';
import StickyButton from '@/components/booking/StickyButton';
import { getPriceEstimate, calculatePrice, PricingBreakdown } from '@/services/pricing.service';
import { clsx } from 'clsx';

/**
 * DEPRECATION NOTICE
 *
 * This component is DEPRECATED and will be removed in a future version.
 *
 * Please use CreateBookingFlow (/booking-flow) instead, which provides:
 * - 5-step wizard with better UX
 * - WORD BANK integration
 * - Payment plans support
 * - Matching flow integration
 * - Real-time price estimation
 *
 * This file is kept for backward compatibility only.
 * All new features should be implemented in CreateBookingFlow.tsx
 */

// Log deprecation warning in development
if (import.meta.env.DEV) {
  console.warn(
    '[DEPRECATED] CreateBooking.tsx is deprecated. Use CreateBookingFlow (/booking-flow) instead.'
  );
}

const SERVICE_CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'painting', label: 'Painting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'welding', label: 'Welding' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'general_handyman', label: 'General Handyman' },
  { value: 'other', label: 'Other' },
];

interface LocationState {
  matchId?: string;
  technician?: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    rating?: number;
    hourlyRate?: number;
    location?: { coordinates: [number, number] };
  };
  serviceCategory?: string;
  location?: { coordinates: [number, number]; address: string };
}

/**
 * CreateBooking Page
 *
 * Enhanced booking creation page with:
 * - "Use My Location" button for automatic location detection
 * - Pre-fill address from user profile
 * - Sticky continue button on mobile
 * - Improved address form UX with Kenya-specific counties
 */
const CreateBooking: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { isCreating } = useAppSelector((state) => state.bookings);
  const { user } = useAppSelector((state) => state.auth);

  const locationState = location.state as LocationState | null;

  // Initialize location data with profile data or state data
  const getInitialLocationData = useCallback((): LocationData => {
    // Priority: URL state > User profile > Empty
    if (locationState?.location) {
      return {
        address: locationState.location.address || '',
        city: '',
        county: '',
        landmarks: '',
        accessInstructions: '',
        coordinates: locationState.location.coordinates,
      };
    }

    if (user?.location) {
      return {
        address: user.location.address || '',
        city: user.location.city || '',
        county: user.location.county || '',
        landmarks: '',
        accessInstructions: '',
        coordinates: user.location.coordinates || [0, 0],
      };
    }

    return {
      address: '',
      city: '',
      county: '',
      landmarks: '',
      accessInstructions: '',
      coordinates: [0, 0],
    };
  }, [locationState, user]);

  const [formData, setFormData] = useState<CreateBookingData>({
    serviceType: '',
    serviceCategory: locationState?.serviceCategory || '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    estimatedDuration: 120, // Default 2 hours in minutes
    serviceLocation: {
      coordinates: getInitialLocationData().coordinates,
      address: getInitialLocationData().address,
      landmarks: getInitialLocationData().landmarks,
      accessInstructions: getInitialLocationData().accessInstructions,
    },
    technician: locationState?.technician?._id || '',
    urgency: 'medium',
    images: [],
    quantity: 1, // Default quantity for per-unit services
  });

  const [locationData, setLocationData] = useState<LocationData>(getInitialLocationData());
  const [useSavedAddress, setUseSavedAddress] = useState(!!user?.location?.address && !locationState?.location);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdBooking, setCreatedBooking] = useState<{
    _id: string;
    bookingFee?: { amount: number };
    pricing?: { currency: string };
    details?: { bookingFee?: { amount: number } };
  } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState<PricingBreakdown | null>(null);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);

  // Check if user has a saved address in profile
  const hasSavedAddress = useMemo(() => {
    return !!(user?.location?.address);
  }, [user?.location?.address]);

  // Set minimum date to today on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (!formData.scheduledDate) {
      setFormData((prev) => ({ ...prev, scheduledDate: today }));
    }
  }, []);

  // Sync locationData with formData.serviceLocation
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      serviceLocation: {
        coordinates: locationData.coordinates,
        address: locationData.address,
        landmarks: locationData.landmarks,
        accessInstructions: locationData.accessInstructions,
      },
    }));
  }, [locationData]);

  // Handle "Use Saved Address" toggle
  const handleUseSavedAddressToggle = useCallback(() => {
    if (!useSavedAddress && user?.location) {
      // Enable saved address - populate from profile
      const savedLocation: LocationData = {
        address: user.location.address || '',
        city: user.location.city || '',
        county: user.location.county || '',
        landmarks: '',
        accessInstructions: '',
        coordinates: user.location.coordinates || [0, 0],
      };
      setLocationData(savedLocation);
    }
    setUseSavedAddress(!useSavedAddress);
  }, [useSavedAddress, user?.location]);

  // Fetch price estimate when relevant fields change
  useEffect(() => {
    const fetchEstimate = async () => {
      // Only require service category and type for estimate
      if (formData.serviceCategory && formData.serviceType) {
        setIsLoadingEstimate(true);
        try {
          // Use default coordinates if not provided (Nairobi center)
          const coordinates =
            formData.serviceLocation.coordinates[0] !== 0
              ? formData.serviceLocation.coordinates
              : [-1.2921, 36.8219]; // Nairobi default

          const scheduledDateTime = formData.scheduledDate
            ? `${formData.scheduledDate}T${formData.scheduledTime || '09:00'}`
            : undefined;

          // If technician is selected (from matching), use calculatePrice for accurate estimate with distance
          if (locationState?.technician?._id) {
            const response = await calculatePrice({
              serviceCategory: formData.serviceCategory,
              serviceType: formData.serviceType,
              urgency: formData.urgency,
              serviceLocation: {
                type: 'Point',
                coordinates: coordinates as [number, number],
              },
              technicianLocation: locationState.technician.location,
              technicianId: locationState.technician._id,
              scheduledDateTime: scheduledDateTime,
              quantity: formData.quantity || 1,
            });

            if (response.success && response.pricing) {
              setPriceEstimate(response.pricing);
            }
          } else {
            // No technician selected yet, use general estimate
            const response = await getPriceEstimate({
              serviceCategory: formData.serviceCategory,
              serviceType: formData.serviceType,
              urgency: formData.urgency as 'low' | 'medium' | 'high' | 'emergency',
              serviceLocation: {
                type: 'Point',
                coordinates: coordinates as [number, number],
              },
              scheduledDateTime: scheduledDateTime,
              quantity: formData.quantity || 1,
            });

            if (response.success) {
              setPriceEstimate(response.estimate);
            }
          }
        } catch (error) {
          console.error('Failed to fetch price estimate:', error);
          toast.error('Unable to calculate price estimate. Please try again.');
        } finally {
          setIsLoadingEstimate(false);
        }
      } else {
        // Clear estimate if required fields are missing
        setPriceEstimate(null);
      }
    };

    // Debounce the API call - increased to 800ms to reduce API spam
    const timer = setTimeout(() => {
      fetchEstimate();
    }, 800);

    return () => clearTimeout(timer);
  }, [
    formData.serviceCategory,
    formData.serviceType,
    formData.urgency,
    formData.serviceLocation.coordinates,
    formData.scheduledDate,
    formData.scheduledTime,
    formData.quantity,
    locationState?.technician, // Re-calculate when technician changes
  ]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.serviceType.trim()) {
      newErrors.serviceType = 'Service type is required';
    }
    if (!formData.serviceCategory) {
      newErrors.serviceCategory = 'Service category is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required';
    }
    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Scheduled time is required';
    }
    if (!formData.serviceLocation.address.trim()) {
      newErrors.address = 'Service address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if form is valid for sticky button
  const isFormValid = useMemo(() => {
    return (
      formData.serviceType.trim() !== '' &&
      formData.serviceCategory !== '' &&
      formData.description.trim() !== '' &&
      formData.scheduledDate !== '' &&
      formData.scheduledTime !== '' &&
      formData.serviceLocation.address.trim() !== ''
    );
  }, [
    formData.serviceType,
    formData.serviceCategory,
    formData.description,
    formData.scheduledDate,
    formData.scheduledTime,
    formData.serviceLocation.address,
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('serviceLocation.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        serviceLocation: {
          ...prev.serviceLocation,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, description: value }));
    if (errors.description) {
      setErrors((prev) => ({ ...prev, description: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (locationState?.matchId) {
        // If coming from matching, accept the match and create booking
        const acceptParams: AcceptMatchParams = {
          matchId: locationState.matchId,
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime!,
          description: formData.description,
          estimatedDuration: formData.estimatedDuration,
          serviceType: formData.serviceType,
          quantity: formData.quantity || 1,
        };

        const result = await dispatch(acceptMatch(acceptParams)).unwrap();
        const booking = result.data.booking;

        // Show payment modal instead of navigating
        setCreatedBooking(booking);
        setShowPaymentModal(true);
        toast.success('Booking created! Please complete payment to proceed.');
      } else {
        // Direct booking creation
        const result = await dispatch(createBooking(formData)).unwrap();
        const booking = result.booking;

        // Show payment modal instead of navigating
        setCreatedBooking(booking);
        setShowPaymentModal(true);
        toast.success('Booking created! Please complete payment to proceed.');
      }
    } catch (error: unknown) {
      console.error('Failed to create booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create booking';
      toast.error(errorMessage);
    }
  };

  const handlePaymentSuccess = (_transactionId: string) => {
    toast.success('Payment successful! Your booking is now being matched with technicians.');
    setShowPaymentModal(false);
    if (createdBooking) {
      navigate(`/bookings/${createdBooking._id}`);
    }
  };

  const handlePaymentClose = () => {
    // Don't allow closing without payment
    const confirmClose = window.confirm(
      'Payment is required to proceed with booking. Close without paying? Your booking will remain pending.'
    );
    if (confirmClose && createdBooking) {
      setShowPaymentModal(false);
      navigate(`/bookings/${createdBooking._id}`);
    }
  };

  // Character count for description
  const descriptionLength = formData.description.length;
  const maxDescriptionLength = 1000;

  return (
    <div className="mx-auto max-w-4xl pb-24 md:pb-0">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center text-steel hover:text-bone transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-bone md:text-3xl">
          {locationState?.matchId ? 'Complete Your Booking' : 'Create New Booking'}
        </h1>
        <p className="mt-2 text-steel">
          {locationState?.matchId
            ? `Booking with ${locationState.technician?.firstName} ${locationState.technician?.lastName}`
            : 'Fill in the details for your service request'}
        </p>
      </div>

      {/* Technician Info (if from matching) */}
      {locationState?.technician && (
        <div className="mb-6 rounded-lg border border-lumen/30 bg-lumen/10 p-4">
          <div className="flex items-center space-x-4">
            {locationState.technician.profilePicture ? (
              <img
                src={locationState.technician.profilePicture}
                alt={locationState.technician.firstName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lumen/30 text-2xl font-bold text-lumen-ink">
                {locationState.technician.firstName[0]}
                {locationState.technician.lastName[0]}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-bone">
                {locationState.technician.firstName} {locationState.technician.lastName}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-steel">
                <span className="flex items-center">
                  ⭐ {formatRating(locationState.technician.rating)}
                </span>
                {locationState.technician.hourlyRate && (
                  <span className="flex items-center">
                    <DollarSign className="mr-1 h-4 w-4" />
                    KES {locationState.technician.hourlyRate}/hour
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Details */}
        <div className="rounded-lg border border-steel/30 bg-charcoal p-6 shadow-glass">
          <h2 className="mb-4 flex items-center text-lg font-semibold text-bone">
            <FileText className="mr-2 h-5 w-5 text-lumen-ink" />
            Service Details
          </h2>

          <div className="space-y-4">
            <Select
              label="Service Category"
              name="serviceCategory"
              value={formData.serviceCategory}
              onChange={handleChange}
              disabled={!!locationState?.serviceCategory}
              error={errors.serviceCategory}
              required
            >
              <option value="">Select a category</option>
              {SERVICE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>

            {/* Service Type Selector with validation */}
            {formData.serviceCategory && (
              <ServiceTypeSelector
                serviceCategory={formData.serviceCategory}
                value={formData.serviceType}
                onChange={(selectedType) => {
                  setFormData((prev) => ({ ...prev, serviceType: selectedType }));
                  // Clear error when service type is selected
                  if (errors.serviceType) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.serviceType;
                      return newErrors;
                    });
                  }
                }}
              />
            )}

            {/* Show error if category not selected */}
            {!formData.serviceCategory && (
              <div className="rounded-lg border border-lumen/30 bg-lumen/10 p-4">
                <p className="text-sm text-lumen-ink">
                  Please select a service category first to see available service types.
                </p>
              </div>
            )}

            {/* Description with character count */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-bone">
                Description <span className="text-error">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleDescriptionChange}
                rows={4}
                placeholder="Describe the issue or service needed in detail..."
                disabled={isCreating}
                maxLength={maxDescriptionLength}
                className={clsx(
                  'flex w-full rounded-md border bg-charcoal px-3 py-2.5 text-sm text-bone',
                  'placeholder:text-steel/60 focus:outline-none focus:ring-2 focus:ring-lumen focus:border-transparent',
                  'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
                  errors.description ? 'border-error' : 'border-steel/40'
                )}
              />
              <div className="flex items-center justify-between">
                {errors.description && (
                  <p className="text-sm text-error">{errors.description}</p>
                )}
                <p className={clsx(
                  'text-xs ml-auto',
                  descriptionLength >= maxDescriptionLength ? 'text-warning' : 'text-steel'
                )}>
                  {descriptionLength}/{maxDescriptionLength}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-bone mb-1">
                Quantity / Units
              </label>
              <Input
                type="number"
                name="quantity"
                value={formData.quantity || 1}
                onChange={handleChange}
                min={1}
                max={100}
                placeholder="Enter number of units"
                disabled={isCreating}
              />
              <p className="mt-1 text-xs text-steel">
                For per-unit services (e.g., number of sockets, fans, fixtures to install)
              </p>
            </div>

            <div className="bg-lumen/10 rounded-lg p-4 border border-lumen/30">
              <p className="text-sm text-bone">
                <span className="font-semibold text-lumen-ink">Pricing Tip:</span> Urgency level is automatically calculated based on your scheduled date and time:
              </p>
              <ul className="mt-2 text-xs text-steel space-y-1 ml-4">
                <li>• Within 4 hours = Emergency (2.0× base price)</li>
                <li>• Within 24 hours = High urgency (1.5× base price)</li>
                <li>• Within 3 days = Medium urgency (1.2× base price)</li>
                <li>• 3+ days ahead = Low urgency (standard price)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Scheduling */}
        <div className="rounded-lg border border-steel/30 bg-charcoal p-6 shadow-glass">
          <h2 className="mb-4 flex items-center text-lg font-semibold text-bone">
            <Calendar className="mr-2 h-5 w-5 text-lumen-ink" />
            Scheduling
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-bone">
                Date <span className="text-error">*</span>
              </label>
              <Input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                error={errors.scheduledDate}
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bone">
                Time <span className="text-error">*</span>
              </label>
              <Input
                type="time"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                error={errors.scheduledTime}
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bone">
                Estimated Duration (hours)
              </label>
              <Input
                type="number"
                name="estimatedDuration"
                value={formData.estimatedDuration ? (formData.estimatedDuration / 60).toString() : ''}
                onChange={(e) => {
                  const hours = parseFloat(e.target.value) || 0;
                  const minutes = Math.round(hours * 60);
                  setFormData(prev => ({ ...prev, estimatedDuration: minutes }));
                }}
                min="0.5"
                step="0.5"
                placeholder="e.g., 2 for 2 hours"
                disabled={isCreating}
              />
              <p className="mt-1 text-xs text-steel">
                Default: 2 hours
              </p>
            </div>
          </div>
        </div>

        {/* Location - Enhanced with LocationInput */}
        <div className="rounded-lg border border-steel/30 bg-charcoal p-6 shadow-glass">
          {/* Use Saved Address Option */}
          {hasSavedAddress && (
            <div className="mb-4 flex items-center">
              <button
                type="button"
                onClick={handleUseSavedAddressToggle}
                disabled={isCreating}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
                  'text-sm font-medium',
                  useSavedAddress
                    ? 'bg-lumen/20 border-lumen text-lumen-ink'
                    : 'bg-transparent border-steel/40 text-steel hover:border-lumen hover:text-lumen-ink',
                  isCreating && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                  useSavedAddress
                    ? 'bg-lumen border-lumen'
                    : 'border-steel/60 bg-transparent'
                )}>
                  {useSavedAddress && <Check className="w-3 h-3 text-ink" />}
                </div>
                <span>Use my saved address</span>
              </button>
              {useSavedAddress && (
                <span className="ml-2 text-xs text-steel">
                  ({user?.location?.address})
                </span>
              )}
            </div>
          )}

          <LocationInput
            value={locationData}
            onChange={setLocationData}
            errors={{
              address: errors.address,
              city: errors.city,
              county: errors.county,
            }}
            disabled={isCreating || useSavedAddress}
          />
        </div>

        {/* Price Estimate */}
        {priceEstimate && (
          <PriceEstimate pricing={priceEstimate} isEstimate={true} className="mt-6" />
        )}

        {!priceEstimate && !isLoadingEstimate && formData.serviceCategory && formData.serviceType && (
          <div className="mt-6 rounded-lg border border-warning/30 bg-warning/10 p-4">
            <p className="text-sm text-warning">
              No price estimate available. Please check your service selection.
            </p>
          </div>
        )}

        {isLoadingEstimate && (
          <div className="mt-6 rounded-lg border border-steel/30 bg-charcoal p-6 shadow-glass">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumen"></div>
              <span className="ml-3 text-steel">Calculating price estimate...</span>
            </div>
          </div>
        )}

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center justify-between space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isCreating}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isCreating}
            className="min-w-[200px]"
          >
            {isCreating ? 'Creating...' : locationState?.matchId ? 'Confirm Booking' : 'Create Booking'}
          </Button>
        </div>
      </form>

      {/* Mobile Sticky Button */}
      <StickyButton
        type="submit"
        variant="primary"
        isValid={isFormValid}
        disabled={isCreating}
        onClick={handleSubmit}
        className="md:hidden"
      >
        {isCreating ? 'Creating...' : locationState?.matchId ? 'Confirm Booking' : 'Create Booking'}
      </StickyButton>

      {/* Payment Modal */}
      {createdBooking && (() => {
        // Calculate amount with all fallbacks
        const amount = createdBooking.bookingFee?.amount ||
                       priceEstimate?.bookingFee ||
                       priceEstimate?.details?.bookingFee?.amount ||
                       0;

        return (
          <BookingFeePaymentModal
            isOpen={showPaymentModal}
            onClose={handlePaymentClose}
            amount={amount}
            currency={createdBooking.pricing?.currency || priceEstimate?.currency || 'KES'}
            bookingId={createdBooking._id}
            onPaymentSuccess={handlePaymentSuccess}
          />
        );
      })()}
    </div>
  );
};

export default CreateBooking;
