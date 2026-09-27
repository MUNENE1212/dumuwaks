import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getPreferences, updatePreferences } from '@/store/slices/matchingSlice';
import { Button } from '@/components/ui';
import Loading from '@/components/ui/Loading';
import {
  Settings,
  MapPin,
  DollarSign,
  Star,
  Award,
  Clock,
  Bell,
  Brain,
  Shield,
  Save,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PreferenceFormData {
  general: {
    maxDistance: number;
    priceRange: {
      preference: 'budget' | 'moderate' | 'premium' | 'any';
    };
    responseTime: 'immediate' | 'within_hour' | 'within_day' | 'flexible';
    defaultUrgency: 'low' | 'medium' | 'high' | 'emergency';
  };
  technicianPreferences: {
    ratingImportance: number;
    minRating: number;
    minYearsExperience: number;
    requireCertifications: boolean;
    requireBackgroundCheck: boolean;
    requireInsurance: boolean;
  };
  communication: {
    preferredMethod: 'in_app_chat' | 'phone' | 'email' | 'sms' | 'whatsapp';
    notifyOnMatch: boolean;
    notifyOnBetterMatch: boolean;
    matchNotificationFrequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  };
  ai: {
    enableAIRecommendations: boolean;
    autoMatch: boolean;
    enableSmartScheduling: boolean;
    enablePricePrediction: boolean;
    allowBehaviorLearning: boolean;
    personalizationLevel: 'minimal' | 'moderate' | 'high';
  };
  customWeights: {
    skillMatch: number;
    locationProximity: number;
    availability: number;
    rating: number;
    experienceLevel: number;
    pricing: number;
    responseTime: number;
    completionRate: number;
    customerPreference: number;
  };
}

const MatchingPreferences: React.FC = () => {
  const dispatch = useAppDispatch();
  const { preferences, isLoading } = useAppSelector((state) => state.matching);

  const [formData, setFormData] = useState<PreferenceFormData>({
    general: {
      maxDistance: 25,
      priceRange: {
        preference: 'moderate',
      },
      responseTime: 'within_hour',
      defaultUrgency: 'medium',
    },
    technicianPreferences: {
      ratingImportance: 8,
      minRating: 3.5,
      minYearsExperience: 0,
      requireCertifications: false,
      requireBackgroundCheck: false,
      requireInsurance: false,
    },
    communication: {
      preferredMethod: 'in_app_chat',
      notifyOnMatch: true,
      notifyOnBetterMatch: true,
      matchNotificationFrequency: 'instant',
    },
    ai: {
      enableAIRecommendations: true,
      autoMatch: true,
      enableSmartScheduling: true,
      enablePricePrediction: true,
      allowBehaviorLearning: true,
      personalizationLevel: 'moderate',
    },
    customWeights: {
      skillMatch: 25,
      locationProximity: 20,
      availability: 15,
      rating: 15,
      experienceLevel: 10,
      pricing: 5,
      responseTime: 5,
      completionRate: 3,
      customerPreference: 2,
    },
  });

  const [activeTab, setActiveTab] = useState<'general' | 'technician' | 'communication' | 'ai' | 'weights'>('general');

  useEffect(() => {
    dispatch(getPreferences());
  }, [dispatch]);

  useEffect(() => {
    if (preferences) {
      setFormData({
        general: {
          maxDistance: preferences.general.maxDistance,
          priceRange: {
            preference: preferences.general.priceRange.preference as 'budget' | 'moderate' | 'premium' | 'any',
          },
          responseTime: preferences.general.responseTime as 'immediate' | 'within_hour' | 'within_day' | 'flexible',
          defaultUrgency: preferences.general.defaultUrgency as 'low' | 'medium' | 'high' | 'emergency',
        },
        technicianPreferences: preferences.technicianPreferences,
        communication: preferences.communication ? {
          preferredMethod: preferences.communication.preferredMethod as 'in_app_chat' | 'phone' | 'email' | 'sms' | 'whatsapp',
          notifyOnMatch: preferences.communication.notifyOnMatch,
          notifyOnBetterMatch: preferences.communication.notifyOnBetterMatch,
          matchNotificationFrequency: preferences.communication.matchNotificationFrequency as 'instant' | 'hourly' | 'daily' | 'weekly',
        } : formData.communication,
        ai: {
          enableAIRecommendations: preferences.ai.enableAIRecommendations,
          autoMatch: preferences.ai.autoMatch,
          enableSmartScheduling: preferences.ai.enableSmartScheduling,
          enablePricePrediction: preferences.ai.enablePricePrediction ?? true,
          allowBehaviorLearning: preferences.ai.allowBehaviorLearning ?? true,
          personalizationLevel: preferences.ai.personalizationLevel as 'minimal' | 'moderate' | 'high',
        },
        customWeights: preferences.customWeights ? {
          skillMatch: preferences.customWeights.skillMatch ?? 25,
          locationProximity: preferences.customWeights.locationProximity ?? 20,
          availability: preferences.customWeights.availability ?? 15,
          rating: preferences.customWeights.rating ?? 15,
          experienceLevel: preferences.customWeights.experienceLevel ?? 10,
          pricing: preferences.customWeights.pricing ?? 5,
          responseTime: preferences.customWeights.responseTime ?? 5,
          completionRate: preferences.customWeights.completionRate ?? 3,
          customerPreference: preferences.customWeights.customerPreference ?? 2,
        } : formData.customWeights,
      });
    }
  }, [preferences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await dispatch(updatePreferences(formData)).unwrap();
      toast.success('Preferences updated successfully!');
    } catch (error: any) {
      toast.error(error || 'Failed to update preferences');
    }
  };

  const handleReset = () => {
    if (preferences) {
      setFormData({
        general: {
          maxDistance: preferences.general.maxDistance,
          priceRange: {
            preference: preferences.general.priceRange.preference as 'budget' | 'moderate' | 'premium' | 'any',
          },
          responseTime: preferences.general.responseTime as 'immediate' | 'within_hour' | 'within_day' | 'flexible',
          defaultUrgency: preferences.general.defaultUrgency as 'low' | 'medium' | 'high' | 'emergency',
        },
        technicianPreferences: preferences.technicianPreferences,
        communication: preferences.communication ? {
          preferredMethod: preferences.communication.preferredMethod as 'in_app_chat' | 'phone' | 'email' | 'sms' | 'whatsapp',
          notifyOnMatch: preferences.communication.notifyOnMatch,
          notifyOnBetterMatch: preferences.communication.notifyOnBetterMatch,
          matchNotificationFrequency: preferences.communication.matchNotificationFrequency as 'instant' | 'hourly' | 'daily' | 'weekly',
        } : formData.communication,
        ai: {
          enableAIRecommendations: preferences.ai.enableAIRecommendations,
          autoMatch: preferences.ai.autoMatch,
          enableSmartScheduling: preferences.ai.enableSmartScheduling,
          enablePricePrediction: preferences.ai.enablePricePrediction ?? true,
          allowBehaviorLearning: preferences.ai.allowBehaviorLearning ?? true,
          personalizationLevel: preferences.ai.personalizationLevel as 'minimal' | 'moderate' | 'high',
        },
        customWeights: preferences.customWeights ? {
          skillMatch: preferences.customWeights.skillMatch ?? 25,
          locationProximity: preferences.customWeights.locationProximity ?? 20,
          availability: preferences.customWeights.availability ?? 15,
          rating: preferences.customWeights.rating ?? 15,
          experienceLevel: preferences.customWeights.experienceLevel ?? 10,
          pricing: preferences.customWeights.pricing ?? 5,
          responseTime: preferences.customWeights.responseTime ?? 5,
          completionRate: preferences.customWeights.completionRate ?? 3,
          customerPreference: preferences.customWeights.customerPreference ?? 2,
        } : formData.customWeights,
      });
      toast.success('Changes reset');
    }
  };

  const normalizeWeights = () => {
    const weights = formData.customWeights;
    const total = Object.values(weights).reduce((sum, val) => sum + val, 0);

    if (total !== 100) {
      const normalizedWeights = { ...weights };
      Object.keys(normalizedWeights).forEach((key) => {
        normalizedWeights[key as keyof typeof normalizedWeights] = Math.round(
          (normalizedWeights[key as keyof typeof normalizedWeights] / total) * 100
        );
      });

      setFormData((prev) => ({
        ...prev,
        customWeights: normalizedWeights,
      }));

      toast.success('Weights normalized to 100%');
    } else {
      toast.success('Weights already sum to 100%');
    }
  };

  if (isLoading && !preferences) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading size="lg" text="Loading preferences..." />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'technician', label: 'Technician', icon: Award },
    { id: 'communication', label: 'Communication', icon: Bell },
    { id: 'ai', label: 'AI & Learning', icon: Brain },
    { id: 'weights', label: 'Match Weights', icon: Star },
  ];

  const totalWeight = Object.values(formData.customWeights).reduce((sum, val) => sum + val, 0);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Matching Preferences</h1>
        <p className="mt-2 text-ink-muted">
          Customize how our AI finds the perfect technicians for you
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="mb-6 border-b border-line">
          <div className="flex space-x-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="rounded-lg border border-line bg-surface-200 p-6 shadow-sm">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
                  <MapPin className="mr-2 h-5 w-5 text-primary-600" />
                  Location & Distance
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-muted">
                      Maximum Distance (km): {formData.general.maxDistance} km
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={formData.general.maxDistance}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          general: {
                            ...prev.general,
                            maxDistance: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="mt-2 w-full"
                    />
                    <p className="mt-1 text-xs text-ink-muted">
                      Only show technicians within this distance from your location
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
                  <DollarSign className="mr-2 h-5 w-5 text-primary-600" />
                  Pricing Preferences
                </h2>
                <div>
                  <label className="block text-sm font-medium text-ink-muted">Price Range</label>
                  <select
                    value={formData.general.priceRange.preference}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        general: {
                          ...prev.general,
                          priceRange: {
                            ...prev.general.priceRange,
                            preference: e.target.value as any,
                          },
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-line-strong bg-surface-300 text-ink px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="budget">Budget - Most affordable options</option>
                    <option value="moderate">Moderate - Balance of price and quality</option>
                    <option value="premium">Premium - Highest quality regardless of price</option>
                    <option value="any">Any - Show all price ranges</option>
                  </select>
                </div>
              </div>

              <div>
                <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
                  <Clock className="mr-2 h-5 w-5 text-primary-600" />
                  Time Preferences
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-muted">
                      Expected Response Time
                    </label>
                    <select
                      value={formData.general.responseTime}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          general: {
                            ...prev.general,
                            responseTime: e.target.value as any,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-line-strong bg-surface-300 text-ink px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="immediate">Immediate - Within 5 minutes</option>
                      <option value="within_hour">Within an hour</option>
                      <option value="within_day">Within a day</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-muted">
                      Default Urgency Level
                    </label>
                    <select
                      value={formData.general.defaultUrgency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          general: {
                            ...prev.general,
                            defaultUrgency: e.target.value as any,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-line-strong bg-surface-300 text-ink px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="low">Low - Within a week</option>
                      <option value="medium">Medium - Within 2-3 days</option>
                      <option value="high">High - Within 24 hours</option>
                      <option value="emergency">Emergency - ASAP</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Technician Tab */}
          {activeTab === 'technician' && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
                  <Star className="mr-2 h-5 w-5 text-primary-600" />
                  Rating Requirements
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-muted">
                      Rating Importance (0-10): {formData.technicianPreferences.ratingImportance}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={formData.technicianPreferences.ratingImportance}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          technicianPreferences: {
                            ...prev.technicianPreferences,
                            ratingImportance: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="mt-2 w-full"
                    />
                    <p className="mt-1 text-xs text-ink-muted">
                      How important is technician rating to you?
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-muted">
                      Minimum Rating: {formData.technicianPreferences.minRating.toFixed(1)} stars
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={formData.technicianPreferences.minRating}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          technicianPreferences: {
                            ...prev.technicianPreferences,
                            minRating: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="mt-2 w-full"
                    />
                    <p className="mt-1 text-xs text-ink-muted">
                      Only show technicians with at least this rating
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
                  <Award className="mr-2 h-5 w-5 text-primary-600" />
                  Experience Requirements
                </h2>
                <div>
                  <label className="block text-sm font-medium text-ink-muted">
                    Minimum Years of Experience: {formData.technicianPreferences.minYearsExperience}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={formData.technicianPreferences.minYearsExperience}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        technicianPreferences: {
                          ...prev.technicianPreferences,
                          minYearsExperience: parseInt(e.target.value),
                        },
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </div>
              </div>

              <div>
                <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
                  <Shield className="mr-2 h-5 w-5 text-primary-600" />
                  Verification Requirements
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.technicianPreferences.requireCertifications}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          technicianPreferences: {
                            ...prev.technicianPreferences,
                            requireCertifications: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-ink-muted">Require Certifications</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.technicianPreferences.requireBackgroundCheck}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          technicianPreferences: {
                            ...prev.technicianPreferences,
                            requireBackgroundCheck: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-ink-muted">Only ID-verified technicians</span>
                  </label>

                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  Note: Requiring these may reduce the number of available matches
                </p>
              </div>
            </div>
          )}

          {/* Communication Tab */}
          {activeTab === 'communication' && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
                  <Bell className="mr-2 h-5 w-5 text-primary-600" />
                  Notification Preferences
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-muted">
                      Preferred Contact Method
                    </label>
                    <select
                      value={formData.communication.preferredMethod}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          communication: {
                            ...prev.communication,
                            preferredMethod: e.target.value as any,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-line-strong bg-surface-300 text-ink px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="in_app_chat">In-App Chat</option>
                      <option value="phone">Phone Call</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.communication.notifyOnMatch}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            communication: {
                              ...prev.communication,
                              notifyOnMatch: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-ink-muted">Notify me when matches are found</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.communication.notifyOnBetterMatch}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            communication: {
                              ...prev.communication,
                              notifyOnBetterMatch: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-ink-muted">
                        Notify me when a better match becomes available
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-muted">
                      Match Notification Frequency
                    </label>
                    <select
                      value={formData.communication.matchNotificationFrequency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          communication: {
                            ...prev.communication,
                            matchNotificationFrequency: e.target.value as any,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-line-strong bg-surface-300 text-ink px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!formData.communication.notifyOnMatch}
                    >
                      <option value="instant">Instant - As soon as matches are found</option>
                      <option value="hourly">Hourly - Summary every hour</option>
                      <option value="daily">Daily - Daily digest</option>
                      <option value="weekly">Weekly - Weekly summary</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
                  <Brain className="mr-2 h-5 w-5 text-primary-600" />
                  Suggestions
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.ai.enableAIRecommendations}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ai: {
                            ...prev.ai,
                            enableAIRecommendations: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-ink-muted">
                        Personalised suggestions
                      </span>
                      <span className="text-xs text-ink-muted">
                        Get personalized technician suggestions based on your preferences
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.ai.autoMatch}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ai: {
                            ...prev.ai,
                            autoMatch: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
                      disabled={!formData.ai.enableAIRecommendations}
                    />
                    <div>
                      <span className="block text-sm font-medium text-ink-muted">Auto-Match</span>
                      <span className="text-xs text-ink-muted">
                        Automatically find matches without manual search
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.ai.enableSmartScheduling}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ai: {
                            ...prev.ai,
                            enableSmartScheduling: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-ink-muted">
                        Smart Scheduling
                      </span>
                      <span className="text-xs text-ink-muted">
                        AI suggests optimal booking times based on your patterns
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.ai.enablePricePrediction}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ai: {
                            ...prev.ai,
                            enablePricePrediction: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-ink-muted">
                        Price Prediction
                      </span>
                      <span className="text-xs text-ink-muted">
                        Get estimated pricing before booking
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.ai.allowBehaviorLearning}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ai: {
                            ...prev.ai,
                            allowBehaviorLearning: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-ink-muted">
                        Learn from My Behavior
                      </span>
                      <span className="text-xs text-ink-muted">
                        Improve recommendations based on your booking history
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted">
                  Personalization Level
                </label>
                <select
                  value={formData.ai.personalizationLevel}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ai: {
                        ...prev.ai,
                        personalizationLevel: e.target.value as any,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-line-strong bg-surface-300 text-ink px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!formData.ai.enableAIRecommendations}
                >
                  <option value="minimal">Minimal - Basic recommendations</option>
                  <option value="moderate">Moderate - Balanced personalization</option>
                  <option value="high">High - Highly tailored recommendations</option>
                </select>
                <p className="mt-1 text-xs text-ink-muted">
                  Higher personalization uses more of your data to refine matches
                </p>
              </div>
            </div>
          )}

          {/* Weights Tab */}
          {activeTab === 'weights' && (
            <div className="space-y-6">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center text-lg font-semibold text-ink">
                    <Star className="mr-2 h-5 w-5 text-primary-600" />
                    Custom Match Weights
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-ink-muted">Total:</span>
                    <span
                      className={`text-lg font-bold ${
                        totalWeight === 100 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {totalWeight}%
                    </span>
                  </div>
                </div>
                <p className="mb-4 text-sm text-ink-muted">
                  Customize how much each factor matters in finding matches. Total must equal 100%.
                </p>

                <div className="space-y-4">
                  {Object.entries(formData.customWeights).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-ink-muted">
                          {key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (str) => str.toUpperCase())}
                        </label>
                        <span className="text-sm font-semibold text-ink">{value}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customWeights: {
                              ...prev.customWeights,
                              [key]: parseInt(e.target.value),
                            },
                          }))
                        }
                        className="mt-1 w-full"
                      />
                    </div>
                  ))}
                </div>

                {totalWeight !== 100 && (
                  <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <div className="flex items-start space-x-2">
                      <span className="text-amber-800 text-sm">
                        Weights must sum to 100%. Current total: {totalWeight}%
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={normalizeWeights}
                        className="ml-auto"
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Normalize
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-lg bg-blue-50 p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">What do these mean?</h3>
                  <ul className="space-y-1 text-xs text-blue-800">
                    <li><strong>Skill Match:</strong> How well the technician's skills match your needs</li>
                    <li><strong>Location Proximity:</strong> Distance between you and the technician</li>
                    <li><strong>Availability:</strong> How soon the technician can start</li>
                    <li><strong>Rating:</strong> Customer ratings and reviews</li>
                    <li><strong>Experience Level:</strong> Years of experience in the field</li>
                    <li><strong>Pricing:</strong> How rates compare to your budget</li>
                    <li><strong>Response Time:</strong> How quickly they typically respond</li>
                    <li><strong>Completion Rate:</strong> Percentage of jobs completed successfully</li>
                    <li><strong>Customer Preference:</strong> Your past interactions and favorites</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Changes
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || (activeTab === 'weights' && totalWeight !== 100)}
            className="min-w-[150px]"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MatchingPreferences;
