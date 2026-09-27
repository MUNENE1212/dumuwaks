import React from 'react';
import { DollarSign, TrendingUp, Shield, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PricingBreakdown } from '@/services/pricing.service';

interface PriceEstimateProps {
  pricing: PricingBreakdown;
  isEstimate?: boolean;
  className?: string;
}

const PriceEstimate: React.FC<PriceEstimateProps> = ({
  pricing,
  isEstimate = false,
  className = '',
}) => {
  return (
    <Card className={className}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">
              {isEstimate ? 'Price Estimate' : 'Price Breakdown'}
            </h3>
          </div>
          {isEstimate && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
              Estimated
            </span>
          )}
        </div>

        {/* Price Items */}
        <div className="space-y-3 mb-4">
          {/* Base Price */}
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Base Price:</span>
            <span className="font-medium">
              {pricing.basePrice.toLocaleString()} {pricing.currency}
            </span>
          </div>

          {/* Distance Fee */}
          {pricing.distanceFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">
                Distance Fee:
                {pricing.details.distance && (
                  <span className="text-xs ml-1">
                    ({pricing.details.distance.kilometers}km)
                  </span>
                )}
              </span>
              <span className="font-medium">
                {pricing.distanceFee.toLocaleString()} {pricing.currency}
              </span>
            </div>
          )}

          {/* Urgency Multiplier */}
          {pricing.urgencyMultiplier > 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">
                Urgency Charge:
                <span className="text-xs ml-1">
                  ({pricing.details.urgency?.level})
                </span>
              </span>
              <span className="font-medium text-orange-600">
                ×{pricing.urgencyMultiplier}
              </span>
            </div>
          )}

          {/* Time Multiplier */}
          {pricing.timeMultiplier > 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Time Surcharge:</span>
              <span className="font-medium text-orange-600">
                ×{pricing.timeMultiplier}
              </span>
            </div>
          )}

          {/* Technician Tier */}
          {pricing.technicianMultiplier > 1 && pricing.details.technician && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">
                Technician Tier:
                <span className="text-xs ml-1">
                  ({pricing.details.technician.tier})
                </span>
              </span>
              <span className="font-medium text-blue-600">
                ×{pricing.technicianMultiplier}
              </span>
            </div>
          )}

          <div className="border-t pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Subtotal:</span>
              <span className="font-semibold">
                {pricing.subtotal.toLocaleString()} {pricing.currency}
              </span>
            </div>
          </div>

          {/* Discount */}
          {pricing.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-400">Discount:</span>
              <span className="font-medium text-green-400">
                -{pricing.discount.toLocaleString()} {pricing.currency}
              </span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="border-t-2 pt-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-ink-muted font-semibold text-lg">You Pay:</span>
            <span className="text-2xl font-bold text-green-600">
              {pricing.totalAmount.toLocaleString()} {pricing.currency}
            </span>
          </div>
        </div>

        {/* Technician Payout Breakdown (Info) */}
        {pricing.technicianPayout > 0 && (
          <div className="bg-surface-200 rounded-lg p-4 border border-line mb-4">
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-5 h-5 text-ink-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-ink mb-1 text-sm">
                  Payment Breakdown
                </h4>
                <p className="text-xs text-ink-muted mb-2">
                  Platform fee and tax are deducted from technician earnings
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Your Payment:</span>
                <span className="font-medium text-ink">
                  {pricing.totalAmount.toLocaleString()} {pricing.currency}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-ink-muted">
                  Platform Fee:
                  {pricing.details.platformFee && (
                    <span className="text-xs ml-1">
                      ({pricing.details.platformFee.value}%)
                    </span>
                  )}
                </span>
                <span className="font-medium text-ink-muted">
                  -{pricing.platformFee.toLocaleString()} {pricing.currency}
                </span>
              </div>

              {pricing.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-muted">
                    {pricing.details.tax?.name || 'VAT'}:
                    {pricing.details.tax && (
                      <span className="text-xs ml-1">
                        ({pricing.details.tax.rate}%)
                      </span>
                    )}
                  </span>
                  <span className="font-medium text-ink-muted">
                    -{pricing.tax.toLocaleString()} {pricing.currency}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t border-line-strong pt-2">
                <span className="text-ink-muted font-semibold">Technician Receives:</span>
                <span className="font-bold text-blue-400">
                  {pricing.technicianPayout.toLocaleString()} {pricing.currency}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Booking Fee Breakdown */}
        {pricing.bookingFee > 0 && pricing.details.bookingFee && (
          <div className=" bg-blue-900/20 rounded-lg p-5 border-2 border-blue-700 shadow-sm">
            <div className="flex items-start gap-2 mb-4">
              <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-100 mb-1 text-base">
                  Payment Structure
                </h4>
                <p className="text-sm text-blue-300">
                  {pricing.details.bookingFee.description}
                </p>
              </div>
            </div>

            {/* Tier Badge */}
            {pricing.details.bookingFee.tierLabel && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-800 rounded-full">
                <span className="text-xs font-medium text-blue-200">
                  Fee Tier: {pricing.details.bookingFee.tierLabel}
                </span>
                <span className="text-xs font-bold text-blue-100">
                  {pricing.details.bookingFee.percentage}% rate
                </span>
              </div>
            )}

            <div className="space-y-3 bg-surface-200 rounded-lg p-4 border border-blue-700">
              {/* Total Amount */}
              <div className="flex justify-between items-center pb-2 border-b border-line">
                <span className="text-ink-muted font-medium">Total Service Cost:</span>
                <span className="text-lg font-bold text-ink">
                  {pricing.totalAmount.toLocaleString()} {pricing.currency}
                </span>
              </div>

              {/* Booking Fee (Pay Now) */}
              <div className="flex justify-between items-center bg-blue-900/30 rounded p-3 border-l-4 border-blue-500">
                <div className="flex flex-col">
                  <span className="text-blue-100 font-semibold">
                    Pay Now ({pricing.details.bookingFee.percentage}% Booking Fee):
                  </span>
                  <span className="text-xs text-blue-400 mt-0.5">
                    Held in escrow until job completion
                  </span>
                </div>
                <span className="text-xl font-bold text-blue-400">
                  {pricing.bookingFee.toLocaleString()} {pricing.currency}
                </span>
              </div>

              {/* Remaining Balance (Pay After) */}
              <div className="flex justify-between items-center bg-green-900/30 rounded p-3 border-l-4 border-green-500">
                <div className="flex flex-col">
                  <span className="text-green-100 font-semibold">
                    Pay After Service ({100 - pricing.details.bookingFee.percentage}%):
                  </span>
                  <span className="text-xs text-green-400 mt-0.5">
                    To be paid upon job completion
                  </span>
                </div>
                <span className="text-xl font-bold text-green-400">
                  {pricing.remainingAmount.toLocaleString()} {pricing.currency}
                </span>
              </div>
            </div>

            {/* Fee Transparency */}
            <div className="mt-3 p-3 bg-blue-900/40 rounded border border-blue-700">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200">
                  <p className="font-medium mb-1">How Booking Fees Work:</p>
                  <ul className="space-y-0.5 ml-2">
                    <li>- Booking fees are tiered based on service cost</li>
                    <li>- Larger jobs enjoy lower percentage fees</li>
                    <li>- 100% refundable if cancelled before technician arrives</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Discount Info */}
        {pricing.details.discount && pricing.details.discount.applied && (
          <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-900">
                Discounts Applied
              </span>
            </div>
            <ul className="text-xs text-green-700 ml-6 space-y-1">
              {pricing.details.discount.reasons.map((reason: string, index: number) => (
                <li key={index}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Estimate Note */}
        {isEstimate && (
          <div className="mt-4 p-3 bg-surface-100 rounded-lg border border-line">
            <p className="text-xs text-ink-muted">
              <Info className="w-3 h-3 inline mr-1" />
              {pricing.distanceFee > 0 && pricing.details.distance ? (
                // Specific technician selected - accurate price
                <>
                  This price is calculated with the selected technician.
                  Final price may vary slightly based on actual service requirements.
                </>
              ) : (
                // No technician yet - estimate only
                <>
                  This is an estimate. Final price will be calculated when a technician is assigned
                  and may include distance fees based on their location.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PriceEstimate;
