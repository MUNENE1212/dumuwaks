/**
 * EscrowManagementPanel Component
 *
 * Admin interface for managing escrow accounts including:
 * - List of all escrows with filtering
 * - Status tabs (pending, funded, disputed, released, refunded)
 * - Bulk actions and individual escrow details
 * - Manual release/refund capabilities
 * - Dispute resolution interface
 *
 * @module components/admin/EscrowManagementPanel
 */

import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  getEscrows,
  getEscrowStats,
  releaseEscrow,
  refundEscrow,
  bulkReleaseEscrows,
  exportEscrows,
} from '@/services/admin.service';
import type { EscrowRecord, EscrowStats, EscrowStatus } from '@/types/admin';
import Button from '@/components/ui/Button';

/**
 * Status tab configuration
 */
interface StatusTab {
  value: EscrowStatus | 'all';
  label: string;
  color: string;
}

const statusTabs: StatusTab[] = [
  { value: 'all', label: 'All', color: 'bg-charcoal' },
  { value: 'pending', label: 'Pending', color: 'bg-warning/20 text-warning' },
  { value: 'funded', label: 'Funded', color: 'bg-lumen/20 text-lumen-ink' },
  { value: 'held', label: 'Held', color: 'bg-wrench/20 text-wrench' },
  { value: 'disputed', label: 'Disputed', color: 'bg-error/20 text-error' },
  { value: 'released', label: 'Released', color: 'bg-success/20 text-success' },
  { value: 'refunded', label: 'Refunded', color: 'bg-steel/20 text-steel' },
];

/**
 * Format KES currency
 */
const formatKES = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};

/**
 * Format date
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Escrow detail modal props
 */
interface EscrowDetailModalProps {
  escrow: EscrowRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onRelease: (id: string, notes?: string) => Promise<void>;
  onRefund: (id: string, reason: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Escrow Detail Modal Component
 */
const EscrowDetailModal: React.FC<EscrowDetailModalProps> = ({
  escrow,
  isOpen,
  onClose,
  onRelease,
  onRefund,
  isLoading,
}) => {
  const [action, setAction] = useState<'none' | 'release' | 'refund'>('none');
  const [notes, setNotes] = useState('');
  const [refundReason, setRefundReason] = useState('');

  if (!isOpen || !escrow) return null;

  const handleRelease = async () => {
    await onRelease(escrow._id, notes);
    setAction('none');
    setNotes('');
    onClose();
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) return;
    await onRefund(escrow._id, refundReason);
    setAction('none');
    setRefundReason('');
    onClose();
  };

  const canRelease = ['funded', 'held'].includes(escrow.status);
  const canRefund = ['funded', 'held', 'disputed'].includes(escrow.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay-medium">
      <div className="glass-modal rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-line">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-bone">Escrow Details</h2>
              <p className="text-sm text-steel mt-1">
                Booking #{escrow.bookingNumber}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-300 text-steel hover:text-bone transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount Section */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card rounded-lg p-4">
              <p className="text-xs text-steel">Total Amount</p>
              <p className="text-xl font-bold text-bone">{formatKES(escrow.amount)}</p>
            </div>
            <div className="glass-card rounded-lg p-4">
              <p className="text-xs text-steel">Platform Fee</p>
              <p className="text-xl font-bold text-lumen-ink">{formatKES(escrow.platformFee)}</p>
            </div>
            <div className="glass-card rounded-lg p-4">
              <p className="text-xs text-steel">Technician Receives</p>
              <p className="text-xl font-bold text-success">{formatKES(escrow.technicianAmount)}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-steel">Status:</span>
            <span
              className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium capitalize',
                statusTabs.find((t) => t.value === escrow.status)?.color
              )}
            >
              {escrow.status}
            </span>
          </div>

          {/* Service Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-bone">Service Information</h3>
            <div className="glass-card rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-steel">Category:</span>
                <span className="text-bone capitalize">{escrow.serviceCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel">Service Type:</span>
                <span className="text-bone">{escrow.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel">Created:</span>
                <span className="text-bone">{formatDate(escrow.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-bone">Customer</h3>
            <div className="glass-card rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-steel">Name:</span>
                <span className="text-bone">{escrow.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel">Phone:</span>
                <span className="text-bone">{escrow.customerPhone}</span>
              </div>
            </div>
          </div>

          {/* Technician Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-bone">Technician</h3>
            <div className="glass-card rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-steel">Name:</span>
                <span className="text-bone">{escrow.technicianName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel">Phone:</span>
                <span className="text-bone">{escrow.technicianPhone}</span>
              </div>
            </div>
          </div>

          {/* Dispute Reason (if applicable) */}
          {escrow.disputeReason && (
            <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
              <h3 className="text-sm font-semibold text-error">Dispute Reason</h3>
              <p className="text-sm text-steel mt-1">{escrow.disputeReason}</p>
            </div>
          )}

          {/* Action Section */}
          {action === 'none' && (canRelease || canRefund) && (
            <div className="flex gap-3 pt-4 border-t border-line">
              {canRelease && (
                <Button
                  variant="primary"
                  onClick={() => setAction('release')}
                  disabled={isLoading}
                >
                  Release to Technician
                </Button>
              )}
              {canRefund && (
                <Button
                  variant="danger"
                  onClick={() => setAction('refund')}
                  disabled={isLoading}
                >
                  Refund to Customer
                </Button>
              )}
            </div>
          )}

          {/* Release Form */}
          {action === 'release' && (
            <div className="space-y-4 pt-4 border-t border-line">
              <h3 className="text-sm font-semibold text-bone">Release Escrow</h3>
              <div>
                <label className="block text-sm text-steel mb-2">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-charcoal border border-line rounded-lg text-bone focus:border-lumen focus:outline-none"
                  rows={3}
                  placeholder="Add any notes about this release..."
                />
              </div>
              <div className="flex gap-3">
                <Button variant="primary" onClick={handleRelease} disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Confirm Release'}
                </Button>
                <Button variant="ghost" onClick={() => setAction('none')} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Refund Form */}
          {action === 'refund' && (
            <div className="space-y-4 pt-4 border-t border-line">
              <h3 className="text-sm font-semibold text-bone">Refund Escrow</h3>
              <div>
                <label className="block text-sm text-steel mb-2">Refund Reason *</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-4 py-2 bg-charcoal border border-line rounded-lg text-bone focus:border-lumen focus:outline-none"
                  rows={3}
                  placeholder="Explain why you're refunding this escrow..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleRefund}
                  disabled={isLoading || !refundReason.trim()}
                >
                  {isLoading ? 'Processing...' : 'Confirm Refund'}
                </Button>
                <Button variant="ghost" onClick={() => setAction('none')} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Main EscrowManagementPanel Component
 */
const EscrowManagementPanel: React.FC = () => {
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [stats, setStats] = useState<EscrowStats | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<EscrowStatus | 'all'>('all');
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Fetch escrows data
   */
  const fetchEscrows = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [escrowData, statsData] = await Promise.all([
        getEscrows({
          status: selectedStatus === 'all' ? undefined : selectedStatus,
          page,
          limit: 10,
          search: searchQuery || undefined,
        }),
        getEscrowStats(),
      ]);

      setEscrows(escrowData.escrows);
      setTotalPages(escrowData.pagination.pages);
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load escrows';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, page, searchQuery]);

  useEffect(() => {
    fetchEscrows();
  }, [fetchEscrows]);

  /**
   * Handle release escrow
   */
  const handleRelease = async (escrowId: string, notes?: string) => {
    try {
      setActionLoading(true);
      await releaseEscrow(escrowId, notes);
      await fetchEscrows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release escrow');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle refund escrow
   */
  const handleRefund = async (escrowId: string, reason: string) => {
    try {
      setActionLoading(true);
      await refundEscrow(escrowId, reason);
      await fetchEscrows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refund escrow');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle bulk release
   */
  const handleBulkRelease = async () => {
    if (selectedIds.size === 0) return;

    try {
      setActionLoading(true);
      const result = await bulkReleaseEscrows(Array.from(selectedIds));
      if (result.success) {
        setSelectedIds(new Set());
        await fetchEscrows();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk release escrows');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle export
   */
  const handleExport = async () => {
    try {
      const blob = await exportEscrows({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `escrows-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export escrows');
    }
  };

  /**
   * Toggle selection
   */
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  /**
   * Toggle all selection
   */
  const toggleAllSelection = () => {
    if (selectedIds.size === escrows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(escrows.map((e) => e._id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bone">Escrow Management</h1>
          <p className="text-steel text-sm mt-1">
            Manage escrow accounts, release funds, and handle disputes
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport} disabled={isLoading}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-card rounded-lg p-4">
            <p className="text-xs text-steel">Total Active</p>
            <p className="text-xl font-bold text-bone">{stats.totalActive}</p>
          </div>
          <div className="glass-card rounded-lg p-4">
            <p className="text-xs text-steel">Total Held</p>
            <p className="text-xl font-bold text-wrench">{stats.totalHeld}</p>
          </div>
          <div className="glass-card rounded-lg p-4">
            <p className="text-xs text-steel">Disputed</p>
            <p className="text-xl font-bold text-error">{stats.totalDisputed}</p>
          </div>
          <div className="glass-card rounded-lg p-4">
            <p className="text-xs text-steel">Pending Release</p>
            <p className="text-xl font-bold text-warning">{stats.pendingRelease}</p>
          </div>
          <div className="glass-card rounded-lg p-4">
            <p className="text-xs text-steel">Total Value</p>
            <p className="text-xl font-bold text-success">{formatKES(stats.totalValue)}</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setSelectedStatus(tab.value);
              setPage(1);
            }}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              selectedStatus === tab.value
                ? 'bg-lumen text-on-lumen shadow-led'
                : 'bg-charcoal text-steel hover:text-bone hover:bg-surface-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-steel"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search by booking number, customer, or technician..."
          className="w-full pl-10 pr-4 py-2 bg-charcoal border border-line rounded-lg text-bone placeholder:text-steel/50 focus:border-lumen focus:outline-none"
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-lumen/10 border border-lumen/30 rounded-lg">
          <span className="text-sm text-lumen-ink">
            {selectedIds.size} escrow(s) selected
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={handleBulkRelease}
            disabled={actionLoading}
          >
            Release Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Escrows Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === escrows.length && escrows.length > 0}
                    onChange={toggleAllSelection}
                    className="rounded border-steel text-lumen-ink focus:ring-lumen"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Booking
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Technician
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-steel uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-line animate-pulse">
                    <td className="px-4 py-4">
                      <div className="w-4 h-4 bg-surface-300 rounded" />
                    </td>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-surface-300 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : escrows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-steel">No escrows found</p>
                  </td>
                </tr>
              ) : (
                escrows.map((escrow) => (
                  <tr
                    key={escrow._id}
                    className="border-b border-line hover:bg-surface-300/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(escrow._id)}
                        onChange={() => toggleSelection(escrow._id)}
                        className="rounded border-steel text-lumen-ink focus:ring-lumen"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-bone">{escrow.bookingNumber}</p>
                        <p className="text-xs text-steel">{escrow.serviceType}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-bone">{escrow.customerName}</p>
                        <p className="text-xs text-steel">{escrow.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-bone">{escrow.technicianName}</p>
                        <p className="text-xs text-steel">{escrow.technicianPhone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-bone">{formatKES(escrow.amount)}</p>
                        <p className="text-xs text-steel">Fee: {formatKES(escrow.platformFee)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium capitalize',
                          statusTabs.find((t) => t.value === escrow.status)?.color
                        )}
                      >
                        {escrow.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-steel">
                      {formatDate(escrow.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEscrow(escrow)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm text-steel">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <EscrowDetailModal
        escrow={selectedEscrow}
        isOpen={!!selectedEscrow}
        onClose={() => setSelectedEscrow(null)}
        onRelease={handleRelease}
        onRefund={handleRefund}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default EscrowManagementPanel;
