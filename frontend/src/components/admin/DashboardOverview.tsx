/**
 * DashboardOverview Component
 *
 * Main overview component for the admin dashboard displaying key metrics
 * across services, escrow, transactions, and user activity.
 *
 * @module components/admin/DashboardOverview
 */

import React from 'react';
import { clsx } from 'clsx';
import type { DashboardMetrics } from '@/types/admin';

/**
 * Metric card props
 */
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorClass?: string;
  isLoading?: boolean;
}

/**
 * Metric Card Component
 */
const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorClass = 'bg-lumen/20 text-lumen-ink',
  isLoading = false,
}) => (
  <div className="glass-card rounded-xl p-5 transition-all hover:border-strong">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm text-steel font-medium">{title}</p>
        {isLoading ? (
          <div className="h-8 w-24 bg-surface-300 rounded animate-pulse mt-2" />
        ) : (
          <p className="text-2xl font-bold text-bone mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        )}
        {subtitle && !isLoading && (
          <p className="text-xs text-steel/70 mt-1">{subtitle}</p>
        )}
        {trend && !isLoading && (
          <div
            className={clsx(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              trend.isPositive ? 'text-success' : 'text-error'
            )}
          >
            {trend.isPositive ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className={clsx('p-3 rounded-lg', colorClass)}>{icon}</div>
    </div>
  </div>
);

/**
 * Quick action button props
 */
interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'warning' | 'danger';
}

/**
 * Quick Action Button Component
 */
const QuickActionButton: React.FC<QuickActionProps> = ({
  label,
  icon,
  onClick,
  href,
  variant = 'secondary',
}) => {
  const variantClasses = {
    primary: 'bg-lumen text-on-lumen hover:bg-lumen-hover shadow-led',
    secondary: 'bg-charcoal text-bone hover:bg-surface-300 border border-line',
    warning: 'bg-warning/20 text-warning hover:bg-warning/30',
    danger: 'bg-error/20 text-error hover:bg-error/30',
  };

  const content = (
    <>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={clsx(
          'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all',
          variantClasses[variant]
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all',
        variantClasses[variant]
      )}
    >
      {content}
    </button>
  );
};

/**
 * Dashboard Overview Props
 */
interface DashboardOverviewProps {
  metrics: DashboardMetrics | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/**
 * Format KES currency
 */
const formatKES = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};

/**
 * Main Dashboard Overview Component
 */
const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  metrics,
  isLoading = false,
  onRefresh,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bone">Dashboard Overview</h1>
          <p className="text-steel text-sm mt-1">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-charcoal text-bone rounded-lg hover:bg-surface-300 border border-line transition-colors disabled:opacity-50"
          >
            <svg
              className={clsx('w-4 h-4', isLoading && 'animate-spin')}
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
          </button>
        )}
      </div>

      {/* Services Section */}
      <section>
        <h2 className="text-lg font-semibold text-bone mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-lumen-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          WORD BANK Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Pending Approvals"
            value={metrics?.pendingApprovals ?? 0}
            subtitle="Services awaiting review"
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
            colorClass="bg-warning/20 text-warning"
            isLoading={isLoading}
          />
          <MetricCard
            title="Total Services"
            value={metrics?.totalServices ?? 0}
            subtitle="Active in catalog"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            }
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Escrow Section */}
      <section>
        <h2 className="text-lg font-semibold text-bone mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-lumen-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Escrow & Payments
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Active Escrows"
            value={metrics?.activeEscrows ?? 0}
            subtitle="Currently held"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            }
            colorClass="bg-wrench/20 text-wrench"
            isLoading={isLoading}
          />
          <MetricCard
            title="Total in Escrow"
            value={formatKES(metrics?.totalInEscrow ?? 0)}
            subtitle="Funds held securely"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            colorClass="bg-success/20 text-success"
            isLoading={isLoading}
          />
          <MetricCard
            title="Pending Payouts"
            value={metrics?.pendingPayouts ?? 0}
            subtitle="Awaiting release"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
            colorClass="bg-warning/20 text-warning"
            isLoading={isLoading}
          />
          <MetricCard
            title="Platform Fees Today"
            value={formatKES(metrics?.platformFeesToday ?? 0)}
            subtitle="Commission earned"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            }
            colorClass="bg-lumen/20 text-lumen-ink"
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Transactions & Users Section */}
      <section>
        <h2 className="text-lg font-semibold text-bone mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-lumen-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Activity & Users
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Today's Transactions"
            value={metrics?.todayTransactions ?? 0}
            subtitle="Payment events"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
            isLoading={isLoading}
          />
          <MetricCard
            title="Today's Volume"
            value={formatKES(metrics?.todayVolume ?? 0)}
            subtitle="Total processed"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            colorClass="bg-success/20 text-success"
            isLoading={isLoading}
          />
          <MetricCard
            title="New Users Today"
            value={metrics?.newUsersToday ?? 0}
            subtitle="Registrations"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            }
            colorClass="bg-wrench/20 text-wrench"
            isLoading={isLoading}
          />
          <MetricCard
            title="Active Technicians"
            value={metrics?.activeTechnicians ?? 0}
            subtitle="Currently online"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            colorClass="bg-lumen/20 text-lumen-ink"
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-bone mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-lumen-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <QuickActionButton
            label="Review Services"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
            href="/admin/approvals"
            variant="primary"
          />
          <QuickActionButton
            label="Manage Escrow"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
            href="/admin/escrow"
            variant="secondary"
          />
          <QuickActionButton
            label="View Transactions"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            }
            href="/admin/transactions"
            variant="secondary"
          />
          <QuickActionButton
            label="Generate Report"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            href="/admin/reports"
            variant="secondary"
          />
        </div>
      </section>

      {/* Bookings Today */}
      <section>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-bone">Today's Bookings</h3>
            <span className="text-3xl font-bold text-lumen-ink">
              {metrics?.totalBookingsToday ?? 0}
            </span>
          </div>
          <div className="w-full bg-charcoal rounded-full h-2 overflow-hidden">
            <div
              className="bg-lumen h-full transition-all duration-500"
              style={{
                width: `${Math.min(((metrics?.totalBookingsToday ?? 0) / 100) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="text-sm text-steel mt-2">
            {metrics?.totalBookingsToday ?? 0} bookings created today
          </p>
        </div>
      </section>
    </div>
  );
};

export default DashboardOverview;
