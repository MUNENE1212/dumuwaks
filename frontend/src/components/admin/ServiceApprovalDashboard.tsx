/**
 * ServiceApprovalDashboard Component
 *
 * Main admin dashboard for reviewing and approving/rejecting custom services
 * submitted by technicians.
 *
 * @module components/admin/ServiceApprovalDashboard
 */

import React, { useEffect, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchPendingServices,
  fetchApprovalStats,
  approveServiceAction,
  rejectServiceAction,
  setApprovalFilterStatus,
  setApprovalCurrentPage,
  selectPaginatedPendingServices,
  selectApprovalStats,
  selectApprovalFilterStatus,
  selectApprovalLoading,
  selectApprovalActionLoading,
  selectApprovalError,
} from '@/store/slices/serviceSlice';
import type { PendingService, ApprovalFilterStatus } from '@/types/service';
import { getPriceRangeDisplay } from '@/services/service.service';
import Button from '@/components/ui/Button';
import ApprovalModal from './ApprovalModal';

/**
 * Stats Card Component
 */
interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  isLoading: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  colorClass,
  isLoading,
}) => (
  <div className="glass-card rounded-lg p-4 flex items-center gap-4">
    <div className={clsx('p-3 rounded-lg', colorClass)}>
      {icon}
    </div>
    <div>
      <p className="text-steel text-sm">{title}</p>
      {isLoading ? (
        <div className="h-8 w-12 bg-surface-300 rounded animate-pulse mt-1" />
      ) : (
        <p className="text-bone text-2xl font-bold">{value}</p>
      )}
    </div>
  </div>
);

/**
 * Loading Skeleton for Service Item
 */
const ServiceItemSkeleton: React.FC = () => (
  <div className="glass-card rounded-lg p-4 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="space-y-3 flex-1">
        <div className="h-5 w-40 bg-surface-300 rounded" />
        <div className="h-4 w-24 bg-surface-300 rounded" />
        <div className="h-3 w-32 bg-surface-300 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-20 bg-surface-300 rounded-lg" />
        <div className="h-9 w-20 bg-surface-300 rounded-lg" />
      </div>
    </div>
  </div>
);

/**
 * Service Item Component
 */
interface ServiceItemProps {
  service: PendingService;
  onApprove: (service: PendingService) => void;
  onReject: (service: PendingService) => void;
  isActionLoading: boolean;
}

const ServiceItem: React.FC<ServiceItemProps> = ({
  service,
  onApprove,
  onReject,
  isActionLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="glass-card rounded-lg overflow-hidden transition-all duration-200 hover:border-strong">
      {/* Main Content */}
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Service Info */}
          <div
            className="flex-1 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={(e) => e.key === 'Enter' && setIsExpanded(!isExpanded)}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
          >
            <h3 className="text-bone font-semibold text-lg uppercase tracking-wide">
              {service.name}
            </h3>
            <p className="text-steel text-sm mt-1">
              Category: <span className="text-bone">{service.categoryId}</span>
            </p>
            <p className="text-lumen-ink font-medium mt-2">
              {getPriceRangeDisplay(service.basePriceMin, service.basePriceMax)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onApprove(service)}
              disabled={isActionLoading}
              className="shadow-led"
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onReject(service)}
              disabled={isActionLoading}
            >
              Reject
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-line space-y-3">
            <p className="text-steel text-sm">{service.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-steel">Duration:</span>
                <span className="ml-2 text-bone">{service.estimatedDuration}</span>
              </div>
              <div>
                <span className="text-steel">Status:</span>
                <span
                  className={clsx(
                    'ml-2 px-2 py-0.5 rounded-full text-xs font-medium',
                    service.approvalStatus === 'pending' && 'bg-warning/20 text-warning',
                    service.approvalStatus === 'approved' && 'bg-success/20 text-success',
                    service.approvalStatus === 'rejected' && 'bg-error/20 text-error'
                  )}
                >
                  {service.approvalStatus}
                </span>
              </div>
            </div>
            {service.requestedBy && (
              <div className="pt-3 border-t border-line">
                <p className="text-steel text-sm">
                  Requested by:{' '}
                  <span className="text-bone">
                    {service.requestedBy.firstName} {service.requestedBy.lastName}
                  </span>
                  <span className="ml-2 text-steel/60">
                    ({service.requestedBy.email})
                  </span>
                </p>
                {service.requestedAt && (
                  <p className="text-steel text-sm mt-1">
                    Date:{' '}
                    <span className="text-bone">{formatDate(service.requestedAt)}</span>
                  </p>
                )}
              </div>
            )}
            {service.rejectionReason && (
              <div className="mt-2 p-3 bg-error/10 rounded-lg">
                <p className="text-error text-sm">
                  <span className="font-medium">Rejection Reason:</span>{' '}
                  {service.rejectionReason}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Pagination Component
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
  );

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        aria-label="Previous page"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Button>

      {visiblePages.map((page, index) => {
        const prevPage = visiblePages[index - 1];
        const showEllipsis = prevPage && page - prevPage > 1;

        return (
          <React.Fragment key={page}>
            {showEllipsis && (
              <span className="text-steel px-2">...</span>
            )}
            <Button
              variant={currentPage === page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(page)}
              disabled={isLoading}
              className={clsx(
                'min-w-[36px]',
                currentPage === page && 'shadow-led'
              )}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </Button>
          </React.Fragment>
        );
      })}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        aria-label="Next page"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </div>
  );
};

/**
 * Filter Tabs Component
 */
interface FilterTabsProps {
  activeFilter: ApprovalFilterStatus;
  onFilterChange: (filter: ApprovalFilterStatus) => void;
  isLoading: boolean;
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  isLoading,
}) => {
  const filters: { value: ApprovalFilterStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter services by status">
      {filters.map((filter) => (
        <button
          key={filter.value}
          role="tab"
          aria-selected={activeFilter === filter.value}
          onClick={() => onFilterChange(filter.value)}
          disabled={isLoading}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            activeFilter === filter.value
              ? 'bg-lumen text-on-lumen shadow-led'
              : 'bg-charcoal text-steel hover:text-bone hover:bg-surface-300'
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

/**
 * Main ServiceApprovalDashboard Component
 */
const ServiceApprovalDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Selectors
  const paginatedData = useSelector((state: RootState) =>
    selectPaginatedPendingServices(state)
  );
  const stats = useSelector((state: RootState) => selectApprovalStats(state));
  const filterStatus = useSelector((state: RootState) => selectApprovalFilterStatus(state));
  const isLoading = useSelector((state: RootState) => selectApprovalLoading(state));
  const isActionLoading = useSelector((state: RootState) => selectApprovalActionLoading(state));
  const error = useSelector((state: RootState) => selectApprovalError(state));

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [selectedService, setSelectedService] = useState<PendingService | null>(null);

  /**
   * Fetch pending services and stats on mount
   */
  useEffect(() => {
    dispatch(fetchPendingServices());
    dispatch(fetchApprovalStats());
  }, [dispatch]);

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback(
    (filter: ApprovalFilterStatus) => {
      dispatch(setApprovalFilterStatus(filter));
    },
    [dispatch]
  );

  /**
   * Handle page change
   */
  const handlePageChange = useCallback(
    (page: number) => {
      dispatch(setApprovalCurrentPage(page));
    },
    [dispatch]
  );

  /**
   * Open approve modal
   */
  const handleApproveClick = useCallback((service: PendingService) => {
    setSelectedService(service);
    setModalAction('approve');
    setModalOpen(true);
  }, []);

  /**
   * Open reject modal
   */
  const handleRejectClick = useCallback((service: PendingService) => {
    setSelectedService(service);
    setModalAction('reject');
    setModalOpen(true);
  }, []);

  /**
   * Handle approve action
   */
  const handleApprove = useCallback(
    async (id: string, notes?: string) => {
      await dispatch(approveServiceAction(id)).unwrap();
      // Refresh stats after approval
      dispatch(fetchApprovalStats());
    },
    [dispatch]
  );

  /**
   * Handle reject action
   */
  const handleReject = useCallback(
    async (id: string, reason: string) => {
      await dispatch(rejectServiceAction({ id, reason })).unwrap();
      // Refresh stats after rejection
      dispatch(fetchApprovalStats());
    },
    [dispatch]
  );

  return (
    <div className="min-h-screen bg-surface-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-bone">
              Service Approvals
            </h1>
            <p className="text-steel mt-1">
              Review and manage custom service requests from technicians
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              dispatch(fetchPendingServices());
              dispatch(fetchApprovalStats());
            }}
            disabled={isLoading}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Pending"
            value={stats?.pending ?? 0}
            isLoading={isLoading}
            colorClass="bg-warning/20 text-warning"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatsCard
            title="Approved"
            value={stats?.approved ?? 0}
            isLoading={isLoading}
            colorClass="bg-success/20 text-success"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatsCard
            title="Rejected"
            value={stats?.rejected ?? 0}
            isLoading={isLoading}
            colorClass="bg-error/20 text-error"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatsCard
            title="Total"
            value={stats?.total ?? 0}
            isLoading={isLoading}
            colorClass="bg-lumen/20 text-lumen-ink"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {/* Filter Tabs */}
        <FilterTabs
          activeFilter={filterStatus}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
        />

        {/* Services List */}
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <ServiceItemSkeleton key={i} />
            ))
          ) : paginatedData.services.length === 0 ? (
            // Empty state
            <div className="glass-card rounded-lg p-12 text-center">
              <svg
                className="w-16 h-16 mx-auto text-steel/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-bone">No services found</h3>
              <p className="mt-2 text-steel">
                {filterStatus === 'pending'
                  ? 'There are no pending services to review.'
                  : `No ${filterStatus} services.`}
              </p>
            </div>
          ) : (
            // Service items
            paginatedData.services.map((service) => (
              <ServiceItem
                key={service._id}
                service={service}
                onApprove={handleApproveClick}
                onReject={handleRejectClick}
                isActionLoading={isActionLoading}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {!isLoading && paginatedData.totalPages > 1 && (
          <Pagination
            currentPage={paginatedData.currentPage}
            totalPages={paginatedData.totalPages}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        )}

        {/* Approval/Reject Modal */}
        <ApprovalModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedService(null);
          }}
          service={selectedService}
          action={modalAction}
          onApprove={handleApprove}
          onReject={handleReject}
          isLoading={isActionLoading}
        />
      </div>
    </div>
  );
};

export default ServiceApprovalDashboard;
