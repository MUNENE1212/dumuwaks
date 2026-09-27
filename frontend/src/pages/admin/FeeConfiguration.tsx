/**
 * Fee Configuration Page
 *
 * Admin page for managing booking fee tiers.
 * Provides table display, add/edit/delete functionality, and preview calculator.
 *
 * @module pages/admin/FeeConfiguration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  RefreshCw,
  AlertCircle,
  Check,
  Info,
} from 'lucide-react';
import {
  getFeeConfig,
  updateFeeConfig,
  previewFee,
  createDefaultTiers,
  type BookingFeeTier,
  type FeeConfigResponse,
  type FeePreviewResult,
} from '@/services/feeConfig.service';
import FeeTierModal from '@/components/admin/FeeTierModal';
import Loading from '@/components/ui/Loading';

/**
 * Fee Configuration Page Component
 */
const FeeConfiguration: React.FC = () => {
  // State
  const [config, setConfig] = useState<FeeConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedTier, setSelectedTier] = useState<BookingFeeTier | null>(null);

  // Preview calculator state
  const [previewAmount, setPreviewAmount] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<FeePreviewResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  /**
   * Fetch fee configuration
   */
  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getFeeConfig();
      setConfig(data);
    } catch (err: any) {
      console.error('Error fetching fee config:', err);
      setError(err.response?.data?.message || 'Failed to load fee configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  /**
   * Show success message with auto-dismiss
   */
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  /**
   * Handle save tiers
   */
  const handleSaveTiers = async (tiers: BookingFeeTier[]) => {
    try {
      setIsSaving(true);
      setError(null);

      const updated = await updateFeeConfig({ bookingFeeTiers: tiers });
      setConfig(updated);
      showSuccess('Fee configuration saved successfully');
    } catch (err: any) {
      console.error('Error saving tiers:', err);
      setError(err.response?.data?.message || 'Failed to save fee configuration');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle add tier
   */
  const handleAddTier = () => {
    setSelectedTier(null);
    setModalMode('add');
    setModalOpen(true);
  };

  /**
   * Handle edit tier
   */
  const handleEditTier = (tier: BookingFeeTier, index: number) => {
    setSelectedTier({ ...tier });
    setModalMode('edit');
    setModalOpen(true);
  };

  /**
   * Handle delete tier
   */
  const handleDeleteTier = async (index: number) => {
    const tier = config?.bookingFeeTiers[index];
    if (!tier) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the "${tier.label}" tier? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);
      const newTiers = [...(config?.bookingFeeTiers || [])];
      newTiers.splice(index, 1);

      const updated = await updateFeeConfig({ bookingFeeTiers: newTiers });
      setConfig(updated);
      showSuccess('Tier deleted successfully');
    } catch (err: any) {
      console.error('Error deleting tier:', err);
      setError(err.response?.data?.message || 'Failed to delete tier');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle modal save
   */
  const handleModalSave = async (tier: BookingFeeTier) => {
    const newTiers = [...(config?.bookingFeeTiers || [])];

    if (modalMode === 'add') {
      newTiers.push(tier);
    } else if (selectedTier) {
      const index = newTiers.findIndex(
        (t) => t.label === selectedTier.label && t.minAmount === selectedTier.minAmount
      );
      if (index !== -1) {
        newTiers[index] = tier;
      }
    }

    // Sort tiers by minAmount
    newTiers.sort((a, b) => a.minAmount - b.minAmount);

    await handleSaveTiers(newTiers);
  };

  /**
   * Handle calculate preview
   */
  const handleCalculatePreview = async () => {
    const amount = parseFloat(previewAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    try {
      setIsCalculating(true);
      setError(null);
      const result = await previewFee(amount);
      setPreviewResult(result);
    } catch (err: any) {
      console.error('Error calculating preview:', err);
      setError(err.response?.data?.message || 'Failed to calculate fee preview');
    } finally {
      setIsCalculating(false);
    }
  };

  /**
   * Handle reset to defaults
   */
  const handleResetToDefaults = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset to default fee tiers? This will replace your current configuration.'
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);
      const defaultTiers = createDefaultTiers();
      const updated = await updateFeeConfig({ bookingFeeTiers: defaultTiers });
      setConfig(updated);
      showSuccess('Reset to default tiers successfully');
    } catch (err: any) {
      console.error('Error resetting to defaults:', err);
      setError(err.response?.data?.message || 'Failed to reset to defaults');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Format amount for display
   */
  const formatAmount = (amount: number | null): string => {
    if (amount === null) return 'No limit';
    return `KES ${amount.toLocaleString()}`;
  };

  /**
   * Get tier coverage status
   */
  const getTierCoverageStatus = (): { isValid: boolean; message: string } => {
    const tiers = config?.bookingFeeTiers || [];

    if (tiers.length === 0) {
      return { isValid: false, message: 'No tiers configured' };
    }

    // Check if first tier starts at 0
    if (tiers[0].minAmount !== 0) {
      return { isValid: false, message: 'First tier must start at 0' };
    }

    // Check for gaps
    for (let i = 1; i < tiers.length; i++) {
      const prev = tiers[i - 1];
      const curr = tiers[i];

      if (prev.maxAmount === null) {
        return { isValid: false, message: `Tier "${prev.label}" has no upper limit but there are more tiers` };
      }

      if (curr.minAmount !== prev.maxAmount + 1) {
        return { isValid: false, message: `Gap between "${prev.label}" and "${curr.label}"` };
      }
    }

    // Check if last tier has no upper limit
    const lastTier = tiers[tiers.length - 1];
    if (lastTier.maxAmount !== null) {
      return {
        isValid: true,
        message: `Warning: Amounts above ${formatAmount(lastTier.maxAmount)} will use default percentage`
      };
    }

    return { isValid: true, message: 'Full coverage from 0 to infinity' };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading size="lg" text="Loading fee configuration..." />
      </div>
    );
  }

  const coverageStatus = getTierCoverageStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-bone flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-lumen-ink" />
            Fee Configuration
          </h1>
          <p className="mt-1 text-sm text-steel">
            Manage booking fee tiers and preview calculations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConfig}
            disabled={isLoading}
            className="px-3 py-2 text-steel hover:text-bone hover:bg-surface-300 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-5 h-5', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={handleResetToDefaults}
            disabled={isSaving}
            className="px-3 py-2 text-steel hover:text-bone hover:bg-surface-300 rounded-lg transition-colors"
            title="Reset to Defaults"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-2 text-success">
          <Check className="h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-lg p-4 flex items-center gap-2 text-error">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Tier Coverage Status */}
      <div
        className={clsx(
          'rounded-lg p-4 border flex items-start gap-3',
          coverageStatus.isValid
            ? 'bg-success/5 border-success/20'
            : 'bg-warning/5 border-warning/20'
        )}
      >
        {coverageStatus.isValid ? (
          <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        )}
        <div>
          <h4 className={clsx('text-sm font-medium', coverageStatus.isValid ? 'text-success' : 'text-warning')}>
            Tier Coverage
          </h4>
          <p className={clsx('text-sm', coverageStatus.isValid ? 'text-success/80' : 'text-warning/80')}>
            {coverageStatus.message}
          </p>
        </div>
      </div>

      {/* Fee Tiers Table */}
      <div className="bg-charcoal/30 border border-line rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-lg font-semibold text-bone">Fee Tiers</h2>
          <button
            onClick={handleAddTier}
            disabled={isSaving}
            className="px-4 py-2 bg-lumen text-on-lumen rounded-lg hover:bg-lumen-hover transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>

        {config?.bookingFeeTiers && config.bookingFeeTiers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-charcoal/50 border-b border-line">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-steel uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-steel uppercase tracking-wider">
                    Min Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-steel uppercase tracking-wider">
                    Max Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-steel uppercase tracking-wider">
                    Fee %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-steel uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-steel uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {config.bookingFeeTiers.map((tier, index) => (
                  <tr key={index} className="hover:bg-surface-300/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-bone">{tier.label}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-steel">
                      {formatAmount(tier.minAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-steel">
                      {formatAmount(tier.maxAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-lumen-ink">{tier.percentage}%</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          tier.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-steel/10 text-steel'
                        )}
                      >
                        {tier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditTier(tier, index)}
                        disabled={isSaving}
                        className="text-steel hover:text-lumen-ink mr-3 transition-colors"
                        title="Edit tier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTier(index)}
                        disabled={isSaving || config.bookingFeeTiers.length <= 1}
                        className="text-steel hover:text-error transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-steel/40 mb-4" />
            <p className="text-steel">No fee tiers configured</p>
            <button
              onClick={handleAddTier}
              className="mt-4 px-4 py-2 bg-lumen text-on-lumen rounded-lg hover:bg-lumen-hover transition-colors text-sm"
            >
              Add First Tier
            </button>
          </div>
        )}

        {/* Version info */}
        {config && (
          <div className="px-6 py-3 border-t border-line bg-charcoal/20 text-xs text-steel">
            Version {config.version} | Last updated: {new Date(config.updatedAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Preview Calculator */}
      <div className="bg-charcoal/30 border border-line rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-bone flex items-center gap-2">
            <Calculator className="w-5 h-5 text-lumen-ink" />
            Fee Preview Calculator
          </h2>
          <p className="mt-1 text-sm text-steel">
            Calculate the booking fee for any amount based on current tier configuration
          </p>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="previewAmount" className="block text-sm font-medium text-steel mb-2">
                Enter Amount (KES)
              </label>
              <input
                type="number"
                id="previewAmount"
                value={previewAmount}
                onChange={(e) => setPreviewAmount(e.target.value)}
                placeholder="e.g., 10000"
                min="0"
                className="w-full px-4 py-2.5 bg-charcoal border border-line rounded-lg text-bone placeholder-steel/50 focus:outline-none focus:ring-2 focus:ring-lumen focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCalculatePreview}
                disabled={isCalculating || !previewAmount}
                className={clsx(
                  'px-6 py-2.5 bg-lumen text-on-lumen rounded-lg transition-colors flex items-center gap-2 text-sm font-medium',
                  'hover:bg-lumen-hover',
                  (isCalculating || !previewAmount) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isCalculating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    Calculate
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Result */}
          {previewResult && (
            <div className="mt-6 bg-charcoal/50 border border-line rounded-lg p-4">
              <h4 className="text-sm font-medium text-steel mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Fee Calculation Result
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-steel uppercase tracking-wide">Amount</p>
                  <p className="mt-1 text-xl font-bold text-bone">
                    KES {previewResult.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-steel uppercase tracking-wide">Booking Fee</p>
                  <p className="mt-1 text-xl font-bold text-lumen-ink">
                    KES {previewResult.feeAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-steel uppercase tracking-wide">Remaining</p>
                  <p className="mt-1 text-xl font-bold text-bone">
                    KES {previewResult.breakdown.remainingAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-line">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="text-steel">Tier Applied:</span>
                  <span className="px-2 py-1 bg-lumen/10 text-lumen-ink rounded font-medium">
                    {previewResult.tierLabel}
                  </span>
                  <span className="text-steel">|</span>
                  <span className="text-steel">Fee Rate:</span>
                  <span className="font-medium text-bone">{previewResult.percentage}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-info/5 border border-info/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-info">How Fee Tiers Work</h4>
            <ul className="mt-2 text-sm text-info/80 space-y-1 list-disc list-inside">
              <li>Tiers are matched based on the booking total amount</li>
              <li>The first tier must always start at KES 0</li>
              <li>Each tier should connect to the next without gaps</li>
              <li>The last tier typically has no upper limit (maxAmount: null)</li>
              <li>Only active tiers are used for fee calculations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal */}
      <FeeTierModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        tier={selectedTier}
        mode={modalMode}
        existingTiers={config?.bookingFeeTiers || []}
      />
    </div>
  );
};

export default FeeConfiguration;
