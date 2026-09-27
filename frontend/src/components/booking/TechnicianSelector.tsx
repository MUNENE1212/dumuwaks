import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { AvailableTechnician, PaymentPlan } from '@/types/booking';
import { formatRating } from '@/utils/rating';
import VerifiedBadge from '@/components/common/VerifiedBadge';

/**
 * Props for TechnicianSelector component
 */
interface TechnicianSelectorProps {
  technicians: AvailableTechnician[];
  selectedTechnicianId: string | null;
  onTechnicianSelect: (technician: AvailableTechnician) => void;
  loading?: boolean;
  serviceLocation?: {
    lat: number;
    lng: number;
  };
  className?: string;
}

/**
 * TechnicianSelector Component
 * Displays a list of technicians offering a selected service
 * - Shows rating, price range, availability
 * - Profile preview on click
 * - "Select" button to proceed
 */
const TechnicianSelector: React.FC<TechnicianSelectorProps> = ({
  technicians,
  selectedTechnicianId,
  onTechnicianSelect,
  loading = false,
  serviceLocation,
  className,
}) => {
  const [previewTechnician, setPreviewTechnician] =
    useState<AvailableTechnician | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'distance'>('rating');

  /**
   * Sort technicians based on selected criteria
   */
  const sortedTechnicians = [...technicians].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating.average - a.rating.average;
      case 'price':
        return a.priceRange.min - b.priceRange.min;
      case 'distance':
        return (a.distance || Infinity) - (b.distance || Infinity);
      default:
        return 0;
    }
  });

  /**
   * Handle technician card click for preview
   */
  const handleCardClick = (technician: AvailableTechnician) => {
    setPreviewTechnician(technician);
  };

  /**
   * Handle select button click
   */
  const handleSelect = (technician: AvailableTechnician) => {
    onTechnicianSelect(technician);
    setPreviewTechnician(null);
  };

  /**
   * Format distance
   */
  const formatDistance = (distance?: number): string => {
    if (distance === undefined) return 'Distance N/A';
    if (distance < 1) return `${Math.round(distance * 1000)}m away`;
    return `${distance.toFixed(1)}km away`;
  };

  /**
   * Format response time
   */
  const formatResponseTime = (minutes?: number): string => {
    if (!minutes) return 'Response time N/A';
    if (minutes < 60) return `~${minutes}min response`;
    const hours = Math.round(minutes / 60);
    return `~${hours}hr response`;
  };

  /**
   * Format price range
   */
  const formatPriceRange = (range: { min: number; max: number }): string => {
    if (range.min === range.max) {
      return `KES ${range.min.toLocaleString()}`;
    }
    return `KES ${range.min.toLocaleString()} - ${range.max.toLocaleString()}`;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={clsx('space-y-4', className)} data-testid="technician-selector-loading">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="default" className="p-4 animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-charcoal rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-charcoal rounded w-1/3" />
                <div className="h-3 bg-charcoal rounded w-1/4" />
                <div className="h-3 bg-charcoal rounded w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (technicians.length === 0) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center py-12 px-4',
          className
        )}
        data-testid="technician-selector-empty"
      >
        <div className="w-16 h-16 mb-4 rounded-full bg-charcoal flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-steel" />
        </div>
        <p className="text-bone text-center font-medium">No technicians available</p>
        <p className="text-steel text-sm text-center mt-1">
          No technicians currently offer this service in your area. Try a different service or location.
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)} data-testid="technician-selector">
      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-steel">
          {technicians.length} technician{technicians.length !== 1 ? 's' : ''} available
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-steel">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className={clsx(
              'text-sm bg-charcoal border border-line rounded px-2 py-1',
              'text-bone focus:outline-none focus:border-lumen'
            )}
            aria-label="Sort technicians by"
          >
            <option value="rating">Highest Rated</option>
            <option value="price">Lowest Price</option>
            <option value="distance">Nearest</option>
          </select>
        </div>
      </div>

      {/* Technician Cards */}
      <div className="space-y-3">
        {sortedTechnicians.map((technician) => (
          <TechnicianCard
            key={technician._id}
            technician={technician}
            isSelected={selectedTechnicianId === technician._id}
            onPreview={() => handleCardClick(technician)}
            onSelect={() => handleSelect(technician)}
            formatDistance={formatDistance}
            formatResponseTime={formatResponseTime}
            formatPriceRange={formatPriceRange}
          />
        ))}
      </div>

      {/* Preview Modal */}
      {previewTechnician && (
        <TechnicianPreviewModal
          technician={previewTechnician}
          isSelected={selectedTechnicianId === previewTechnician._id}
          onClose={() => setPreviewTechnician(null)}
          onSelect={() => handleSelect(previewTechnician)}
          formatDistance={formatDistance}
          formatResponseTime={formatResponseTime}
          formatPriceRange={formatPriceRange}
        />
      )}
    </div>
  );
};

/**
 * Individual Technician Card
 */
interface TechnicianCardProps {
  technician: AvailableTechnician;
  isSelected: boolean;
  onPreview: () => void;
  onSelect: () => void;
  formatDistance: (distance?: number) => string;
  formatResponseTime: (minutes?: number) => string;
  formatPriceRange: (range: { min: number; max: number }) => string;
}

const TechnicianCard: React.FC<TechnicianCardProps> = ({
  technician,
  isSelected,
  onPreview,
  onSelect,
  formatDistance,
  formatResponseTime,
  formatPriceRange,
}) => {
  return (
    <Card
      variant={isSelected ? 'glass' : 'default'}
      className={clsx(
        'p-4 transition-all duration-200',
        isSelected && 'border-lumen shadow-led',
        'hover:border-lumen/50'
      )}
      data-testid={`technician-card-${technician._id}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <button
          onClick={onPreview}
          className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-lumen rounded-full"
          aria-label={`View ${technician.firstName}'s profile`}
        >
          {technician.profilePicture ? (
            <img
              src={technician.profilePicture}
              alt={`${technician.firstName} ${technician.lastName}`}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-charcoal flex items-center justify-center text-bone text-xl font-bold">
              {technician.firstName[0]}
              {technician.lastName[0]}
            </div>
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-bone font-semibold truncate">
                {technician.firstName} {technician.lastName}
              </h3>
              <VerifiedBadge user={technician} className="mt-1" />
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center text-sm text-lumen-ink">
                  <StarIcon className="w-4 h-4 mr-1" />
                  {formatRating(technician.rating.average)} ({technician.rating.count})
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-bone font-medium">
                {formatPriceRange(technician.priceRange)}
              </p>
              <p className="text-xs text-steel mt-1">
                {formatDistance(technician.distance)}
              </p>
            </div>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1 mt-2">
            {technician.skills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="text-xs bg-charcoal text-steel px-2 py-0.5 rounded"
              >
                {skill.name}
              </span>
            ))}
            {technician.skills.length > 3 && (
              <span className="text-xs text-steel">
                +{technician.skills.length - 3} more
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs text-steel">
            <span>{technician.completedJobs} jobs completed</span>
            <span>{formatResponseTime(technician.responseTime)}</span>
            {technician.availability.isAvailable ? (
              <span className="text-success">Available now</span>
            ) : (
              <span>Next: {technician.availability.nextAvailable || 'N/A'}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              aria-label={`View ${technician.firstName}'s full profile`}
            >
              View Profile
            </Button>
            <Button
              variant={isSelected ? 'primary' : 'secondary'}
              size="sm"
              onClick={onSelect}
              aria-label={isSelected ? 'Technician selected' : `Select ${technician.firstName}`}
            >
              {isSelected ? 'Selected' : 'Select'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * Technician Preview Modal
 */
interface TechnicianPreviewModalProps {
  technician: AvailableTechnician;
  isSelected: boolean;
  onClose: () => void;
  onSelect: () => void;
  formatDistance: (distance?: number) => string;
  formatResponseTime: (minutes?: number) => string;
  formatPriceRange: (range: { min: number; max: number }) => string;
}

const TechnicianPreviewModal: React.FC<TechnicianPreviewModalProps> = ({
  technician,
  isSelected,
  onClose,
  onSelect,
  formatDistance,
  formatResponseTime,
  formatPriceRange,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-100/80"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="technician-preview-title"
      data-testid="technician-preview-modal"
    >
      <Card
        variant="glass"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-line">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {technician.profilePicture ? (
                <img
                  src={technician.profilePicture}
                  alt={`${technician.firstName} ${technician.lastName}`}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-charcoal flex items-center justify-center text-bone text-2xl font-bold">
                  {technician.firstName[0]}
                  {technician.lastName[0]}
                </div>
              )}
              <div>
                <h2
                  id="technician-preview-title"
                  className="text-xl font-bold text-bone"
                >
                  {technician.firstName} {technician.lastName}
                </h2>
                <VerifiedBadge user={technician} size="md" className="mt-1" />
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center text-lumen-ink">
                    <StarIcon className="w-5 h-5 mr-1" />
                    {formatRating(technician.rating.average)} ({technician.rating.count} reviews)
                  </span>
                </div>
                <p className="text-sm text-steel mt-1">
                  {formatDistance(technician.distance)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-steel hover:text-bone transition-colors"
              aria-label="Close preview"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price & Availability */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-charcoal rounded-lg p-4">
              <p className="text-sm text-steel mb-1">Price Range</p>
              <p className="text-lg font-bold text-bone">
                {formatPriceRange(technician.priceRange)}
              </p>
            </div>
            <div className="bg-charcoal rounded-lg p-4">
              <p className="text-sm text-steel mb-1">Availability</p>
              <p className="text-lg font-bold text-bone">
                {technician.availability.isAvailable ? (
                  <span className="text-success">Available Now</span>
                ) : (
                  <span>Next: {technician.availability.nextAvailable || 'N/A'}</span>
                )}
              </p>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h3 className="text-sm font-semibold text-bone mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {technician.skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-charcoal text-bone px-3 py-1 rounded text-sm"
                >
                  {skill.name} ({skill.yearsOfExperience}y)
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-lumen-ink">
                {technician.completedJobs}
              </p>
              <p className="text-xs text-steel">Jobs Done</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-lumen-ink">
                {formatResponseTime(technician.responseTime).replace('~', '')}
              </p>
              <p className="text-xs text-steel">Response</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-lumen-ink">
                {formatRating(technician.rating.average)}
              </p>
              <p className="text-xs text-steel">Rating</p>
            </div>
          </div>

          {/* Payment Plans */}
          {technician.paymentPlans && technician.paymentPlans.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-bone mb-2">
                Payment Plans Available
              </h3>
              <div className="space-y-2">
                {technician.paymentPlans.map((plan: PaymentPlan) => (
                  <div
                    key={plan._id}
                    className="bg-charcoal rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-bone font-medium">{plan.name}</p>
                      <p className="text-xs text-steel">{plan.description}</p>
                    </div>
                    <span className="text-lumen-ink text-sm">
                      {plan.depositPercentage}% deposit
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line flex items-center gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button
            variant={isSelected ? 'primary' : 'secondary'}
            onClick={onSelect}
            className="flex-1"
          >
            {isSelected ? 'Selected' : 'Select Technician'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

/**
 * Icon Components
 */
const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export default TechnicianSelector;
