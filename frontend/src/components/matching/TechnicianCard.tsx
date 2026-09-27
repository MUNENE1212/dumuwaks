import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Star,
  Clock,
  Award,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { Match } from '@/store/slices/matchingSlice';
import { cn } from '@/lib/utils';
import Button from '../ui/Button';
import { formatRating } from '@/utils/rating';
import VerifiedBadge from '@/components/common/VerifiedBadge';

interface TechnicianCardProps {
  match: Match;
  onViewProfile: (technicianId: string) => void;
  onAccept: (matchId: string) => void;
  onReject: (matchId: string) => void;
}

const TechnicianCard: React.FC<TechnicianCardProps> = ({
  match,
  onViewProfile,
  onAccept,
  onReject,
}) => {
  const navigate = useNavigate();
  const [showScores, setShowScores] = useState(false);

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${match.technician._id}`);
  };

  const getMatchQualityBadge = (score: number) => {
    if (score >= 90) {
      return { label: 'Excellent Match', color: 'bg-success-bg text-success border-success/30' };
    }
    if (score >= 75) {
      return { label: 'Very Good', color: 'bg-info-bg text-lumen-ink border-lumen/30' };
    }
    if (score >= 60) {
      return { label: 'Good Match', color: 'bg-wrench/20 text-wrench border-wrench/30' };
    }
    if (score >= 40) {
      return { label: 'Fair Match', color: 'bg-warning-bg text-warning border-warning/30' };
    }
    return { label: 'Poor Match', color: 'bg-surface-300 text-steel border-line' };
  };

  const getProfilePicture = () => {
    return (
      match.technician.profilePicture ||
      `https://ui-avatars.com/api/?name=${match.technician.firstName}+${match.technician.lastName}&background=random`
    );
  };

  const matchQuality = getMatchQualityBadge(match.scores.overall);

  const scoreItems = [
    { label: 'Skill Match', value: match.scores.skillMatch, icon: Award, color: 'text-wrench' },
    { label: 'Location', value: match.scores.locationProximity, icon: MapPin, color: 'text-lumen-ink' },
    { label: 'Availability', value: match.scores.availability, icon: Clock, color: 'text-success' },
    { label: 'Rating', value: match.scores.rating, icon: Star, color: 'text-warning' },
    { label: 'Experience', value: match.scores.experienceLevel, icon: TrendingUp, color: 'text-lumen-ink' },
  ];

  return (
    <div className="glass-card rounded-lg transition-all hover:shadow-led">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex space-x-3 sm:space-x-4 flex-1">
            {/* Profile Picture */}
            <div className="relative cursor-pointer flex-shrink-0" onClick={handleProfileClick}>
              <img
                src={getProfilePicture()}
                alt={match.technician.firstName}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover ring-4 ring-lumen/20 hover:ring-lumen/50 transition-all"
                title={`View ${match.technician.firstName}'s profile`}
              />
              {match.technician.availability?.status === 'available' && (
                <div className="absolute bottom-0 right-0 h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-line bg-success" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3
                  className="text-lg sm:text-xl font-bold text-bone cursor-pointer hover:text-lumen-ink transition-colors truncate"
                  onClick={handleProfileClick}
                  title={`View ${match.technician.firstName}'s profile`}
                >
                  {match.technician.firstName} {match.technician.lastName}
                </h3>
                <VerifiedBadge user={match.technician} />
                {match.scores.overall >= 85 && (
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-warning flex-shrink-0" />
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-steel">
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-warning text-warning" />
                  <span className="font-medium text-bone">
                    {formatRating(match.technician.rating)}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{match.distance.toFixed(1)} km</span>
                </div>
                {match.technician.yearsOfExperience && (
                  <div className="flex items-center space-x-1">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{match.technician.yearsOfExperience} yrs</span>
                  </div>
                )}
                {match.technician.hourlyRate && (
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="whitespace-nowrap">KES {match.technician.hourlyRate}/hr</span>
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                {match.technician.skills.slice(0, 3).map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-info-bg px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-lumen-ink"
                  >
                    {skill.category.replace('_', ' ')} - {skill.proficiency}
                  </span>
                ))}
                {match.technician.skills.length > 3 && (
                  <span className="inline-flex items-center rounded-full bg-surface-300 px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-steel">
                    +{match.technician.skills.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Match Quality Badge */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
            <div
              className={cn(
                'rounded-full border px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold whitespace-nowrap',
                matchQuality.color
              )}
            >
              {matchQuality.label}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-bone">
              {match.scores.overall}
              <span className="text-base sm:text-lg text-steel">/100</span>
            </div>
          </div>
        </div>

        {/* Match Reasons */}
        {match.matchReasons.length > 0 && (
          <div className="mt-4 rounded-lg bg-info-bg p-4 border border-lumen/20">
            <h4 className="mb-2 flex items-center text-sm font-semibold text-lumen-ink">
              <Sparkles className="mr-2 h-4 w-4" />
              Why this match?
            </h4>
            <ul className="space-y-1">
              {match.matchReasons.map((reason, index) => (
                <li key={index} className="flex items-start text-sm text-steel">
                  <CheckCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                  <span>{reason.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Score Breakdown Toggle */}
        <button
          onClick={() => setShowScores(!showScores)}
          className="mt-4 text-sm font-medium text-lumen-ink hover:text-lumen-ink"
        >
          {showScores ? 'Hide' : 'Show'} detailed scores
        </button>

        {/* Detailed Scores */}
        {showScores && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-3">
            {scoreItems.map((item, index) => {
              const Icon = item.icon;
              const percentage = item.value;
              return (
                <div key={index} className="glass rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Icon className={cn('h-4 w-4', item.color)} />
                    <span className="text-lg font-bold text-bone">{percentage}</span>
                  </div>
                  <div className="mt-1 text-xs text-steel">{item.label}</div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-surface-300">
                    <div
                      className={cn('h-1.5 rounded-full', {
                        'bg-success': percentage >= 80,
                        'bg-lumen': percentage >= 60 && percentage < 80,
                        'bg-warning': percentage >= 40 && percentage < 60,
                        'bg-steel/40': percentage < 40,
                      })}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-line bg-surface-100/30 px-4 sm:px-6 py-3 sm:py-4 rounded-b-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReject(match._id)}
          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <XCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Not Interested</span>
          <span className="sm:hidden">Reject</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewProfile(match.technician._id)}
          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Eye className="h-4 w-4" />
          <span>View Profile</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onAccept(match._id)}
          className="flex items-center justify-center space-x-2 w-full sm:w-auto glass-button"
        >
          <CheckCircle className="h-4 w-4" />
          <span>Book Now</span>
        </Button>
      </div>
    </div>
  );
};

export default TechnicianCard;
