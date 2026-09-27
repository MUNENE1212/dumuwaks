/**
 * Admin Dashboard Page
 *
 * Main admin dashboard page with sidebar navigation and content areas.
 * Provides unified management for WORD BANK, escrow, and payments.
 *
 * @module pages/admin/Dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import AdminSidebar from '@/components/admin/AdminSidebar';
import DashboardOverview from '@/components/admin/DashboardOverview';
import ServiceApprovalDashboard from '@/components/admin/ServiceApprovalDashboard';
import EscrowManagementPanel from '@/components/admin/EscrowManagementPanel';
import TransactionHistory from '@/components/admin/TransactionHistory';
import UserManagement from '@/components/admin/UserManagement';
import FeeConfiguration from '@/pages/admin/FeeConfiguration';
import { getDashboardStats, getEscrowStats } from '@/services/admin.service';
import type { DashboardMetrics } from '@/types/admin';
import FinancePanel from '@/components/admin/FinancePanel';

/**
 * Admin Dashboard Page Component
 */
const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [activeDisputes, setActiveDisputes] = useState(0);
  const [pendingEscrows, setPendingEscrows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated or not admin
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-surface-100 flex items-center justify-center p-4">
        <div className="glass-card rounded-xl p-8 max-w-md text-center">
          <svg
            className="w-16 h-16 mx-auto text-error"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="mt-4 text-xl font-bold text-bone">Access Denied</h1>
          <p className="mt-2 text-steel">
            You do not have permission to access this page.
            Only administrators can manage the platform.
          </p>
          <a
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-lumen text-on-lumen rounded-lg shadow-led hover:bg-lumen-hover transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  /**
   * Fetch dashboard data
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch all dashboard data in parallel
      const [dashboardStats, escrowStats] = await Promise.all([
        getDashboardStats('today').catch(() => null),
        getEscrowStats().catch(() => null),
      ]);

      if (dashboardStats) {
        setMetrics({
          pendingApprovals: dashboardStats.users?.newToday || 0,
          totalServices: 0,
          activeEscrows: escrowStats?.totalActive || 0,
          totalInEscrow: escrowStats?.totalValue || 0,
          pendingPayouts: escrowStats?.pendingRelease || 0,
          todayTransactions: 0,
          todayVolume: dashboardStats.revenue?.total || 0,
          newUsersToday: dashboardStats.users?.newToday || 0,
          activeTechnicians: dashboardStats.users?.activeTechnicians || 0,
          platformFeesToday: 0,
          totalBookingsToday: dashboardStats.bookings?.total || 0,
        });
      }

      // Set badge counts for sidebar
      setPendingApprovals(0);
      setActiveDisputes(escrowStats?.totalDisputed || 0);
      setPendingEscrows(escrowStats?.pendingRelease || 0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /**
   * Render content based on current route
   */
  const renderContent = () => {
    const path = location.pathname;

    // Main dashboard overview
    if (path === '/admin' || path === '/admin/') {
      return (
        <DashboardOverview
          metrics={metrics}
          isLoading={isLoading}
          onRefresh={fetchDashboardData}
        />
      );
    }

    // Service approvals
    if (path === '/admin/approvals') {
      return <ServiceApprovalDashboard />;
    }

    // Real escrow on IntaSend: wallet vs ledger, payout approvals, disputes
    if (path === '/admin/finance') {
      return <FinancePanel />;
    }

    // Escrow management
    if (path === '/admin/escrow') {
      return <EscrowManagementPanel />;
    }

    // Transaction history
    if (path === '/admin/transactions') {
      return <TransactionHistory />;
    }

    // User management
    if (path === '/admin/users') {
      return <UserManagement />;
    }

    // Fee configuration
    if (path === '/admin/fee-config') {
      return <FeeConfiguration />;
    }

    // Placeholder for other routes
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-bone">Coming Soon</h3>
          <p className="mt-2 text-steel">
            This section is under development.
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Page Title */}
      <title>Admin Dashboard | DumuWaks</title>
      <meta name="description" content="Admin dashboard for managing WORD BANK, escrow, and payments" />

      <div className="flex min-h-screen bg-surface-100">
        {/* Sidebar */}
        <AdminSidebar
          pendingApprovals={pendingApprovals}
          activeDisputes={activeDisputes}
          pendingEscrows={pendingEscrows}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <main
          className="flex-1 overflow-auto transition-all duration-300"
          style={{
            marginLeft: sidebarCollapsed ? '4rem' : '16rem',
          }}
        >
          <div className="p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
