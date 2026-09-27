import React, { useRef } from 'react';
import { clsx } from 'clsx';
import type { Service } from '@/types/service';
import { getPriceRangeDisplay } from '@/services/service.service';

/**
 * Props for ServiceChips component
 */
interface ServiceChipsProps {
  services: Service[];
  selectedServiceId?: string | null;
  onServiceSelect: (service: Service) => void;
  loading?: boolean;
  className?: string;
}

/**
 * ServiceChips Component
 * Horizontal scrollable chips for service selection
 * - UPPERCASE bold text
 * - Selected state with Circuit Blue accent
 * - Touch-friendly (44px height minimum)
 */
const ServiceChips: React.FC<ServiceChipsProps> = ({
  services,
  selectedServiceId = null,
  onServiceSelect,
  loading = false,
  className,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Loading skeleton with shimmer animation
  if (loading) {
    return (
      <div
        className={clsx(
          'flex gap-2 overflow-x-auto pb-2 scrollbar-hide',
          className
        )}
        data-testid="service-chips-loading"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              'h-11 w-32 flex-shrink-0 flex flex-col items-start justify-center px-4 py-2',
              'bg-charcoal border border-line rounded-full',
              'shimmer'
            )}
          >
            <div className="w-20 h-3 rounded bg-steel-800/50 mb-1" />
            <div className="w-12 h-2 rounded bg-steel-800/50" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state with friendly message
  if (services.length === 0) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center py-8 px-4',
          className
        )}
        data-testid="service-chips-empty"
      >
        <div className="w-12 h-12 mb-3 rounded-full bg-charcoal border border-line flex items-center justify-center">
          <svg
            className="w-6 h-6 text-steel"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-bone text-sm font-medium text-center mb-1">
          No services in this category
        </p>
        <p className="text-steel text-xs text-center">
          Try selecting a different category or add a custom service
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Left scroll indicator */}
      <div className="absolute left-0 top-0 bottom-2 w-8 bg-surface-100 z-10 pointer-events-none hidden sm:block" />

      {/* Right scroll indicator */}
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-surface-100 z-10 pointer-events-none hidden sm:block" />

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className={clsx(
          'flex gap-2 overflow-x-auto pb-2 px-1',
          'scrollbar-hide scroll-smooth',
          'snap-x snap-mandatory'
        )}
        role="listbox"
        aria-label="Services"
        data-testid="service-chips"
      >
        {services.map((service) => (
          <ServiceChip
            key={service._id}
            service={service}
            isSelected={selectedServiceId === service._id}
            onClick={() => onServiceSelect(service)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Props for ServiceChip component
 */
interface ServiceChipProps {
  service: Service;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * ServiceChip Component
 * Individual service chip with name and price
 * - Clear selected state with Circuit Blue accent and glow
 * - Smooth hover state with transition
 * - Focus ring for accessibility
 * - Price range display
 */
const ServiceChip: React.FC<ServiceChipProps> = ({
  service,
  isSelected,
  onClick,
}) => {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      className={clsx(
        // Base styles - WCAG 2.1 AA compliant (44x44px minimum)
        'flex-shrink-0 snap-start',
        'flex flex-col items-start justify-center',
        'min-h-[44px] min-w-[44px] px-4 py-2',
        'rounded-full',
        'border-2 transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen focus-visible:ring-offset-2 focus-visible:ring-offset-mahogany',

        // Default state - subtle styling
        !isSelected && [
          'bg-charcoal border-line',
          'hover:border-steel hover:bg-surface-300',
          'active:scale-[0.98]',
        ],

        // Selected state - Circuit Blue accent with LED glow
        isSelected && [
          'bg-lumen/20 border-lumen',
          'shadow-led',
          'scale-[1.02]',
        ]
      )}
      data-testid={`service-chip-${service._id}`}
    >
      {/* Service Name - UPPERCASE */}
      <span
        className={clsx(
          'text-sm font-bold uppercase tracking-wide',
          'leading-tight',
          'transition-colors duration-200',
          isSelected ? 'text-lumen-ink' : 'text-bone'
        )}
      >
        {service.name}
      </span>

      {/* Price Range */}
      <span
        className={clsx(
          'text-[10px] mt-0.5',
          'transition-colors duration-200',
          isSelected ? 'text-lumen-ink' : 'text-steel'
        )}
      >
        {getPriceRangeDisplay(service.basePriceMin, service.basePriceMax)}
      </span>
    </button>
  );
};

/**
 * Props for ServiceChipLarge component
 * Alternative large chip variant for more prominent display
 */
interface ServiceChipLargeProps {
  service: Service;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * ServiceChipLarge Component
 * Larger chip variant with duration and description preview
 * - Clear selected state with Circuit Blue accent and glow
 * - Smooth hover state with transition
 * - Focus ring for accessibility
 * - Price range display
 */
export const ServiceChipLarge: React.FC<ServiceChipLargeProps> = ({
  service,
  isSelected,
  onClick,
}) => {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      className={clsx(
        // Base styles
        'flex-shrink-0 snap-start',
        'w-48 min-h-[88px] p-3',
        'rounded-lg',
        'border-2 transition-all duration-200 ease-out',
        'text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen focus-visible:ring-offset-2 focus-visible:ring-offset-mahogany',

        // Default state
        !isSelected && [
          'bg-charcoal border-line',
          'hover:border-steel hover:bg-surface-300',
          'active:scale-[0.98]',
        ],

        // Selected state - Circuit Blue accent with LED glow
        isSelected && [
          'bg-lumen/20 border-lumen',
          'shadow-led',
          'scale-[1.02]',
        ]
      )}
      data-testid={`service-chip-large-${service._id}`}
    >
      {/* Service Name - UPPERCASE */}
      <span
        className={clsx(
          'text-sm font-bold uppercase tracking-wide block',
          'leading-tight line-clamp-2',
          'transition-colors duration-200',
          isSelected ? 'text-lumen-ink' : 'text-bone'
        )}
      >
        {service.name}
      </span>

      {/* Duration */}
      <span
        className={clsx(
          'text-[10px] mt-1 block',
          'transition-colors duration-200',
          isSelected ? 'text-lumen-ink' : 'text-wrench'
        )}
      >
        {service.estimatedDuration}
      </span>

      {/* Price Range */}
      <span
        className={clsx(
          'text-xs mt-1 font-medium block',
          'transition-colors duration-200',
          isSelected ? 'text-lumen-ink' : 'text-steel'
        )}
      >
        {getPriceRangeDisplay(service.basePriceMin, service.basePriceMax)}
      </span>
    </button>
  );
};

export default ServiceChips;
