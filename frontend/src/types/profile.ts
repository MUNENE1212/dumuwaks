/**
 * Profile Completeness Types
 *
 * Types for the Profile Completeness Engine feature.
 * Used to track and display technician profile completion progress.
 */

/**
 * Status of an individual checklist item
 */
export interface ItemStatus {
  name: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

/**
 * Status of a profile section with multiple items
 */
export interface SectionStatus {
  completed: boolean;
  weight: number;
  score: number;
  items: ItemStatus[];
}

/**
 * Improvement suggestion with action
 */
export interface Suggestion {
  section: string;
  item: string;
  label: string;
  priority: number;
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * Score history entry
 */
export interface ScoreHistoryEntry {
  score: number;
  calculatedAt: string;
}

/**
 * Profile Completeness data structure
 */
export interface ProfileCompleteness {
  _id: string;
  user: string;
  score: number;
  sections: {
    basicInfo: SectionStatus;
    services: SectionStatus;
    portfolio: SectionStatus;
    verification: SectionStatus;
    availability: SectionStatus;
    reviews: SectionStatus;
  };
  suggestions: Suggestion[];
  lastCalculatedAt: string;
  previousScore?: number;
  scoreHistory?: ScoreHistoryEntry[];
  level?: 'incomplete' | 'needsWork' | 'fair' | 'good' | 'excellent';
  color?: string;
  isVisibilityEligible?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Public profile completeness (limited data for badges)
 */
export interface PublicProfileCompleteness {
  score: number;
  level: 'incomplete' | 'needsWork' | 'fair' | 'good' | 'excellent';
  color: string;
}

/**
 * Missing item from profile
 */
export interface MissingItem {
  section: string;
  name: string;
  label: string;
  completed: boolean;
}

/**
 * Section names for profile completeness
 */
export type ProfileSection =
  | 'basicInfo'
  | 'services'
  | 'portfolio'
  | 'verification'
  | 'availability'
  | 'reviews';

/**
 * Section display configuration
 */
export interface SectionConfig {
  key: ProfileSection;
  label: string;
  icon: string;
  description: string;
}

/**
 * Predefined section configurations
 */
export const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: 'basicInfo',
    label: 'Basic Information',
    icon: 'user',
    description: 'Profile picture, bio, phone verification, and location'
  },
  {
    key: 'services',
    label: 'Services',
    icon: 'briefcase',
    description: 'At least 3 services with pricing information'
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: 'image',
    description: 'At least 5 portfolio images showcasing your work'
  },
  {
    key: 'verification',
    label: 'Verification',
    icon: 'shield-check',
    description: 'Email and ID verification status'
  },
  {
    key: 'availability',
    label: 'Availability',
    icon: 'calendar',
    description: 'Your working schedule and availability'
  },
  {
    key: 'reviews',
    label: 'Reviews',
    icon: 'star',
    description: 'Customer reviews and ratings (bonus section)'
  }
];

/**
 * Level configuration for display
 */
export interface LevelConfig {
  level: 'incomplete' | 'needsWork' | 'fair' | 'good' | 'excellent';
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  minScore: number;
  maxScore: number;
  icon: string;
}

/**
 * Predefined level configurations
 */
export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 'incomplete',
    label: 'Incomplete',
    color: '#ef4444',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    minScore: 0,
    maxScore: 29,
    icon: 'exclamation-circle'
  },
  {
    level: 'needsWork',
    label: 'Needs Work',
    color: '#e8a317',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-500',
    minScore: 30,
    maxScore: 49,
    icon: 'exclamation-triangle'
  },
  {
    level: 'fair',
    label: 'Fair',
    color: '#eab308',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-500',
    minScore: 50,
    maxScore: 69,
    icon: 'minus-circle'
  },
  {
    level: 'good',
    label: 'Good',
    color: '#22c55e',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    minScore: 70,
    maxScore: 89,
    icon: 'check-circle'
  },
  {
    level: 'excellent',
    label: 'Excellent',
    color: '#e8a317',
    bgColor: 'bg-circuit-blue/10',
    textColor: 'text-circuit-blue',
    minScore: 90,
    maxScore: 100,
    icon: 'badge-check'
  }
];

/**
 * Get level config for a score
 */
export const getLevelForScore = (score: number): LevelConfig => {
  return LEVEL_CONFIGS.find(
    level => score >= level.minScore && score <= level.maxScore
  ) || LEVEL_CONFIGS[0];
};

/**
 * Get section config by key
 */
export const getSectionConfig = (key: ProfileSection): SectionConfig => {
  return SECTION_CONFIGS.find(section => section.key === key) as SectionConfig;
};
