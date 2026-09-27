/**
 * Profile Completeness Widget
 *
 * Visual widget showing profile completion progress.
 * Features:
 * - Circular progress bar with percentage
 * - Section breakdown with checkmarks
 * - Top 3 suggestions with action links
 * - "Improve Profile" CTA button
 *
 * Design uses Circuit Blue (#e8a317) and Wrench Purple (#1fa3d6)
 */

import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchProfileCompleteness,
  recalculateProfileCompleteness
} from '@/store/slices/profileSlice';
import {
  ProfileCompleteness,
  getLevelForScore,
  SECTION_CONFIGS,
  ProfileSection
} from '@/types/profile';

/**
 * Circular Progress component
 */
interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#e8a317'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-charcoal"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-bone">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

/**
 * Section Badge component
 */
interface SectionBadgeProps {
  sectionKey: ProfileSection;
  completed: boolean;
  score: number;
  weight: number;
}

const SectionBadge: React.FC<SectionBadgeProps> = ({
  sectionKey,
  completed,
  score,
  weight
}) => {
  const config = SECTION_CONFIGS.find(s => s.key === sectionKey);

  if (!config) return null;

  return (
    <div className="flex items-center justify-between py-2 border-b border-line last:border-b-0">
      <div className="flex items-center space-x-3">
        {completed ? (
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            className={clsx(
              'w-5 h-5',
              score >= 50 ? 'text-yellow-500' : 'text-red-500'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            {score > 0 && (
              <path
                strokeLinecap="round"
                strokeWidth={2}
                d="M12 8v4l2 2"
              />
            )}
          </svg>
        )}
        <span className="text-sm text-bone">{config.label}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-steel">{weight}%</span>
        <span className={clsx(
          'text-sm font-medium',
          completed ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-steel'
        )}>
          {score}%
        </span>
      </div>
    </div>
  );
};

/**
 * Suggestion Item component
 */
interface SuggestionItemProps {
  label: string;
  priority: number;
  actionUrl?: string;
  actionLabel?: string;
  onNavigate: (url: string) => void;
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({
  label,
  priority,
  actionUrl,
  actionLabel,
  onNavigate
}) => {
  const priorityColors = {
    high: 'text-red-400 bg-red-500/10',
    medium: 'text-yellow-400 bg-yellow-500/10',
    low: 'text-steel bg-surface-300'
  };

  const priorityLevel = priority >= 8 ? 'high' : priority >= 5 ? 'medium' : 'low';

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-3">
        <span className={clsx(
          'text-xs px-2 py-0.5 rounded-full',
          priorityColors[priorityLevel]
        )}>
          {priorityLevel}
        </span>
        <span className="text-sm text-bone">{label}</span>
      </div>
      {actionUrl && (
        <button
          onClick={() => onNavigate(actionUrl)}
          className="text-xs text-lumen-ink hover:text-lumen-ink transition-colors"
        >
          {actionLabel || 'Add'}
        </button>
      )}
    </div>
  );
};

/**
 * Main Profile Completeness Widget
 */
interface ProfileCompletenessWidgetProps {
  compact?: boolean;
  showSuggestions?: boolean;
  className?: string;
}

const ProfileCompletenessWidget: React.FC<ProfileCompletenessWidgetProps> = ({
  compact = false,
  showSuggestions = true,
  className
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { completeness, loading, error } = useAppSelector(state => state.profileCompleteness);
  const { user } = useAppSelector(state => state.auth);
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    // Only fetch for technicians
    if (user?.role === 'technician' && !completeness) {
      dispatch(fetchProfileCompleteness());
    }
  }, [dispatch, user, completeness]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    await dispatch(recalculateProfileCompleteness());
    setIsRecalculating(false);
  };

  const handleNavigate = (url: string) => {
    navigate(url);
  };

  // Don't render for non-technicians
  if (user?.role !== 'technician') {
    return null;
  }

  if (loading && !completeness) {
    return (
      <Card className={clsx('animate-pulse', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-24 h-24 bg-charcoal rounded-full"></div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 bg-charcoal rounded w-3/4"></div>
            <div className="h-4 bg-charcoal rounded w-1/2"></div>
          </div>
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
            onClick={() => dispatch(fetchProfileCompleteness())}
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!completeness) {
    return null;
  }

  const levelConfig = getLevelForScore(completeness.score);
  const topSuggestions = completeness.suggestions?.slice(0, 3) || [];

  if (compact) {
    return (
      <div className={clsx('flex items-center space-x-3 p-3 rounded-lg bg-charcoal', className)}>
        <CircularProgress
          percentage={completeness.score}
          size={60}
          strokeWidth={4}
          color={levelConfig.color}
        />
        <div>
          <p className="text-sm font-medium text-bone">Profile Completeness</p>
          <p className={clsx('text-xs', levelConfig.textColor)}>
            {levelConfig.label}
          </p>
        </div>
        {completeness.score < 100 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile/settings')}
            className="ml-auto"
          >
            Improve
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Profile Completeness</CardTitle>
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="text-xs text-steel hover:text-bone transition-colors"
          >
            {isRecalculating ? 'Recalculating...' : 'Refresh'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Progress Circle */}
        <div className="flex justify-center mb-6">
          <div className="text-center">
            <CircularProgress
              percentage={completeness.score}
              size={120}
              strokeWidth={8}
              color={levelConfig.color}
            />
            <p className={clsx('mt-2 text-sm font-medium', levelConfig.textColor)}>
              {levelConfig.label}
            </p>
          </div>
        </div>

        {/* Section Breakdown */}
        <div className="space-y-1">
          {Object.entries(completeness.sections).map(([key, section]) => (
            <SectionBadge
              key={key}
              sectionKey={key as ProfileSection}
              completed={section.completed}
              score={section.score}
              weight={section.weight}
            />
          ))}
        </div>

        {/* Top Suggestions */}
        {showSuggestions && topSuggestions.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-bone mb-3">Top Suggestions</h4>
            <div className="space-y-1">
              {topSuggestions.map((suggestion, index) => (
                <SuggestionItem
                  key={index}
                  label={suggestion.label}
                  priority={suggestion.priority}
                  actionUrl={suggestion.actionUrl}
                  actionLabel={suggestion.actionLabel}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {completeness.score < 100 && (
        <CardFooter>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate('/profile/settings')}
          >
            Improve Profile
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ProfileCompletenessWidget;
