/**
 * SurgeAlert Component
 * Displays high demand banner with surge pricing explanation
 *
 * Task #74: Real-Time Pricing & Negotiation
 */

import React, { useState } from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp, Zap, Info } from 'lucide-react';
import { SurgeAlert as SurgeAlertType, SurgeLevel } from '@/types/pricing';

interface SurgeAlertProps {
  alerts: SurgeAlertType[];
  onDismiss?: () => void;
  className?: string;
}

const SurgeAlert: React.FC<SurgeAlertProps> = ({
  alerts,
  onDismiss,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || alerts.length === 0) return null;

  // Get the highest severity alert
  const getHighestSeverity = (): SurgeAlertType | null => {
    const severityOrder: SurgeLevel[] = ['severe', 'high', 'moderate', 'low'];
    for (const level of severityOrder) {
      const alert = alerts.find(a => a.level === level);
      if (alert) return alert;
    }
    return alerts[0] || null;
  };

  const primaryAlert = getHighestSeverity();

  if (!primaryAlert) return null;

  const getLevelStyles = (level: SurgeLevel) => {
    switch (level) {
      case 'severe':
        return {
          bg: 'bg-red-900',
          border: 'border-red-800',
          text: 'text-ink',
          badge: 'bg-red-800 text-ink'
        };
      case 'high':
        return {
          bg: 'bg-red-800',
          border: 'border-red-700',
          text: 'text-ink',
          badge: 'bg-red-700 text-on-lumen'
        };
      case 'moderate':
        return {
          bg: 'bg-orange-800',
          border: 'border-orange-700',
          text: 'text-ink',
          badge: 'bg-orange-700 text-on-lumen'
        };
      case 'low':
        return {
          bg: 'bg-yellow-800',
          border: 'border-yellow-700',
          text: 'text-ink',
          badge: 'bg-yellow-700 text-on-lumen'
        };
      default:
        return {
          bg: 'bg-ink-faint',
          border: 'border-line-strong',
          text: 'text-ink',
          badge: 'bg-surface-300 text-ink'
        };
    }
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      plumbing: 'Plumbing',
      electrical: 'Electrical',
      carpentry: 'Carpentry',
      masonry: 'Masonry',
      painting: 'Painting',
      hvac: 'HVAC',
      welding: 'Welding'
    };
    return labels[category] || category;
  };

  const styles = getLevelStyles(primaryAlert.level);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg shadow-lg ${className}`}>
      {/* Main alert bar */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Zap className="h-6 w-6 animate-pulse" />
          </div>
          <div className={`flex items-center gap-2 ${styles.text}`}>
            <span className="font-bold text-lg">HIGH DEMAND</span>
            <span className="text-sm opacity-90">- Prices are {primaryAlert.percentageIncrease}% higher</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-lg hover:bg-ink/10 transition-colors ${styles.text}`}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleDismiss}
            className={`p-1.5 rounded-lg hover:bg-ink/10 transition-colors ${styles.text}`}
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className={`border-t ${styles.border} p-4 ${styles.text}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What is surge pricing */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                What is Surge Pricing?
              </h4>
              <p className="text-sm opacity-90 leading-relaxed">
                During periods of high demand, prices may increase to ensure you get
                service when you need it most. Higher prices help attract more technicians
                to meet the increased demand.
              </p>
            </div>

            {/* Affected categories */}
            <div>
              <h4 className="font-semibold mb-2">Affected Services</h4>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.category}
                    className="flex items-center justify-between bg-ink/10 rounded px-3 py-1.5"
                  >
                    <span className="text-sm font-medium">
                      {getCategoryLabel(alert.category)}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${styles.badge}`}>
                      +{alert.percentageIncrease}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-4 pt-4 border-t border-ink/20">
            <p className="text-sm opacity-90">
              <strong>Tip:</strong> Prices typically normalize after peak hours (7-9 AM and 5-7 PM).
              Consider scheduling your service for off-peak times to get standard rates.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurgeAlert;
