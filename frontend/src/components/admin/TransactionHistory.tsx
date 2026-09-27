/**
 * TransactionHistory Component
 *
 * Admin interface for viewing and managing transactions including:
 * - Transaction list with date range and type filters
 * - Status filtering and search functionality
 * - Export to CSV capability
 * - Transaction details modal
 * - M-Pesa receipt lookup
 *
 * @module components/admin/TransactionHistory
 */

import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  getTransactions,
  getTransactionById,
  lookupMpesaReceipt,
  exportTransactions,
} from '@/services/admin.service';
import type { TransactionRecord, TransactionFilter, TransactionType, TransactionStatus } from '@/types/admin';
import Button from '@/components/ui/Button';

/**
 * Transaction type options
 */
const transactionTypes: { value: TransactionType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'payment', label: 'Payment' },
  { value: 'payout', label: 'Payout' },
  { value: 'refund', label: 'Refund' },
  { value: 'platform_fee', label: 'Platform Fee' },
  { value: 'booking_fee', label: 'Booking Fee' },
];

/**
 * Transaction status options
 */
const transactionStatuses: { value: TransactionStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
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
 * Get status color class
 */
const getStatusColor = (status: TransactionStatus): string => {
  const colors: Record<TransactionStatus, string> = {
    completed: 'bg-success/20 text-success',
    pending: 'bg-warning/20 text-warning',
    processing: 'bg-lumen/20 text-lumen-ink',
    failed: 'bg-error/20 text-error',
    cancelled: 'bg-steel/20 text-steel',
  };
  return colors[status];
};

/**
 * Get type icon
 */
const getTypeIcon = (type: TransactionType): React.ReactNode => {
  const icons: Record<TransactionType, React.ReactNode> = {
    payment: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    payout: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    refund: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
    platform_fee: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    booking_fee: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  };
  return icons[type];
};

/**
 * Transaction detail modal props
 */
interface TransactionDetailModalProps {
  transaction: TransactionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onLookupMpesa: (transactionId: string) => Promise<void>;
  mpesaData: Record<string, unknown> | null;
  isLoading: boolean;
}

/**
 * Transaction Detail Modal Component
 */
const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onLookupMpesa,
  mpesaData,
  isLoading,
}) => {
  const [lookingUp, setLookingUp] = useState(false);

  if (!isOpen || !transaction) return null;

  const handleMpesaLookup = async () => {
    setLookingUp(true);
    await onLookupMpesa(transaction._id);
    setLookingUp(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay-medium">
      <div className="glass-modal rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-line">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-bone">Transaction Details</h2>
              <p className="text-sm text-steel mt-1">
                ID: {transaction.transactionId}
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
          {/* Amount */}
          <div className="text-center">
            <p className="text-sm text-steel">Amount</p>
            <p className="text-3xl font-bold text-bone">{formatKES(transaction.amount)}</p>
            <span className={clsx(
              'inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium capitalize',
              getStatusColor(transaction.status)
            )}>
              {transaction.status}
            </span>
          </div>

          {/* Transaction Info */}
          <div className="glass-card rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-steel">Type:</span>
              <span className="text-bone capitalize flex items-center gap-2">
                {getTypeIcon(transaction.type)}
                {transaction.type.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-steel">Payment Method:</span>
              <span className="text-bone capitalize">{transaction.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-steel">Created:</span>
              <span className="text-bone">{formatDate(transaction.createdAt)}</span>
            </div>
            {transaction.processedAt && (
              <div className="flex justify-between">
                <span className="text-steel">Processed:</span>
                <span className="text-bone">{formatDate(transaction.processedAt)}</span>
              </div>
            )}
            {transaction.description && (
              <div className="pt-2 border-t border-line">
                <p className="text-sm text-steel">{transaction.description}</p>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="glass-card rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-bone">User Information</h3>
            <div className="flex justify-between">
              <span className="text-steel">Name:</span>
              <span className="text-bone">{transaction.userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-steel">Type:</span>
              <span className="text-bone capitalize">{transaction.userType}</span>
            </div>
          </div>

          {/* Booking Info */}
          {transaction.bookingNumber && (
            <div className="glass-card rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-bone">Booking Information</h3>
              <div className="flex justify-between">
                <span className="text-steel">Booking #:</span>
                <span className="text-bone">{transaction.bookingNumber}</span>
              </div>
            </div>
          )}

          {/* M-Pesa Info */}
          {transaction.paymentMethod === 'mpesa' && (
            <div className="glass-card rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-bone">M-Pesa Details</h3>
              {transaction.mpesaReceipt && (
                <div className="flex justify-between">
                  <span className="text-steel">Receipt:</span>
                  <span className="text-bone">{transaction.mpesaReceipt}</span>
                </div>
              )}
              {transaction.mpesaReference && (
                <div className="flex justify-between">
                  <span className="text-steel">Reference:</span>
                  <span className="text-bone">{transaction.mpesaReference}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleMpesaLookup}
                disabled={lookingUp}
              >
                {lookingUp ? 'Looking up...' : 'Lookup M-Pesa Receipt'}
              </Button>
              {mpesaData && (
                <div className="mt-3 p-3 bg-charcoal rounded-lg">
                  <pre className="text-xs text-steel overflow-auto">
                    {JSON.stringify(mpesaData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Failure Reason */}
          {transaction.failureReason && (
            <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
              <h3 className="text-sm font-semibold text-error">Failure Reason</h3>
              <p className="text-sm text-steel mt-1">{transaction.failureReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Main TransactionHistory Component
 */
const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<TransactionFilter>({
    startDate: '',
    endDate: '',
    type: undefined,
    status: undefined,
    search: '',
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);
  const [mpesaData, setMpesaData] = useState<Record<string, unknown> | null>(null);

  /**
   * Fetch transactions
   */
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getTransactions({
        ...filters,
        page,
        limit: 15,
        type: filters.type || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        search: filters.search || undefined,
      });

      setTransactions(data.transactions);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  /**
   * Handle M-Pesa lookup
   */
  const handleMpesaLookup = async (transactionId: string) => {
    try {
      const data = await lookupMpesaReceipt(transactionId);
      setMpesaData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup M-Pesa receipt');
    }
  };

  /**
   * Handle export
   */
  const handleExport = async () => {
    try {
      const blob = await exportTransactions({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export transactions');
    }
  };

  /**
   * Update filter
   */
  const updateFilter = (key: keyof TransactionFilter, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  /**
   * Clear filters
   */
  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: undefined,
      status: undefined,
      search: '',
    });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bone">Transaction History</h1>
          <p className="text-steel text-sm mt-1">
            View and manage all platform transactions
          </p>
        </div>
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

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs text-steel mb-1">Search</label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel"
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
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-9 pr-4 py-2 bg-charcoal border border-line rounded-lg text-bone text-sm placeholder:text-steel/50 focus:border-lumen focus:outline-none"
              />
            </div>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-xs text-steel mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              className="w-full px-3 py-2 bg-charcoal border border-line rounded-lg text-bone text-sm focus:border-lumen focus:outline-none"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs text-steel mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              className="w-full px-3 py-2 bg-charcoal border border-line rounded-lg text-bone text-sm focus:border-lumen focus:outline-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-steel mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="w-full px-3 py-2 bg-charcoal border border-line rounded-lg text-bone text-sm focus:border-lumen focus:outline-none"
            >
              {transactionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-steel mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full px-3 py-2 bg-charcoal border border-line rounded-lg text-bone text-sm focus:border-lumen focus:outline-none"
            >
              {transactionStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Transaction
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-steel uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-steel uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-line animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-surface-300 rounded w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-steel">No transactions found</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction._id}
                    className="border-b border-line hover:bg-surface-300/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-bone">{transaction.transactionId}</p>
                        {transaction.bookingNumber && (
                          <p className="text-xs text-steel">Booking #{transaction.bookingNumber}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-bone">{transaction.userName}</p>
                        <p className="text-xs text-steel capitalize">{transaction.userType}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-2 text-sm text-bone capitalize">
                        {getTypeIcon(transaction.type)}
                        {transaction.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-bone">
                        {formatKES(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-bone capitalize">{transaction.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium capitalize',
                          getStatusColor(transaction.status)
                        )}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-steel">{formatDate(transaction.createdAt)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setMpesaData(null);
                        }}
                      >
                        View
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
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => {
          setSelectedTransaction(null);
          setMpesaData(null);
        }}
        onLookupMpesa={handleMpesaLookup}
        mpesaData={mpesaData}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TransactionHistory;
