import React from 'react';
import { clsx } from 'clsx';
import { Card } from '@/components/ui/Card';
import type { ServiceCategory } from '@/types/service';

/**
 * Props for ServiceCategoryGrid component
 */
interface ServiceCategoryGridProps {
  categories: ServiceCategory[];
  onCategorySelect: (category: ServiceCategory) => void;
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

/**
 * ServiceCategoryGrid Component
 * Displays a responsive grid of service category cards
 * - 3 columns on mobile
 * - 4 columns on tablet
 * - 6 columns on desktop
 * - Touch-friendly with 48px+ minimum height
 */
const ServiceCategoryGrid: React.FC<ServiceCategoryGridProps> = ({
  categories,
  onCategorySelect,
  loading = false,
  onRefresh,
  className,
}) => {
  // Loading skeleton with shimmer animation
  if (loading) {
    return (
      <div
        className={clsx(
          'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4',
          className
        )}
        data-testid="category-grid-loading"
      >
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              'min-h-[60px] sm:min-h-[72px] lg:min-h-[80px]',
              'flex flex-col items-center justify-center',
              'p-3 sm:p-4',
              'bg-charcoal border border-line rounded-lg',
              'shimmer'
            )}
          >
            {/* Icon skeleton */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-steel-800/50 mb-2" />
            {/* Text skeleton */}
            <div className="w-16 h-3 rounded bg-steel-800/50 mb-1" />
            {/* Count skeleton */}
            <div className="w-10 h-2 rounded bg-steel-800/50" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state with refresh option
  if (categories.length === 0) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center py-12 px-4',
          className
        )}
        data-testid="category-grid-empty"
      >
        <div className="w-20 h-20 mb-4 rounded-full bg-charcoal border border-line flex items-center justify-center">
          <svg
            className="w-10 h-10 text-steel"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-bone text-lg font-semibold text-center mb-2">
          No categories available
        </h3>
        <p className="text-steel text-sm text-center max-w-xs mb-6">
          Service categories are being set up. Check back soon or try refreshing.
        </p>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className={clsx(
              'inline-flex items-center gap-2',
              'px-4 py-2 min-h-[44px]',
              'bg-charcoal border border-line rounded-lg',
              'text-bone font-medium text-sm',
              'hover:border-lumen hover:text-lumen-ink',
              'transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen focus-visible:ring-offset-2 focus-visible:ring-offset-mahogany'
            )}
            aria-label="Refresh categories"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4',
        className
      )}
      role="list"
      aria-label="Service categories"
      data-testid="category-grid"
    >
      {categories.map((category) => (
        <CategoryCard
          key={category._id}
          category={category}
          onClick={() => onCategorySelect(category)}
        />
      ))}
    </div>
  );
};

/**
 * Props for CategoryCard component
 */
interface CategoryCardProps {
  category: ServiceCategory;
  onClick: () => void;
}

/**
 * CategoryCard Component
 * Individual category card with icon, name (UPPERCASE), and service count
 */
const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  return (
    <Card
      variant="default"
      className={clsx(
        'cursor-pointer group',
        'min-h-[60px] sm:min-h-[72px] lg:min-h-[80px]',
        'flex flex-col items-center justify-center',
        'p-3 sm:p-4',
        'transition-all duration-200 ease-out',
        'hover:border-lumen hover:shadow-led',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen focus-visible:ring-offset-2 focus-visible:ring-offset-mahogany'
      )}
      onClick={onClick}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${category.name}: ${category.serviceCount} services available`}
      data-testid={`category-card-${category._id}`}
    >
      {/* Icon */}
      <div
        className={clsx(
          'w-8 h-8 sm:w-10 sm:h-10 mb-2',
          'flex items-center justify-center',
          'text-lumen-ink group-hover:text-lumen-ink',
          'transition-colors duration-200'
        )}
        aria-hidden="true"
      >
        <CategoryIcon iconName={category.icon} />
      </div>

      {/* Category Name - UPPERCASE */}
      <h3
        className={clsx(
          'text-xs sm:text-sm font-bold text-bone',
          'uppercase tracking-wide',
          'text-center leading-tight',
          'group-hover:text-lumen-ink transition-colors duration-200'
        )}
      >
        {category.name}
      </h3>

      {/* Service Count */}
      <span
        className={clsx(
          'mt-1 text-[10px] sm:text-xs text-steel',
          'transition-colors duration-200',
          'group-hover:text-steel-400'
        )}
      >
        {category.serviceCount} {category.serviceCount === 1 ? 'service' : 'services'}
      </span>
    </Card>
  );
};

/**
 * CategoryIcon Component
 * Renders the appropriate icon based on icon name
 */
const CategoryIcon: React.FC<{ iconName: string }> = ({ iconName }) => {
  const iconMap: Record<string, React.ReactNode> = {
    wrench: (
      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    zap: (
      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    hammer: (
      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    box: (
      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    paintbrush: (
      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    thermometer: (
      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    flame: (
      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
    settings: (
      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  return (
    <>
      {iconMap[iconName] || iconMap.settings}
    </>
  );
};

export default ServiceCategoryGrid;
