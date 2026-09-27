import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ServiceCategoryGrid from './ServiceCategoryGrid';
import ServiceChips from './ServiceChips';
import CustomServiceForm from './CustomServiceForm';
import type { ServiceCategory, Service } from '@/types/service';
import {
  fetchCategories,
  fetchServicesByCategory,
  setSelectedCategory,
  setSearchQuery,
  clearSelection,
  selectCategories,
  selectServices,
  selectSelectedCategory,
  selectServicesLoading,
  selectServicesError,
} from '@/store/slices/serviceSlice';
import type { AppDispatch } from '@/store/index';

/**
 * Props for ServiceDiscovery component
 */
interface ServiceDiscoveryProps {
  onServiceSelect?: (service: Service) => void;
  showCustomServiceOption?: boolean;
  className?: string;
}

/**
 * ServiceDiscovery Component
 * Main service selection interface for the WORD BANK feature
 * - Search bar at top
 * - Category grid below
 * - When category selected: show service chips
 * - "Can't find your service? Add custom" link
 */
const ServiceDiscovery: React.FC<ServiceDiscoveryProps> = ({
  onServiceSelect,
  showCustomServiceOption = true,
  className,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const categories = useSelector(selectCategories);
  const services = useSelector(selectServices);
  const selectedCategory = useSelector(selectSelectedCategory);
  const loading = useSelector(selectServicesLoading);
  const error = useSelector(selectServicesError);

  // Local state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Fetch categories on mount
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch(setSearchQuery(searchInput));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, dispatch]);

  // Handle category selection
  const handleCategorySelect = useCallback(
    (category: ServiceCategory) => {
      dispatch(setSelectedCategory(category));
      dispatch(fetchServicesByCategory(category._id));
      setSelectedService(null);
      setShowCustomForm(false);
    },
    [dispatch]
  );

  // Handle service selection
  const handleServiceSelect = useCallback(
    (service: Service) => {
      setSelectedService(service);
      if (onServiceSelect) {
        onServiceSelect(service);
      }
    },
    [onServiceSelect]
  );

  // Handle back button
  const handleBack = useCallback(() => {
    dispatch(clearSelection());
    setSelectedService(null);
    setShowCustomForm(false);
    setSearchInput('');
  }, [dispatch]);

  // Handle custom service click
  const handleCustomServiceClick = useCallback(() => {
    setShowCustomForm(true);
  }, []);

  // Handle custom service form close
  const handleCustomFormClose = useCallback(() => {
    setShowCustomForm(false);
  }, []);

  // Handle custom service submitted
  const handleCustomServiceSubmitted = useCallback(() => {
    setShowCustomForm(false);
    // Optionally refresh services
  }, []);

  return (
    <div className={clsx('w-full', className)} data-testid="service-discovery">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-steel pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search services..."
            className={clsx(
              'w-full h-12 pl-12 pr-4',
              'bg-charcoal border border-line rounded-lg',
              'text-bone placeholder:text-steel',
              'focus:outline-none focus:border-lumen focus:ring-1 focus:ring-lumen',
              'transition-colors duration-200'
            )}
            aria-label="Search services"
            data-testid="service-search-input"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className={clsx(
                'absolute right-4 top-1/2 -translate-y-1/2',
                'w-5 h-5 text-steel hover:text-bone',
                'transition-colors duration-200'
              )}
              aria-label="Clear search"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card variant="default" className="mb-6 p-4 border-error" role="alert">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-bone font-medium">Error loading services</p>
              <p className="text-steel text-sm">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(fetchCategories())}
              className={clsx(
                'inline-flex items-center gap-2',
                'px-3 py-2 min-h-[36px]',
                'bg-charcoal border border-line rounded-lg',
                'text-bone text-sm',
                'hover:border-lumen hover:text-lumen-ink',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen'
              )}
              aria-label="Retry loading categories"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* Category View */}
      {!selectedCategory && !showCustomForm && (
        <div data-testid="category-view">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-bone">Select a Category</h2>
            <span className="text-sm text-steel">
              {categories.filter((c) => c.isActive).length} categories
            </span>
          </div>

          <ServiceCategoryGrid
            categories={categories.filter((c) => c.isActive)}
            onCategorySelect={handleCategorySelect}
            loading={loading}
            onRefresh={() => dispatch(fetchCategories())}
          />

          {/* Custom Service Link */}
          {showCustomServiceOption && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleCustomServiceClick}
                className={clsx(
                  'text-sm text-lumen-ink hover:text-lumen-ink',
                  'underline underline-offset-2',
                  'transition-colors duration-200'
                )}
                data-testid="add-custom-service-link"
              >
                Can't find your service? Add a custom service
              </button>
            </div>
          )}
        </div>
      )}

      {/* Services View */}
      {selectedCategory && !showCustomForm && (
        <div data-testid="services-view">
          {/* Header with back button */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="!p-2"
              aria-label="Back to categories"
              data-testid="back-to-categories"
            >
              <BackIcon />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-bone uppercase">
                {selectedCategory.name}
              </h2>
              <p className="text-sm text-steel">
                {services.length} {services.length === 1 ? 'service' : 'services'} available
              </p>
            </div>
          </div>

          {/* Service Chips */}
          <ServiceChips
            services={services.filter((s) => s.isActive)}
            selectedServiceId={selectedService?._id}
            onServiceSelect={handleServiceSelect}
            loading={loading}
          />

          {/* Selected Service Details */}
          {selectedService && (
            <Card variant="glass" className="mt-6 p-4" data-testid="selected-service-details">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-bone uppercase">
                    {selectedService.name}
                  </h3>
                  <p className="text-sm text-steel mt-1">
                    {selectedService.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-lumen-ink font-medium">
                      {selectedService.estimatedDuration}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Custom Service Link */}
          {showCustomServiceOption && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleCustomServiceClick}
                className={clsx(
                  'text-sm text-lumen-ink hover:text-lumen-ink',
                  'underline underline-offset-2',
                  'transition-colors duration-200'
                )}
              >
                Can't find what you need? Add a custom service
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom Service Form */}
      {showCustomForm && (
        <div data-testid="custom-service-form-view">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCustomFormClose}
              className="!p-2"
              aria-label="Back"
            >
              <BackIcon />
            </Button>
            <h2 className="text-lg font-semibold text-bone">Add Custom Service</h2>
          </div>

          <CustomServiceForm
            categories={categories.filter((c) => c.isActive)}
            selectedCategoryId={selectedCategory?._id}
            onSubmitSuccess={handleCustomServiceSubmitted}
            onCancel={handleCustomFormClose}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Icon Components
 */
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const BackIcon: React.FC = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

export default ServiceDiscovery;
