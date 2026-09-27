import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import type { AppDispatch } from '@/store/index';
import type { Service } from '@/types/service';
import type {
  TechnicianService,
  PricingData,
  TechnicianServiceUpdateInput,
} from '@/types/technicianService';
import {
  fetchMyTechnicianServices,
  addTechnicianService,
  updateTechnicianService,
  removeTechnicianService,
  toggleServiceAvailability,
  selectTechnicianServices,
  selectTechnicianServicesLoading,
  selectTechnicianServicesError,
  selectTechnicianServicesActionLoading,
  selectExcludedServiceIds,
  clearError,
} from '@/store/slices/technicianServicesSlice';
import { getEffectivePriceRange, formatPrice } from '@/services/technicianService.service';
import Button from '@/components/ui/Button';
import ServiceSelectorModal from './ServiceSelectorModal';
import ServicePricingForm from './ServicePricingForm';

/**
 * Props for MyServicesManager component
 */
interface MyServicesManagerProps {
  technicianId?: string;
  readOnly?: boolean;
}

/**
 * MyServicesManager Component
 * Main component for managing technician's services from the WORD BANK
 * - Lists services the technician currently offers
 * - Add/Edit/Remove functionality
 * - Pricing display with KES currency
 */
const MyServicesManager: React.FC<MyServicesManagerProps> = ({
  technicianId,
  readOnly = false,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const services = useSelector(selectTechnicianServices);
  const loading = useSelector(selectTechnicianServicesLoading);
  const error = useSelector(selectTechnicianServicesError);
  const actionLoading = useSelector(selectTechnicianServicesActionLoading);
  const excludedServiceIds = useSelector(selectExcludedServiceIds);

  // Local state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<TechnicianService | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch services on mount
  useEffect(() => {
    dispatch(fetchMyTechnicianServices());
  }, [dispatch]);

  // Clear error on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Handle adding new service
  const handleAddService = useCallback(
    async (service: Service, pricing: PricingData) => {
      const result = await dispatch(
        addTechnicianService({
          serviceId: service._id,
          categoryId: service.categoryId,
          pricing,
        })
      );

      if (addTechnicianService.fulfilled.match(result)) {
        setShowAddModal(false);
      }
    },
    [dispatch]
  );

  // Handle updating service
  const handleUpdateService = useCallback(
    async (pricing: PricingData) => {
      if (!editingService) return;

      const updateData: TechnicianServiceUpdateInput = {
        pricing,
        description: pricing.description,
      };

      const result = await dispatch(
        updateTechnicianService({ id: editingService._id, data: updateData })
      );

      if (updateTechnicianService.fulfilled.match(result)) {
        setEditingService(null);
      }
    },
    [dispatch, editingService]
  );

  // Handle deleting service
  const handleDeleteService = useCallback(async () => {
    if (!deletingServiceId) return;

    const result = await dispatch(removeTechnicianService(deletingServiceId));

    if (removeTechnicianService.fulfilled.match(result)) {
      setDeletingServiceId(null);
      setShowDeleteConfirm(false);
    }
  }, [dispatch, deletingServiceId]);

  // Handle toggling availability
  const handleToggleAvailability = useCallback(
    async (service: TechnicianService) => {
      await dispatch(
        toggleServiceAvailability({
          id: service._id,
          isActive: !service.availability.isActive,
        })
      );
    },
    [dispatch]
  );

  // Confirm delete
  const confirmDelete = useCallback((serviceId: string) => {
    setDeletingServiceId(serviceId);
    setShowDeleteConfirm(true);
  }, []);

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setDeletingServiceId(null);
    setShowDeleteConfirm(false);
  }, []);

  // Render loading state
  if (loading && services.length === 0) {
    return (
      <div className="py-8" data-testid="my-services-loading">
        <div className="flex items-center justify-center">
          <svg
            className="animate-spin h-8 w-8 text-lumen-ink"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="ml-3 text-steel">Loading your services...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" data-testid="my-services-manager">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-bone">My Services</h3>
          <p className="text-sm text-steel mt-1">
            Manage services you offer from the WORD BANK
          </p>
        </div>
        {!readOnly && (
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            disabled={actionLoading}
            data-testid="add-service-btn"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Service
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-error/10 border border-error/30">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-error font-medium">Error</p>
              <p className="text-sm text-error/80 mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(clearError())}
              className="text-error hover:text-error/80"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Services List */}
      {services.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-line rounded-lg" data-testid="empty-services">
          <svg className="w-12 h-12 text-steel mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h4 className="text-bone font-medium mb-2">No Services Added Yet</h4>
          <p className="text-sm text-steel mb-4">
            Add services from the WORD BANK so customers can find you
          </p>
          {!readOnly && (
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              Add Your First Service
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4" data-testid="services-list">
          {services.map((techService) => (
            <div
              key={techService._id}
              className={clsx(
                'p-4 rounded-lg border transition-all duration-200',
                techService.availability.isActive
                  ? 'bg-charcoal border-line'
                  : 'bg-charcoal/50 border-line opacity-75'
              )}
              data-testid={`service-item-${techService._id}`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Service Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-bone font-medium uppercase truncate">
                      {typeof techService.service === 'object'
                        ? techService.service.name
                        : 'Unknown Service'}
                    </h4>
                    {!techService.availability.isActive && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-steel/20 text-steel">
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Category */}
                  {typeof techService.category === 'object' && (
                    <p className="text-sm text-steel mt-1">
                      {techService.category.name}
                    </p>
                  )}

                  {/* Price */}
                  <p className="text-lumen-ink font-medium mt-2">
                    {getEffectivePriceRange(techService)}
                  </p>

                  {/* Description */}
                  {techService.description && (
                    <p className="text-sm text-steel mt-2 line-clamp-2">
                      {techService.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-steel">
                    {techService.stats.jobsCompleted > 0 && (
                      <span>{techService.stats.jobsCompleted} jobs completed</span>
                    )}
                    {techService.rating.count > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {techService.rating.average.toFixed(1)} ({techService.rating.count})
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!readOnly && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Toggle Availability */}
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(techService)}
                      disabled={actionLoading}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        techService.availability.isActive
                          ? 'text-success hover:bg-success/10'
                          : 'text-steel hover:bg-steel/10'
                      )}
                      title={techService.availability.isActive ? 'Deactivate' : 'Activate'}
                      data-testid={`toggle-availability-${techService._id}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {techService.availability.isActive ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        )}
                      </svg>
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => setEditingService(techService)}
                      disabled={actionLoading}
                      className="p-2 rounded-lg text-steel hover:bg-steel/10 transition-colors"
                      title="Edit pricing"
                      data-testid={`edit-service-${techService._id}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => confirmDelete(techService._id)}
                      disabled={actionLoading}
                      className="p-2 rounded-lg text-error hover:bg-error/10 transition-colors"
                      title="Remove service"
                      data-testid={`delete-service-${techService._id}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      <ServiceSelectorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSelect={handleAddService}
        excludeServiceIds={excludedServiceIds}
      />

      {/* Edit Service Modal */}
      {editingService && typeof editingService.service === 'object' && (
        <div
          className="fixed inset-0 z-[var(--dw-z-modal-backdrop)] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          data-testid="edit-service-modal"
        >
          <div
            className="absolute inset-0 bg-surface-000/70"
            onClick={() => setEditingService(null)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-charcoal rounded-xl shadow-2xl border border-line flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <h2 className="text-xl font-bold text-bone">Edit Service Pricing</h2>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
              >
                <svg className="w-5 h-5 text-steel" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <ServicePricingForm
                service={editingService.service}
                onSubmit={handleUpdateService}
                onCancel={() => setEditingService(null)}
                initialValues={{
                  pricingType: 'fixed', // Default, should be derived from actual data
                  description: editingService.description,
                }}
                isEditing
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[var(--dw-z-modal-backdrop)] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          data-testid="delete-confirm-modal"
        >
          <div
            className="absolute inset-0 bg-surface-000/70"
            onClick={cancelDelete}
          />
          <div className="relative w-full max-w-md bg-charcoal rounded-xl shadow-2xl border border-line p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-bone mb-2">Remove Service?</h3>
              <p className="text-sm text-steel mb-6">
                Are you sure you want to remove this service? Customers will no longer be able to find you for this service.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="ghost" onClick={cancelDelete}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteService}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Removing...' : 'Remove Service'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyServicesManager;
