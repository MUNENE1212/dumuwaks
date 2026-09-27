/**
 * EscrowManagement Component
 *
 * Main escrow management interface with:
 * - List of escrows with filters
 * - Status tabs (pending, funded, released, disputed)
 * - Expandable details
 * - Action buttons based on user role
 *
 * @module components/escrow/EscrowManagement
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clsx } from 'clsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { EscrowStatusCard } from './EscrowStatusCard';
import {
  fetchMyEscrows,
  fetchAllEscrows,
  releaseEscrow,
  refundEscrow,
  openDispute,
  clearCurrentEscrow,
  setFilters,
  selectEscrow
} from '@/store/slices/escrowSlice';
import type { RootState, AppDispatch } from '@/store';
import type {
  Escrow,
  EscrowStatus,
  EscrowFilters
} from '@/types/escrow';
import { ESCROW_STATUS_LABELS } from '@/types/escrow';
import { formatKES } from '@/services/escrow.service';

interface EscrowManagementProps {
  /** Admin mode - shows all escrows */
  adminMode?: boolean;
  /** Booking ID to filter by */
  bookingId?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Status Tab Configuration
 */
const STATUS_TABS: Array<{ status: EscrowStatus | 'all'; label: string; countKey?: string }> = [
  { status: 'all', label: 'All' },
  { status: 'pending', label: 'Pending' },
  { status: 'funded', label: 'Funded' },
  { status: 'partial_release', label: 'Partial' },
  { status: 'released', label: 'Released' },
  { status: 'disputed', label: 'Disputed' },
  { status: 'refunded', label: 'Refunded' }
];

/**
 * EscrowManagement Component
 */
export const EscrowManagement: React.FC<EscrowManagementProps> = ({
  adminMode = false,
  bookingId,
  className
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    escrows,
    isLoading,
    isUpdating,
    pagination,
    filters
  } = useSelector((state: RootState) => state.escrow);
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<EscrowStatus | 'all'>('all');
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Fetch escrows on mount and when filters change
  useEffect(() => {
    const fetchFilters: EscrowFilters = {
      ...filters,
      status: activeTab === 'all' ? undefined : activeTab
    };

    if (adminMode) {
      dispatch(fetchAllEscrows(fetchFilters));
    } else {
      dispatch(fetchMyEscrows(fetchFilters));
    }
  }, [dispatch, adminMode, activeTab, filters]);

  // Handle tab change
  const handleTabChange = (status: EscrowStatus | 'all') => {
    setActiveTab(status);
    setSelectedEscrow(null);
    dispatch(setFilters({ ...filters, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    dispatch(setFilters({ ...filters, page }));
  };

  // Handle escrow selection
  const handleSelectEscrow = (escrow: Escrow) => {
    setSelectedEscrow(selectedEscrow?._id === escrow._id ? null : escrow);
  };

  // Handle release
  const handleRelease = useCallback(async () => {
    if (!selectedEscrow) return;

    try {
      await dispatch(releaseEscrow({
        escrowId: selectedEscrow._id,
        data: { notes: 'Released by user' }
      })).unwrap();
      setShowReleaseModal(false);
      setSelectedEscrow(null);
    } catch (error) {
      console.error('Release error:', error);
    }
  }, [dispatch, selectedEscrow]);

  // Handle refund
  const handleRefund = useCallback(async (reason: string, amount?: number) => {
    if (!selectedEscrow) return;

    try {
      await dispatch(refundEscrow({
        escrowId: selectedEscrow._id,
        data: { reason, amount }
      })).unwrap();
      setShowRefundModal(false);
      setSelectedEscrow(null);
    } catch (error) {
      console.error('Refund error:', error);
    }
  }, [dispatch, selectedEscrow]);

  // Handle dispute
  const handleDispute = useCallback(async (reason: string, description?: string) => {
    if (!selectedEscrow) return;

    try {
      await dispatch(openDispute({
        escrowId: selectedEscrow._id,
        data: { reason, description }
      })).unwrap();
      setShowDisputeModal(false);
      setSelectedEscrow(null);
    } catch (error) {
      console.error('Dispute error:', error);
    }
  }, [dispatch, selectedEscrow]);

  // Get user role
  const userRole = user?.role || 'customer';

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink dark:text-ink">
            {adminMode ? 'Escrow Management' : 'My Escrows'}
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            {adminMode
              ? 'Manage all platform escrows'
              : 'View and manage your payment escrows'}
          </p>
        </div>

        {/* Stats Summary */}
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-ink dark:text-ink">
              {pagination.total}
            </p>
            <p className="text-xs text-ink-muted">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {escrows.filter(e => e.status === 'released').length}
            </p>
            <p className="text-xs text-ink-muted">Released</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {escrows.filter(e => e.status === 'funded').length}
            </p>
            <p className="text-xs text-ink-muted">Pending</p>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="border-b border-line">
        <nav className="flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.status;
            return (
              <button
                key={tab.status}
                onClick={() => handleTabChange(tab.status)}
                className={clsx(
                  'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  isActive
                    ? 'border-lumen text-lumen-ink'
                    : 'border-transparent hover:border-line-strong text-ink-muted hover:text-ink-muted'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumen"></div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && escrows.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-ink-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-ink dark:text-ink">
              No escrows found
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              {activeTab === 'all'
                ? 'No escrows available.'
                : `No ${ESCROW_STATUS_LABELS[activeTab as EscrowStatus]} escrows.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Escrows List */}
      {!isLoading && escrows.length > 0 && (
        <div className="space-y-4">
          {escrows.map((escrow) => (
            <div key={escrow._id}>
              {/* Escrow Summary Row */}
              <button
                onClick={() => handleSelectEscrow(escrow)}
                className={clsx(
                  'w-full text-left rounded-lg border transition-all duration-200 p-4',
                  selectedEscrow?._id === escrow._id
                    ? 'border-lumen bg-lumen/10'
                    : 'border-line hover:border-line-strong bg-surface-200 bg-charcoal'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <StatusBadge status={escrow.status} />
                    <div>
                      <p className="font-medium text-ink dark:text-ink">
                        {formatKES(escrow.totalAmount)}
                      </p>
                      <p className="text-sm text-ink-muted">
                        Created {new Date(escrow.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-ink-muted">
                        Technician gets
                      </p>
                      <p className="font-semibold text-green-400">
                        {formatKES(escrow.technicianPayout)}
                      </p>
                    </div>
                    <svg
                      className={clsx(
                        'h-5 w-5 text-ink-muted transition-transform duration-200',
                        selectedEscrow?._id === escrow._id && 'rotate-180'
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {selectedEscrow?._id === escrow._id && (
                <div className="mt-2">
                  <EscrowStatusCard
                    escrow={escrow}
                    userRole={userRole as 'customer' | 'technician' | 'admin' | 'support'}
                    onRelease={() => setShowReleaseModal(true)}
                    onRefund={() => setShowRefundModal(true)}
                    onDispute={() => setShowDisputeModal(true)}
                    isUpdating={isUpdating}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>

          <span className="text-sm text-ink-muted">
            Page {pagination.page} of {pagination.pages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Release Confirmation Modal */}
      {showReleaseModal && selectedEscrow && (
        <ConfirmationModal
          title="Release Funds"
          message={`Are you sure you want to release ${formatKES(selectedEscrow.technicianPayout)} to the technician?`}
          confirmLabel="Release"
          variant="primary"
          onConfirm={handleRelease}
          onCancel={() => setShowReleaseModal(false)}
          isLoading={isUpdating}
        />
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedEscrow && (
        <RefundModal
          escrow={selectedEscrow}
          onConfirm={handleRefund}
          onCancel={() => setShowRefundModal(false)}
          isLoading={isUpdating}
        />
      )}

      {/* Dispute Modal */}
      {showDisputeModal && selectedEscrow && (
        <DisputeModal
          escrow={selectedEscrow}
          onConfirm={handleDispute}
          onCancel={() => setShowDisputeModal(false)}
          isLoading={isUpdating}
        />
      )}
    </div>
  );
};

/**
 * Status Badge Component
 */
const StatusBadge: React.FC<{ status: EscrowStatus }> = ({ status }) => {
  const colorClasses = {
    pending: 'bg-yellow-900/30 text-yellow-400',
    funded: 'bg-blue-900/30 text-blue-400',
    partial_release: 'bg-indigo-900/30 text-indigo-400',
    released: 'bg-green-900/30 text-green-400',
    refunded: 'bg-purple-900/30 text-purple-400',
    disputed: 'bg-red-900/30 text-red-400',
    cancelled: 'bg-surface-300 text-ink-muted'
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClasses[status]
      )}
    >
      {ESCROW_STATUS_LABELS[status]}
    </span>
  );
};

/**
 * Confirmation Modal Component
 */
const ConfirmationModal: React.FC<{
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ title, message, confirmLabel, variant, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-000/50">
    <div className="bg-surface-200 dark:bg-charcoal rounded-lg p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold text-ink dark:text-ink mb-2">{title}</h3>
      <p className="text-ink-muted mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant={variant} onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </div>
);

/**
 * Refund Modal Component
 */
const RefundModal: React.FC<{
  escrow: Escrow;
  onConfirm: (reason: string, amount?: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ escrow, onConfirm, onCancel, isLoading }) => {
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<string>(escrow.totalAmount.toString());

  const handleSubmit = () => {
    onConfirm(reason, parseFloat(amount));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-000/50">
      <div className="bg-surface-200 dark:bg-charcoal rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-ink dark:text-ink mb-4">Refund Escrow</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">
              Refund Amount (KES)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-surface-200 border-line-strong"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-surface-200 border-line-strong"
              placeholder="Enter refund reason..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!reason.trim()}
          >
            Process Refund
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Dispute Modal Component
 */
const DisputeModal: React.FC<{
  escrow: Escrow;
  onConfirm: (reason: string, description?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ escrow, onConfirm, onCancel, isLoading }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    onConfirm(reason, description);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-000/50">
      <div className="bg-surface-200 dark:bg-charcoal rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-ink dark:text-ink mb-4">Open Dispute</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-surface-200 border-line-strong"
              placeholder="Brief reason for dispute..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg bg-surface-200 border-line-strong"
              placeholder="Provide detailed description of the issue..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!reason.trim()}
          >
            Submit Dispute
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EscrowManagement;
