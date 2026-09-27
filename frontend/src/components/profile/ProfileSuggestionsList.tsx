/**
 * Profile Suggestions List
 *
 * Displays all suggestions for profile improvement with:
 * - Priority ordering
 * - Section grouping
 * - Action buttons (Go to Settings, Add Service, etc.)
 *
 * Design uses Circuit Blue (#e8a317) and Wrench Purple (#1fa3d6)
 */

import React, { useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProfileSuggestions } from '@/store/slices/profileSlice';
import { Suggestion, SECTION_CONFIGS, ProfileSection } from '@/types/profile';

/**
 * Priority Badge component
 */
interface PriorityBadgeProps {
  priority: number;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  let label: string;
  let colorClass: string;

  if (priority >= 9) {
    label = 'Critical';
    colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
  } else if (priority >= 7) {
    label = 'High';
    colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  } else if (priority >= 5) {
    label = 'Medium';
    colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  } else {
    label = 'Low';
    colorClass = 'bg-steel/20 text-steel border-steel/30';
  }

  return (
    <span className={clsx(
      'text-xs px-2 py-0.5 rounded-full border',
      colorClass
    )}>
      {label}
    </span>
  );
};

/**
 * Section Header component
 */
interface SectionHeaderProps {
  sectionKey: ProfileSection;
  itemCount: number;
  completedCount: number;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  sectionKey,
  itemCount,
  completedCount
}) => {
  const config = SECTION_CONFIGS.find(s => s.key === sectionKey);

  if (!config) return null;

  const progress = itemCount > 0 ? (completedCount / itemCount) * 100 : 0;
  const isComplete = completedCount === itemCount;

  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-line">
      <div className="flex items-center space-x-3">
        <div className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center',
          isComplete ? 'bg-green-500/20 text-green-400' : 'bg-steel/20 text-steel'
        )}>
          {isComplete ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-sm font-medium">{itemCount - completedCount}</span>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-bone">{config.label}</h3>
          <p className="text-xs text-steel">{config.description}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-16 h-1.5 bg-charcoal rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-300',
              isComplete ? 'bg-green-500' : progress > 50 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-steel">
          {completedCount}/{itemCount}
        </span>
      </div>
    </div>
  );
};

/**
 * Suggestion Card component
 */
interface SuggestionCardProps {
  suggestion: Suggestion;
  onNavigate: (url: string) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onNavigate }) => {
  return (
    <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-charcoal/50 hover:bg-charcoal transition-colors">
      <div className="flex items-center space-x-3">
        <PriorityBadge priority={suggestion.priority} />
        <span className="text-sm text-bone">{suggestion.label}</span>
      </div>
      {suggestion.actionUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(suggestion.actionUrl!)}
          className="text-lumen-ink hover:text-lumen-ink"
        >
          {suggestion.actionLabel || 'Go'}
        </Button>
      )}
    </div>
  );
};

/**
 * Empty State component
 */
const EmptyState: React.FC = () => (
  <div className="text-center py-8">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
      <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-bone mb-1">Profile Complete!</h3>
    <p className="text-sm text-steel">
      Your profile is fully complete. Great job!
    </p>
  </div>
);

/**
 * Main Profile Suggestions List
 */
interface ProfileSuggestionsListProps {
  className?: string;
  limit?: number;
}

const ProfileSuggestionsList: React.FC<ProfileSuggestionsListProps> = ({
  className,
  limit
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { suggestions, loading, error } = useAppSelector(state => state.profileCompleteness);
  const { user } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (user?.role === 'technician') {
      dispatch(fetchProfileSuggestions(limit || 20));
    }
  }, [dispatch, user, limit]);

  const handleNavigate = (url: string) => {
    navigate(url);
  };

  // Group suggestions by section
  const groupedSuggestions = useMemo(() => {
    const groups: Record<ProfileSection, Suggestion[]> = {
      basicInfo: [],
      services: [],
      portfolio: [],
      verification: [],
      availability: [],
      reviews: []
    };

    const suggestionsToUse = limit ? suggestions.slice(0, limit) : suggestions;

    suggestionsToUse.forEach(suggestion => {
      if (groups[suggestion.section as ProfileSection]) {
        groups[suggestion.section as ProfileSection].push(suggestion);
      }
    });

    return groups;
  }, [suggestions, limit]);

  // Sort sections by priority (most suggestions first)
  const sortedSections = useMemo(() => {
    return Object.entries(groupedSuggestions)
      .filter(([, items]) => items.length > 0)
      .sort((a, b) => b[1].length - a[1].length);
  }, [groupedSuggestions]);

  // Don't render for non-technicians
  if (user?.role !== 'technician') {
    return null;
  }

  if (loading && suggestions.length === 0) {
    return (
      <Card className={clsx('animate-pulse', className)}>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-4 bg-charcoal rounded w-1/3 mb-2"></div>
              <div className="h-8 bg-charcoal rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(fetchProfileSuggestions(limit || 20))}
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no suggestions
  if (sortedSections.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <EmptyState />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Improve Your Profile</CardTitle>
        <p className="text-sm text-steel mt-1">
          Complete these items to boost your visibility
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-6">
          {sortedSections.map(([sectionKey, items]) => (
            <div key={sectionKey}>
              <SectionHeader
                sectionKey={sectionKey as ProfileSection}
                itemCount={items.length}
                completedCount={0}
              />
              <div className="space-y-2">
                {items
                  .sort((a, b) => b.priority - a.priority)
                  .map((suggestion, index) => (
                    <SuggestionCard
                      key={`${suggestion.section}-${suggestion.item}-${index}`}
                      suggestion={suggestion}
                      onNavigate={handleNavigate}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t border-line">
          <h4 className="text-sm font-medium text-bone mb-3">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile/settings')}
            >
              Profile Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile/services')}
            >
              Manage Services
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile/portfolio')}
            >
              Add Portfolio
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile/availability')}
            >
              Set Availability
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSuggestionsList;
