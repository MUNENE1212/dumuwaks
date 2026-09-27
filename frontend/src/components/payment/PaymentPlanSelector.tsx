import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Clock, Tag, Flag, FileText, MessageCircle, CheckCircle, AlertCircle, Calculator } from 'lucide-react';
import type { PaymentPlan, PlanType, CalculationResult, TechnicianInfo } from '@/types/paymentPlan';
import { PLAN_TYPE_LABELS, PLAN_TYPE_DESCRIPTIONS } from '@/types/paymentPlan';
import { calculatePlanTotal, clearCalculationResult } from '@/store/slices/paymentPlanSlice';
import {
  selectCalculationResult,
  selectPaymentPlansLoading,
  selectPaymentPlansError
} from '@/store/slices/paymentPlanSlice';
import { formatPrice, getDisplayPrice } from '@/services/paymentPlan.service';
import Button from '@/components/ui/Button';

interface PaymentPlanSelectorProps {
  plan: PaymentPlan;
  technician: TechnicianInfo | null;
  onSelect?: (plan: PaymentPlan, calculation: CalculationResult | null) => void;
  showCalculator?: boolean;
  selected?: boolean;
}

const PLAN_TYPE_ICONS: Record<PlanType, React.ReactNode> = {
  hourly: <Clock className="w-5 h-5" />,
  fixed: <Tag className="w-5 h-5" />,
  milestone: <Flag className="w-5 h-5" />,
  per_project: <FileText className="w-5 h-5" />,
  negotiable: <MessageCircle className="w-5 h-5" />
};

const PaymentPlanSelector: React.FC<PaymentPlanSelectorProps> = ({
  plan,
  technician,
  onSelect,
  showCalculator = true,
  selected = false
}) => {
  const dispatch = useDispatch();
  const calculationResult = useSelector(selectCalculationResult);
  const loading = useSelector(selectPaymentPlansLoading);
  const error = useSelector(selectPaymentPlansError);

  const [hours, setHours] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [showDetails, setShowDetails] = useState(false);

  // Clear calculation on unmount
  useEffect(() => {
    return () => {
      dispatch(clearCalculationResult());
    };
  }, [dispatch]);

  const handleCalculate = () => {
    dispatch(calculatePlanTotal({
      planId: plan._id,
      options: { hours, quantity }
    }) as never);
  };

  const handleSelect = () => {
    onSelect?.(plan, calculationResult);
  };

  const getDepositDisplay = () => {
    if (!plan.deposit?.required) return null;

    let depositAmount = calculationResult?.depositAmount || 0;

    return (
      <div className="mt-3 p-3 bg-[var(--dw-color-warning-bg)] rounded-md border border-[var(--dw-color-warning)]">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[var(--dw-color-warning)]" />
          <span className="text-sm text-[var(--dw-color-warning)] font-medium">
            Deposit Required
          </span>
        </div>
        <p className="text-xs text-[var(--dw-text-secondary)] mt-1">
          {plan.deposit.percentage && `${plan.deposit.percentage}% deposit`}
          {plan.deposit.minimumAmount && ` (min. ${formatPrice(plan.deposit.minimumAmount)})`}
          {depositAmount > 0 && ` = ${formatPrice(depositAmount)}`}
        </p>
      </div>
    );
  };

  const renderMilestones = () => {
    if (!plan.milestones || plan.milestones.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        <h5 className="text-xs font-medium text-[var(--dw-text-secondary)] uppercase tracking-wide">
          Payment Milestones
        </h5>
        {plan.milestones.map((milestone, index) => (
          <div
            key={milestone._id || index}
            className="flex items-center justify-between p-2 bg-[var(--dw-bg-tertiary)] rounded-md"
          >
            <div className="flex items-center gap-2">
              {milestone.isCompleted ? (
                <CheckCircle className="w-4 h-4 text-[var(--dw-color-success)]" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-[var(--dw-border-default)]" />
              )}
              <span className="text-sm text-[var(--dw-text-primary)]">{milestone.name}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-[var(--dw-text-primary)]">
                {formatPrice(milestone.amount || 0)}
              </span>
              <span className="text-xs text-[var(--dw-text-tertiary)] ml-2">
                ({milestone.percentage}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCalculator = () => {
    if (!showCalculator) return null;

    if (plan.planType === 'negotiable') {
      return (
        <div className="mt-4 p-4 bg-[var(--dw-color-info-bg)] rounded-lg border border-[var(--dw-color-info)]">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[var(--dw-color-info)]" />
            <span className="text-sm font-medium text-[var(--dw-color-info)]">
              Price Negotiable
            </span>
          </div>
          <p className="text-xs text-[var(--dw-text-secondary)] mt-2">
            Contact the technician to discuss pricing for this service.
          </p>
        </div>
      );
    }

    if (plan.planType === 'per_project' && plan.perProject?.requiresQuote) {
      return (
        <div className="mt-4 p-4 bg-[var(--dw-color-info-bg)] rounded-lg border border-[var(--dw-color-info)]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--dw-color-info)]" />
            <span className="text-sm font-medium text-[var(--dw-color-info)]">
              Quote Required
            </span>
          </div>
          <p className="text-xs text-[var(--dw-text-secondary)] mt-2">
            This service requires a custom quote. Contact the technician for an estimate.
          </p>
          {plan.perProject.estimatedRange && (
            <p className="text-xs text-[var(--dw-text-primary)] mt-2">
              Typical range: {formatPrice(plan.perProject.estimatedRange.min)} - {formatPrice(plan.perProject.estimatedRange.max)}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[var(--dw-text-secondary)]" />
          <span className="text-sm font-medium text-[var(--dw-text-primary)]">
            Price Calculator
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {plan.planType === 'hourly' && (
            <div>
              <label className="block text-xs text-[var(--dw-text-secondary)] mb-1">
                Hours
              </label>
              <input
                type="number"
                min={plan.hourlyRate?.minimumHours || 1}
                step="0.5"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)] focus:border-[var(--dw-accent-primary)] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-[var(--dw-text-secondary)] mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-[var(--dw-bg-tertiary)] border border-[var(--dw-border-default)] rounded-md text-[var(--dw-text-primary)] focus:border-[var(--dw-accent-primary)] focus:outline-none"
            />
          </div>
        </div>

        <Button
          onClick={handleCalculate}
          isLoading={loading}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          Calculate Total
        </Button>

        {calculationResult && calculationResult.success && (
          <div className="p-4 bg-[var(--dw-bg-tertiary)] rounded-lg border border-[var(--dw-border-default)]">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--dw-text-secondary)]">Estimated Total:</span>
              <span className="text-lg font-bold text-[var(--dw-accent-primary)]">
                {formatPrice(calculationResult.totalAmount, calculationResult.currency)}
              </span>
            </div>

            {calculationResult.depositAmount > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--dw-border-subtle)] flex justify-between items-center">
                <span className="text-xs text-[var(--dw-text-secondary)]">Required Deposit:</span>
                <span className="text-sm font-medium text-[var(--dw-color-warning)]">
                  {formatPrice(calculationResult.depositAmount, calculationResult.currency)}
                </span>
              </div>
            )}
          </div>
        )}

        {calculationResult && !calculationResult.success && calculationResult.error && (
          <div className="p-3 bg-[var(--dw-color-error-bg)] rounded-md border border-[var(--dw-color-error)]">
            <p className="text-xs text-[var(--dw-color-error)]">{calculationResult.error}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        selected
          ? 'border-[var(--dw-accent-primary)] bg-[var(--dw-color-info-bg)]'
          : 'border-[var(--dw-border-default)] bg-[var(--dw-bg-secondary)]'
      }`}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              selected
                ? 'bg-[var(--dw-accent-primary)] text-ink'
                : 'bg-[var(--dw-bg-tertiary)] text-[var(--dw-text-secondary)]'
            }`}>
              {PLAN_TYPE_ICONS[plan.planType]}
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--dw-text-primary)]">
                {PLAN_TYPE_LABELS[plan.planType]}
              </h4>
              <p className="text-xs text-[var(--dw-text-secondary)] mt-0.5">
                {PLAN_TYPE_DESCRIPTIONS[plan.planType]}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-[var(--dw-accent-primary)]">
              {getDisplayPrice(plan)}
            </span>
            {plan.stats?.averageRating && plan.stats.averageRating > 0 && (
              <div className="flex items-center gap-1 mt-1 justify-end">
                <span className="text-yellow-400">&#9733;</span>
                <span className="text-xs text-[var(--dw-text-secondary)]">
                  {plan.stats.averageRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="px-4 pb-4 border-t border-[var(--dw-border-subtle)] pt-4">
          {/* Technician Info */}
          {technician && (
            <div className="mb-4 p-3 bg-[var(--dw-bg-tertiary)] rounded-md">
              <p className="text-sm font-medium text-[var(--dw-text-primary)]">
                {technician.businessName || `${technician.firstName} ${technician.lastName}`}
              </p>
              {technician.rating && (
                <p className="text-xs text-[var(--dw-text-secondary)] mt-1">
                  Rating: {technician.rating.average.toFixed(1)} ({technician.rating.count} reviews)
                </p>
              )}
              {technician.stats?.completedBookings && (
                <p className="text-xs text-[var(--dw-text-secondary)]">
                  {technician.stats.completedBookings} jobs completed
                </p>
              )}
            </div>
          )}

          {/* Plan Type Specific Details */}
          {plan.planType === 'hourly' && plan.hourlyRate && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--dw-text-secondary)]">Rate per hour:</span>
                <span className="text-[var(--dw-text-primary)]">
                  {formatPrice(plan.hourlyRate.amount, plan.hourlyRate.currency)}
                </span>
              </div>
              {plan.hourlyRate.minimumHours && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--dw-text-secondary)]">Minimum hours:</span>
                  <span className="text-[var(--dw-text-primary)]">
                    {plan.hourlyRate.minimumHours}
                  </span>
                </div>
              )}
            </div>
          )}

          {plan.planType === 'fixed' && plan.fixedPrice && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--dw-text-secondary)]">Total price:</span>
                <span className="text-[var(--dw-text-primary)]">
                  {formatPrice(plan.fixedPrice.amount, plan.fixedPrice.currency)}
                </span>
              </div>
              {plan.fixedPrice.includesMaterials && (
                <div className="flex items-center gap-1 text-sm text-[var(--dw-color-success)]">
                  <CheckCircle className="w-3 h-3" />
                  <span>Materials included</span>
                </div>
              )}
              {plan.fixedPrice.estimatedDuration && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--dw-text-secondary)]">Est. duration:</span>
                  <span className="text-[var(--dw-text-primary)]">
                    {plan.fixedPrice.estimatedDuration} minutes
                  </span>
                </div>
              )}
            </div>
          )}

          {plan.planType === 'milestone' && renderMilestones()}

          {/* Deposit Info */}
          {getDepositDisplay()}

          {/* Cancellation Policy */}
          {plan.cancellationPolicy && (
            <div className="mt-4 pt-3 border-t border-[var(--dw-border-subtle)]">
              <h5 className="text-xs font-medium text-[var(--dw-text-secondary)] uppercase tracking-wide mb-2">
                Cancellation Policy
              </h5>
              <p className="text-xs text-[var(--dw-text-secondary)]">
                Free cancellation up to {plan.cancellationPolicy.freeCancellationHours} hours before.
                {plan.cancellationPolicy.cancellationFeePercent > 0 && (
                  <> {plan.cancellationPolicy.cancellationFeePercent}% fee applies after that.</>
                )}
              </p>
            </div>
          )}

          {/* Terms */}
          {plan.terms && (
            <div className="mt-4 pt-3 border-t border-[var(--dw-border-subtle)]">
              <h5 className="text-xs font-medium text-[var(--dw-text-secondary)] uppercase tracking-wide mb-2">
                Terms
              </h5>
              <p className="text-xs text-[var(--dw-text-secondary)]">{plan.terms}</p>
            </div>
          )}

          {/* Calculator */}
          {renderCalculator()}

          {/* Select Button */}
          {onSelect && (
            <Button
              onClick={handleSelect}
              className="w-full mt-4"
              variant={selected ? 'primary' : 'secondary'}
            >
              {selected ? 'Selected' : 'Select This Plan'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentPlanSelector;
