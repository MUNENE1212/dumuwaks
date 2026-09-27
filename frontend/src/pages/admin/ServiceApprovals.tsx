/**
 * ServiceApprovals Page
 *
 * Admin page for managing service approval requests.
 * Wraps the ServiceApprovalDashboard component with proper layout.
 *
 * @module pages/admin/ServiceApprovals
 */

import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import ServiceApprovalDashboard from '@/components/admin/ServiceApprovalDashboard';

/**
 * ServiceApprovals Page Component
 *
 * Provides the admin service approval interface with:
 * - Authentication check for admin access
 * - Layout wrapper for the dashboard
 * - SEO metadata
 *
 * @returns The rendered page component or redirect if unauthorized
 */
const ServiceApprovals: React.FC = () => {
  // Get auth state to verify admin access
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Redirect if not authenticated or not admin
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has admin role
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
            Only administrators can review and approve services.
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

  return (
    <>
      {/* Page Title */}
      <title>Service Approvals - Admin | DumuWaks</title>
      <meta name="description" content="Review and approve custom service requests from technicians" />

      {/* Dashboard */}
      <ServiceApprovalDashboard />
    </>
  );
};

export default ServiceApprovals;
