/**
 * LocationInput Component
 *
 * Enhanced location input with "Use My Location" functionality.
 * Uses browser Geolocation API and reverse geocoding to auto-fill address.
 *
 * Features:
 * - "Use My Location" button with loading state
 * - Reverse geocoding to get address from coordinates
 * - Graceful permission denied handling
 * - Fallback to manual entry
 * - Kenya-specific county dropdown
 * - Landmark field for easier navigation
 */

import React, { useState, useCallback } from 'react';
import { MapPin, Navigation, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { reverseGeocode, getCurrentLocation } from '@/services/geocoding.service';
import { clsx } from 'clsx';

// Kenya counties for dropdown
const KENYA_COUNTIES = [
  { value: '', label: 'Select County' },
  { value: 'Baringo', label: 'Baringo' },
  { value: 'Bomet', label: 'Bomet' },
  { value: 'Bungoma', label: 'Bungoma' },
  { value: 'Busia', label: 'Busia' },
  { value: 'Elgeyo-Marakwet', label: 'Elgeyo-Marakwet' },
  { value: 'Embu', label: 'Embu' },
  { value: 'Garissa', label: 'Garissa' },
  { value: 'Homa Bay', label: 'Homa Bay' },
  { value: 'Isiolo', label: 'Isiolo' },
  { value: 'Kajiado', label: 'Kajiado' },
  { value: 'Kakamega', label: 'Kakamega' },
  { value: 'Kericho', label: 'Kericho' },
  { value: 'Kiambu', label: 'Kiambu' },
  { value: 'Kilifi', label: 'Kilifi' },
  { value: 'Kirinyaga', label: 'Kirinyaga' },
  { value: 'Kisii', label: 'Kisii' },
  { value: 'Kisumu', label: 'Kisumu' },
  { value: 'Kitui', label: 'Kitui' },
  { value: 'Kwale', label: 'Kwale' },
  { value: 'Laikipia', label: 'Laikipia' },
  { value: 'Lamu', label: 'Lamu' },
  { value: 'Machakos', label: 'Machakos' },
  { value: 'Makueni', label: 'Makueni' },
  { value: 'Mandera', label: 'Mandera' },
  { value: 'Marsabit', label: 'Marsabit' },
  { value: 'Meru', label: 'Meru' },
  { value: 'Migori', label: 'Migori' },
  { value: 'Mombasa', label: 'Mombasa' },
  { value: 'Murang\'a', label: 'Murang\'a' },
  { value: 'Nairobi', label: 'Nairobi' },
  { value: 'Nakuru', label: 'Nakuru' },
  { value: 'Nandi', label: 'Nandi' },
  { value: 'Narok', label: 'Narok' },
  { value: 'Nyamira', label: 'Nyamira' },
  { value: 'Nyandarua', label: 'Nyandarua' },
  { value: 'Nyeri', label: 'Nyeri' },
  { value: 'Samburu', label: 'Samburu' },
  { value: 'Siaya', label: 'Siaya' },
  { value: 'Taita-Taveta', label: 'Taita-Taveta' },
  { value: 'Tana River', label: 'Tana River' },
  { value: 'Tharaka-Nithi', label: 'Tharaka-Nithi' },
  { value: 'Trans Nzoia', label: 'Trans Nzoia' },
  { value: 'Turkana', label: 'Turkana' },
  { value: 'Uasin Gishu', label: 'Uasin Gishu' },
  { value: 'Vihiga', label: 'Vihiga' },
  { value: 'Wajir', label: 'Wajir' },
  { value: 'West Pokot', label: 'West Pokot' },
];

export interface LocationData {
  address: string;
  city: string;
  county: string;
  landmarks: string;
  accessInstructions: string;
  coordinates: [number, number];
}

interface LocationInputProps {
  value: LocationData;
  onChange: (location: LocationData) => void;
  errors?: {
    address?: string;
    city?: string;
    county?: string;
  };
  disabled?: boolean;
  className?: string;
}

type LocationStatus = 'idle' | 'loading' | 'success' | 'error';

const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  errors = {},
  disabled = false,
  className,
}) => {
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);

  /**
   * Handle "Use My Location" button click
   * Uses browser Geolocation API and reverse geocoding
   */
  const handleUseMyLocation = useCallback(async () => {
    setLocationStatus('loading');
    setLocationError(null);

    try {
      // Get current position from browser
      const position = await getCurrentLocation();
      const { longitude, latitude } = position.coords;

      // Reverse geocode to get address
      const geocodedAddress = await reverseGeocode(longitude, latitude);

      if (geocodedAddress) {
        // Update form with geocoded data
        onChange({
          ...value,
          address: geocodedAddress.address || value.address,
          city: geocodedAddress.city || value.city,
          county: geocodedAddress.county || value.county,
          coordinates: [longitude, latitude],
        });
        setLocationStatus('success');

        // Reset success status after 3 seconds
        setTimeout(() => {
          setLocationStatus('idle');
        }, 3000);
      } else {
        // Geocoding failed but we have coordinates
        onChange({
          ...value,
          coordinates: [longitude, latitude],
        });
        setLocationStatus('success');
        setLocationError('Address detected but could not get full details. Please verify the address.');

        setTimeout(() => {
          setLocationStatus('idle');
        }, 5000);
      }
    } catch (error: unknown) {
      setLocationStatus('error');

      // Handle specific geolocation errors
      const geolocationError = error as GeolocationPositionError;
      if (geolocationError.code === 1) {
        // PERMISSION_DENIED
        setLocationError('Location permission denied. Please enable location access in your browser settings or enter the address manually.');
      } else if (geolocationError.code === 2) {
        // POSITION_UNAVAILABLE
        setLocationError('Unable to determine your location. Please enter the address manually.');
      } else if (geolocationError.code === 3) {
        // TIMEOUT
        setLocationError('Location request timed out. Please try again or enter the address manually.');
      } else {
        setLocationError(geolocationError.message || 'Failed to get your location. Please enter the address manually.');
      }

      // Reset error status after 5 seconds
      setTimeout(() => {
        setLocationStatus('idle');
        setLocationError(null);
      }, 5000);
    }
  }, [onChange, value]);

  /**
   * Handle input field changes
   */
  const handleFieldChange = (field: keyof LocationData, fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  /**
   * Get button icon based on status
   */
  const getButtonIcon = () => {
    switch (locationStatus) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Navigation className="h-4 w-4" />;
    }
  };

  /**
   * Get button variant based on status
   */
  const getButtonVariant = (): 'outline' | 'primary' | 'ghost' => {
    switch (locationStatus) {
      case 'success':
        return 'primary';
      case 'error':
        return 'ghost';
      default:
        return 'outline';
    }
  };

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header with Use My Location button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 text-steel">
          <MapPin className="h-5 w-5 text-lumen-ink" />
          <span className="text-sm font-medium text-bone">Service Location</span>
        </div>

        <Button
          type="button"
          variant={getButtonVariant()}
          size="sm"
          onClick={handleUseMyLocation}
          disabled={disabled || locationStatus === 'loading'}
          className={clsx(
            'transition-all duration-300',
            locationStatus === 'success' && 'bg-success hover:bg-success',
            locationStatus === 'error' && 'text-error hover:bg-error/10'
          )}
        >
          {getButtonIcon()}
          <span className="ml-2">
            {locationStatus === 'loading'
              ? 'Getting Location...'
              : locationStatus === 'success'
              ? 'Location Detected'
              : locationStatus === 'error'
              ? 'Location Failed'
              : 'Use My Location'}
          </span>
        </Button>
      </div>

      {/* Location error message */}
      {locationError && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      {/* Success indicator when location is detected */}
      {locationStatus === 'success' && !locationError && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success flex items-center gap-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>Location detected successfully. Please verify the address below.</span>
        </div>
      )}

      {/* Address Fields Group */}
      <div className="space-y-4 rounded-lg border border-steel/30 bg-charcoal/30 p-4">
        {/* Street Address */}
        <Input
          label="Street Address"
          name="address"
          value={value.address}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          placeholder="e.g., 123 Kenyatta Avenue, Westlands"
          error={errors.address}
          disabled={disabled}
          required
        />

        {/* City and County Row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="City/Town"
            name="city"
            value={value.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            placeholder="e.g., Nairobi"
            error={errors.city}
            disabled={disabled}
          />

          <Select
            label="County"
            name="county"
            value={value.county}
            onChange={(e) => handleFieldChange('county', e.target.value)}
            error={errors.county}
            disabled={disabled}
          >
            {KENYA_COUNTIES.map((county) => (
              <option key={county.value} value={county.value}>
                {county.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Landmark */}
        <Input
          label="Nearby Landmark"
          name="landmarks"
          value={value.landmarks}
          onChange={(e) => handleFieldChange('landmarks', e.target.value)}
          placeholder="e.g., Near Sarit Centre, opposite Westgate Mall"
          helperText="Help the technician find you easier"
          disabled={disabled}
        />

        {/* Access Instructions */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-bone">
            Access Instructions
          </label>
          <textarea
            name="accessInstructions"
            value={value.accessInstructions}
            onChange={(e) => handleFieldChange('accessInstructions', e.target.value)}
            placeholder="e.g., Gate code is 1234, ask for apartment 5B, ring bell twice..."
            disabled={disabled}
            rows={2}
            className={clsx(
              'flex w-full rounded-md border bg-charcoal px-3 py-2.5 text-sm text-bone',
              'placeholder:text-steel/60 focus:outline-none focus:ring-2 focus:ring-lumen focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
              'border-steel/40'
            )}
          />
          <p className="text-xs text-steel">
            Any special instructions for finding or accessing the location
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationInput;
