import React, { useState } from 'react';
import { Search, MapPin, DollarSign, Zap, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { FindTechniciansParams } from '@/store/slices/matchingSlice';
import { geocodeAddress } from '@/services/geocoding.service';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { searchFiltersSchema, type SearchFiltersFormData } from '@/lib/validation';

interface SearchFiltersProps {
  onSearch: (params: FindTechniciansParams) => void;
  isSearching?: boolean;
}

const serviceCategories = [
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

const urgencyLevels = [
  { value: 'low', label: 'Low - Within a week', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium - Within 2-3 days', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High - Within 24 hours', color: 'bg-orange-100 text-orange-800' },
  { value: 'emergency', label: 'Emergency - ASAP', color: 'bg-red-100 text-red-800' },
];

const SearchFilters: React.FC<SearchFiltersProps> = ({ onSearch, isSearching = false }) => {
  const [coordinates, setCoordinates] = useState<[number, number]>([36.8219, -1.2921]); // Default: Nairobi
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SearchFiltersFormData>({
    resolver: zodResolver(searchFiltersSchema),
    defaultValues: {
      serviceCategory: '',
      address: '',
      urgency: 'medium',
      budget: '',
      preferredDate: '',
      description: '',
    },
  });

  const address = watch('address');
  const urgency = watch('urgency');
  const description = watch('description');

  // Get user's current location
  const getCurrentLocation = () => {
    setLocationError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates([position.coords.longitude, position.coords.latitude]);
          setUseCurrentLocation(true);
          setValue('address', 'Current Location');
          toast.success('Using your current location');
        },
        (error) => {
          setLocationError('Unable to get your location. Please enter an address.');
          toast.error('Could not get your location');
          console.error('Error getting location:', error);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      toast.error('Geolocation not supported');
    }
  };

  // Geocode the entered address
  const handleGeocodeAddress = async () => {
    if (!address?.trim()) {
      toast.error('Please enter an address first');
      return;
    }

    setIsGeocodingAddress(true);
    setLocationError('');

    try {
      const result = await geocodeAddress(address, '', 'Kenya');

      if (result && result.coordinates) {
        setCoordinates(result.coordinates);
        setUseCurrentLocation(false);
        toast.success('Location coordinates found!');
      } else {
        setLocationError('Could not find coordinates for this address. Try a more specific location.');
        toast.error('Could not find this location');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setLocationError('Error finding location. Please try again.');
      toast.error('Failed to find location');
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const onSubmit = (data: SearchFiltersFormData) => {
    if (!data.address && !useCurrentLocation) {
      setLocationError('Please enter a location or use your current location');
      return;
    }

    const params: FindTechniciansParams = {
      serviceCategory: data.serviceCategory,
      location: {
        type: 'Point',
        coordinates,
        address: data.address || 'Current Location',
      },
      urgency: data.urgency,
      ...(data.budget && { budget: parseFloat(data.budget) }),
      ...(data.preferredDate && { preferredDate: new Date(data.preferredDate).toISOString() }),
      ...(data.description && { description: data.description }),
    };

    onSearch(params);
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-gray-800 p-4 sm:p-6 shadow-sm">
      <div className="mb-4 sm:mb-6 flex items-center space-x-2">
        <Search className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 flex-shrink-0" />
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Find a Technician</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Service Category */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            What service do you need? *
          </label>
          <select
            {...register('serviceCategory')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 sm:px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 text-gray-700 dark:text-gray-200 bg-indigo-100 dark:bg-gray-700 text-sm"
          >
            <option value="">Select a service...</option>
            {serviceCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          {errors.serviceCategory && (
            <p className="mt-1 text-sm text-red-600">{errors.serviceCategory.message}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <MapPin className="mr-1 inline h-4 w-4" />
            Location *
          </label>
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                {...register('address', {
                  onChange: () => setUseCurrentLocation(false),
                })}
                placeholder="Enter your city or area"
                className="flex-1 rounded-lg border border-gray-300 px-3 sm:px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 bg-indigo-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeocodeAddress}
                disabled={isGeocodingAddress || !address?.trim()}
                className="whitespace-nowrap w-full sm:w-auto"
              >
                {isGeocodingAddress ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="hidden sm:inline">Finding...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Find Location</span>
                    <span className="sm:hidden">Find</span>
                  </>
                )}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              className="w-full"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Use My Current Location
            </Button>
          </div>
          {locationError && <p className="mt-1 text-sm text-red-600">{locationError}</p>}
          {useCurrentLocation && (
            <p className="mt-1 text-sm text-green-600">
              Using your current location
            </p>
          )}
          {!useCurrentLocation && coordinates[0] !== 36.8219 && (
            <p className="mt-1 text-sm text-green-600">
              Location set: {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Enter your location or use GPS for accurate technician matching
          </p>
        </div>

        {/* Urgency */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Zap className="mr-1 inline h-4 w-4" />
            How urgent is this?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {urgencyLevels.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setValue('urgency', level.value)}
                className={`rounded-lg border-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all text-left sm:text-center ${
                  urgency === level.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-gray-200 dark:border-gray-600 bg-indigo-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <DollarSign className="mr-1 inline h-4 w-4" />
            Budget (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">KES</span>
            <input
              type="number"
              {...register('budget')}
              placeholder="0"
              min="0"
              step="100"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 py-2.5 pl-14 sm:pl-16 pr-3 sm:pr-4 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 bg-indigo-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter your maximum budget to help us find technicians within your price range
          </p>
        </div>

        {/* Preferred Date */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="mr-1 inline h-4 w-4" />
            Preferred Date (Optional)
          </label>
          <input
            type="date"
            {...register('preferredDate')}
            min={new Date().toISOString().split('T')[0]}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 sm:px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 bg-indigo-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description (Optional)
          </label>
          <textarea
            {...register('description')}
            placeholder="Describe the work you need done..."
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 px-3 sm:px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 bg-indigo-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{(description || '').length}/500 characters</p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isSearching}
          isLoading={isSearching}
        >
          <Search className="mr-2 h-5 w-5" />
          {isSearching ? 'Finding Technicians...' : 'Find Technicians'}
        </Button>
      </form>
    </div>
  );
};

export default SearchFilters;
