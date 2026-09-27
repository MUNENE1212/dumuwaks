/**
 * DynamicPriceCalculator Component
 * Displays real-time price breakdown with multipliers and surge indicator
 *
 * Task #74: Real-Time Pricing & Negotiation
 */

import React, { useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  User
} from 'lucide-react';
import { DynamicPriceBreakdown, SurgeInfo, PeakInfo } from '@/types/pricing';

interface DynamicPriceCalculatorProps {
  breakdown: DynamicPriceBreakdown;
  showDetails?: boolean;
  className?: string;
}

const DynamicPriceCalculator: React.FC<DynamicPriceCalculatorProps> = ({
  breakdown,
  showDetails = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = React.useState(showDetails);

  const formatCurrency = (amount: number, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (multiplier: number) => {
    const percent = ((multiplier - 1) * 100);
    if (percent === 0) return null;
    return percent > 0 ? `+${percent.toFixed(0)}%` : `${percent.toFixed(0)}%`;
  };

  const surgeInfo = breakdown.surgeInfo;
  const peakInfo = breakdown.peakInfo;
  const multipliers = breakdown.multipliers;

  // Calculate total multiplier effect
  const hasActiveMultipliers = useMemo(() => {
    return (
      surgeInfo.active ||
      peakInfo.isPeak ||
      multipliers.urgency > 1 ||
      multipliers.technician > 1 ||
      multipliers.timeBased > 1
    );
  }, [surgeInfo, peakInfo, multipliers]);

  // Surge indicator component
  const SurgeIndicator = () => {
    if (!surgeInfo.active) return null;

    const levelColors = {
      low: 'bg-yellow-500',
      moderate: 'bg-orange-500',
      high: 'bg-red-500',
      severe: 'bg-red-700',
      none: ''
    };

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 border border-red-800 rounded-lg">
        <Zap className="h-4 w-4 text-red-500" />
        <span className="text-sm font-medium text-red-300">
          Surge Pricing Active
        </span>
        <span className={`px-2 py-0.5 text-xs font-semibold text-ink rounded ${levelColors[surgeInfo.level]}`}>
          {surgeInfo.level.toUpperCase()}
        </span>
        <span className="text-sm text-red-400">
          (+{surgeInfo.percentageIncrease}%)
        </span>
      </div>
    );
  };

  // Peak hour indicator
  const PeakIndicator = () => {
    if (!peakInfo.isPeak) return null;

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/20 border border-amber-800 rounded-lg">
        <Clock className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-amber-300">
          Peak Hour ({peakInfo.peakType})
        </span>
        <span className="text-sm text-amber-400">
          (+{((multipliers.peakHour - 1) * 100).toFixed(0)}%)
        </span>
      </div>
    );
  };

  // Multiplier row component
  const MultiplierRow = ({
    label,
    multiplier,
    icon: Icon,
    description
  }: {
    label: string;
    multiplier: number;
    icon: React.ElementType;
    description?: string;
  }) => {
    const percent = formatPercentage(multiplier);
    if (!percent || multiplier === 1) return null;

    return (
      <div className="flex items-center justify-between py-2 border-b border-line last:border-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-ink-muted" />
          <span className="text-sm text-ink-muted">{label}</span>
          {description && (
            <span className="text-xs text-ink-muted">({description})</span>
          )}
        </div>
        <span className="text-sm font-medium text-red-400">
          {percent}
        </span>
      </div>
    );
  };

  return (
    <div className={`bg-surface-200 rounded-xl shadow-sm border border-line ${className}`}>
      {/* Header with total price */}
      <div className="p-4 border-b border-line">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink-muted">Estimated Price</p>
            <p className="text-3xl font-bold text-ink">
              {formatCurrency(breakdown.totalAmount, breakdown.currency)}
            </p>
          </div>
          {hasActiveMultipliers && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-ink-muted hover:text-ink-muted rounded-lg hover:bg-surface-300"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Active alerts */}
        {(surgeInfo.active || peakInfo.isPeak) && (
          <div className="flex flex-wrap gap-2 mt-3">
            <SurgeIndicator />
            <PeakIndicator />
          </div>
        )}
      </div>

      {/* Expandable details */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Base price */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">Base Price</span>
            <span className="text-sm font-medium text-ink">
              {formatCurrency(breakdown.basePrice, breakdown.currency)}
            </span>
          </div>

          {/* Applied multipliers */}
          {hasActiveMultipliers && (
            <div className="bg-surface-300/50 rounded-lg p-3">
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">
                Applied Multipliers
              </p>
              <div className="space-y-0">
                <MultiplierRow
                  label="Surge Pricing"
                  multiplier={multipliers.surge}
                  icon={Zap}
                  description={`Demand: ${surgeInfo.demandLevel} bookings`}
                />
                <MultiplierRow
                  label="Peak Hour"
                  multiplier={multipliers.peakHour}
                  icon={Clock}
                  description={peakInfo.peakType || ''}
                />
                <MultiplierRow
                  label="Urgency"
                  multiplier={multipliers.urgency}
                  icon={AlertTriangle}
                />
                <MultiplierRow
                  label="Technician Tier"
                  multiplier={multipliers.technician}
                  icon={User}
                />
                <MultiplierRow
                  label="Time-based"
                  multiplier={multipliers.timeBased}
                  icon={Clock}
                />
              </div>
            </div>
          )}

          {/* Distance fee */}
          {breakdown.fees.distance > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-ink-muted" />
                <span className="text-sm text-ink-muted">Distance Fee</span>
              </div>
              <span className="text-sm font-medium text-ink">
                {formatCurrency(breakdown.fees.distance, breakdown.currency)}
              </span>
            </div>
          )}

          {/* Subtotal */}
          <div className="flex items-center justify-between pt-2 border-t border-line-strong">
            <span className="text-sm font-medium text-ink-muted">Subtotal</span>
            <span className="text-sm font-semibold text-ink">
              {formatCurrency(breakdown.subtotal, breakdown.currency)}
            </span>
          </div>

          {/* Booking fee */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">
              Booking Fee ({breakdown.bookingFee.percentage}% - {breakdown.bookingFee.tierLabel})
            </span>
            <span className="text-ink-muted">
              {formatCurrency(breakdown.bookingFee.amount, breakdown.currency)}
            </span>
          </div>

          {/* Calculated timestamp */}
          <p className="text-xs text-ink-muted text-center">
            Price calculated at {new Date(breakdown.calculatedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default DynamicPriceCalculator;
