import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Settings, DollarSign, Percent, Tag, Save, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getPricingConfig,
  updatePlatformFee,
  updateTax,
  updateDiscounts,
  updateServiceRates,
} from '@/services/admin.service';
import Loading from '@/components/ui/Loading';

const SystemSettings: React.FC = () => {
  const [pricingConfig, setPricingConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Platform Fee State
  const [platformFee, setPlatformFee] = useState({
    type: 'percentage' as 'percentage' | 'fixed',
    value: 15,
  });

  // Tax State
  const [tax, setTax] = useState({
    enabled: true,
    rate: 16,
    name: 'VAT',
  });

  // Discount State
  const [discounts, setDiscounts] = useState({
    firstTimeCustomer: {
      enabled: true,
      type: 'percentage' as 'percentage' | 'fixed',
      value: 10,
    },
    loyaltyDiscount: {
      enabled: true,
      thresholds: [
        { minBookings: 5, discount: 5 },
        { minBookings: 10, discount: 10 },
        { minBookings: 20, discount: 15 },
      ],
    },
  });

  // Service Rates State
  const [newServiceRate, setNewServiceRate] = useState({
    serviceCategory: 'plumbing',
    serviceType: '',
    basePrice: 0,
    priceUnit: 'fixed',
    estimatedDuration: 1,
  });

  // Fetch pricing config
  useEffect(() => {
    const fetchPricingConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const config = await getPricingConfig();
        setPricingConfig(config);

        // Set initial values
        if (config.platformFee) {
          setPlatformFee(config.platformFee);
        }
        if (config.tax) {
          setTax(config.tax);
        }
        if (config.discounts) {
          setDiscounts(config.discounts);
        }
      } catch (err: any) {
        console.error('Error loading pricing config:', err);
        setError(err.message || 'Failed to load pricing configuration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricingConfig();
  }, []);

  // Update platform fee
  const handleUpdatePlatformFee = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await updatePlatformFee(platformFee.type, platformFee.value);
      setSuccessMessage('Platform fee updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating platform fee:', err);
      setError(err.message || 'Failed to update platform fee');
    } finally {
      setIsSaving(false);
    }
  };

  // Update tax
  const handleUpdateTax = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await updateTax(tax);
      setSuccessMessage('Tax configuration updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating tax:', err);
      setError(err.message || 'Failed to update tax');
    } finally {
      setIsSaving(false);
    }
  };

  // Update discounts
  const handleUpdateDiscounts = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await updateDiscounts(discounts);
      setSuccessMessage('Discount configuration updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating discounts:', err);
      setError(err.message || 'Failed to update discounts');
    } finally {
      setIsSaving(false);
    }
  };

  // Add service rate
  const handleAddServiceRate = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await updateServiceRates(newServiceRate);
      setSuccessMessage('Service rate added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      // Reset form
      setNewServiceRate({
        serviceCategory: 'plumbing',
        serviceType: '',
        basePrice: 0,
        priceUnit: 'fixed',
        estimatedDuration: 1,
      });
    } catch (err: any) {
      console.error('Error adding service rate:', err);
      setError(err.message || 'Failed to add service rate');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading size="lg" text="Loading system settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink flex items-center gap-2">
          <Settings className="h-8 w-8 text-purple-600" />
          System Settings
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Configure platform pricing, fees, taxes, and discounts
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 flex items-center gap-2 text-green-200">
          <AlertCircle className="h-5 w-5" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-center gap-2 text-red-200">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Platform Fee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Platform Fee
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Fee Type
                </label>
                <select
                  value={platformFee.type}
                  onChange={(e) =>
                    setPlatformFee({ ...platformFee, type: e.target.value as 'percentage' | 'fixed' })
                  }
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount (KES)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Value
                </label>
                <input
                  type="number"
                  value={platformFee.value}
                  onChange={(e) => setPlatformFee({ ...platformFee, value: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
                  min="0"
                  max={platformFee.type === 'percentage' ? 100 : undefined}
                />
              </div>
            </div>
            <button
              onClick={handleUpdatePlatformFee}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 text-on-lumen rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Platform Fee'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Tax Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-purple-600" />
            Tax Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tax-enabled"
                checked={tax.enabled}
                onChange={(e) => setTax({ ...tax, enabled: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="tax-enabled" className="text-sm text-ink-muted">
                Enable Tax
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Tax Name
                </label>
                <input
                  type="text"
                  value={tax.name}
                  onChange={(e) => setTax({ ...tax, name: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={tax.rate}
                  onChange={(e) => setTax({ ...tax, rate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <button
              onClick={handleUpdateTax}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 text-on-lumen rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Tax Configuration'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Discounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-purple-600" />
            Discount Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* First Time Customer Discount */}
            <div>
              <h3 className="font-medium text-ink mb-3">
                First Time Customer Discount
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="first-time-enabled"
                  checked={discounts.firstTimeCustomer.enabled}
                  onChange={(e) =>
                    setDiscounts({
                      ...discounts,
                      firstTimeCustomer: {
                        ...discounts.firstTimeCustomer,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4"
                />
                <label htmlFor="first-time-enabled" className="text-sm text-ink-muted">
                  Enable First Time Customer Discount
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={discounts.firstTimeCustomer.type}
                  onChange={(e) =>
                    setDiscounts({
                      ...discounts,
                      firstTimeCustomer: {
                        ...discounts.firstTimeCustomer,
                        type: e.target.value as 'percentage' | 'fixed',
                      },
                    })
                  }
                  className="px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount (KES)</option>
                </select>
                <input
                  type="number"
                  value={discounts.firstTimeCustomer.value}
                  onChange={(e) =>
                    setDiscounts({
                      ...discounts,
                      firstTimeCustomer: {
                        ...discounts.firstTimeCustomer,
                        value: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
                  min="0"
                />
              </div>
            </div>

            {/* Loyalty Discount */}
            <div>
              <h3 className="font-medium text-ink mb-3">Loyalty Discount</h3>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="loyalty-enabled"
                  checked={discounts.loyaltyDiscount.enabled}
                  onChange={(e) =>
                    setDiscounts({
                      ...discounts,
                      loyaltyDiscount: {
                        ...discounts.loyaltyDiscount,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4"
                />
                <label htmlFor="loyalty-enabled" className="text-sm text-ink-muted">
                  Enable Loyalty Discount
                </label>
              </div>
              <div className="space-y-2">
                {discounts.loyaltyDiscount.thresholds.map((threshold, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-ink-muted">
                      {threshold.minBookings}+ bookings:
                    </span>
                    <span className="font-medium text-purple-600">{threshold.discount}% off</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleUpdateDiscounts}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 text-on-lumen rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Discount Configuration'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Service Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Add/Update Service Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Service Category
                </label>
                <select
                  value={newServiceRate.serviceCategory}
                  onChange={(e) =>
                    setNewServiceRate({ ...newServiceRate, serviceCategory: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="carpentry">Carpentry</option>
                  <option value="masonry">Masonry</option>
                  <option value="painting">Painting</option>
                  <option value="hvac">HVAC</option>
                  <option value="welding">Welding</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Service Type
                </label>
                <input
                  type="text"
                  value={newServiceRate.serviceType}
                  onChange={(e) => setNewServiceRate({ ...newServiceRate, serviceType: e.target.value })}
                  placeholder="e.g., Pipe Repair"
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Base Price (KES)
                </label>
                <input
                  type="number"
                  value={newServiceRate.basePrice}
                  onChange={(e) =>
                    setNewServiceRate({ ...newServiceRate, basePrice: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  Price Unit
                </label>
                <select
                  value={newServiceRate.priceUnit}
                  onChange={(e) => setNewServiceRate({ ...newServiceRate, priceUnit: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
                >
                  <option value="fixed">Fixed</option>
                  <option value="per_hour">Per Hour</option>
                  <option value="per_sqm">Per Square Meter</option>
                  <option value="per_unit">Per Unit</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleAddServiceRate}
              disabled={isSaving || !newServiceRate.serviceType || newServiceRate.basePrice <= 0}
              className="px-4 py-2 bg-purple-600 text-on-lumen rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Add/Update Service Rate'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Current Service Rates Display */}
      {pricingConfig?.servicePrices && pricingConfig.servicePrices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Service Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-200/50 border-b border-line">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase">
                      Category
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase">
                      Service Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase">
                      Base Price
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase">
                      Unit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pricingConfig.servicePrices
                    .filter((sp: any) => sp.isActive)
                    .map((servicePrice: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-ink">
                          {servicePrice.serviceCategory}
                        </td>
                        <td className="px-4 py-2 text-sm text-ink">
                          {servicePrice.serviceType}
                        </td>
                        <td className="px-4 py-2 text-sm text-ink">
                          KES {servicePrice.basePrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-ink-muted">
                          {servicePrice.priceUnit.replace('_', ' ')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SystemSettings;
