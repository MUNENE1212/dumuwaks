/**
 * AdminSidebar Component
 *
 * Navigation sidebar for the admin dashboard with sections for
 * overview, service approvals, escrow, transactions, users, and reports.
 *
 * @module components/admin/AdminSidebar
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

/**
 * Navigation item interface
 */
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

/**
 * Navigation section interface
 */
interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Icons for navigation items
 */
const Icons = {
  Overview: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  FeeConfig: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Services: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Escrow: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Transactions: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Technicians: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Reports: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
};

/**
 * Navigation sections configuration
 */
interface AdminSidebarProps {
  pendingApprovals?: number;
  activeDisputes?: number;
  pendingEscrows?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  pendingApprovals = 0,
  activeDisputes = 0,
  pendingEscrows = 0,
  collapsed = false,
  onToggleCollapse,
}) => {
  const location = useLocation();

  const navSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          icon: Icons.Overview,
          path: '/admin',
        },
      ],
    },
    {
      title: 'Management',
      items: [
        {
          id: 'approvals',
          label: 'Service Approvals',
          icon: Icons.Services,
          path: '/admin/approvals',
          badge: pendingApprovals,
        },
        {
          id: 'finance',
          label: 'Finance',
          icon: Icons.Escrow,
          path: '/admin/finance',
        },
        {
          id: 'escrow',
          label: 'Escrow Management',
          icon: Icons.Escrow,
          path: '/admin/escrow',
          badge: pendingEscrows,
        },
        {
          id: 'transactions',
          label: 'Transactions',
          icon: Icons.Transactions,
          path: '/admin/transactions',
        },
        {
          id: 'disputes',
          label: 'Disputes',
          icon: Icons.Escrow,
          path: '/admin/disputes',
          badge: activeDisputes,
        },
      ],
    },
    {
      title: 'Users',
      items: [
        {
          id: 'users',
          label: 'Users',
          icon: Icons.Users,
          path: '/admin/users',
        },
        {
          id: 'technicians',
          label: 'Technicians',
          icon: Icons.Technicians,
          path: '/admin/technicians',
        },
      ],
    },
    {
      title: 'Analytics',
      items: [
        {
          id: 'reports',
          label: 'Reports',
          icon: Icons.Reports,
          path: '/admin/reports',
        },
        {
          id: 'statistics',
          label: 'Statistics',
          icon: Icons.Reports,
          path: '/admin/statistics',
        },
      ],
    },
    {
      title: 'System',
      items: [
        {
          id: 'fee-config',
          label: 'Fee Configuration',
          icon: Icons.FeeConfig,
          path: '/admin/fee-config',
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: Icons.Settings,
          path: '/admin/settings',
        },
      ],
    },
  ];

  return (
    <aside
      className={clsx(
        'h-screen glass-nav flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Header */}
      <div className="p-4 border-b border-line">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-bone">Admin Panel</h1>
              <p className="text-xs text-steel">Dumuwaks management</p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-surface-300 text-steel hover:text-bone transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={clsx('w-5 h-5 transition-transform', collapsed && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            {!collapsed && (
              <h2 className="px-4 mb-2 text-xs font-semibold text-steel uppercase tracking-wider">
                {section.title}
              </h2>
            )}
            <ul className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.path}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen',
                        isActive
                          ? 'glass-card text-lumen-ink led-glow'
                          : 'text-steel hover:text-bone hover:bg-surface-300',
                        collapsed && 'justify-center'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={clsx(
                                'px-2 py-0.5 text-xs font-bold rounded-full',
                                isActive
                                  ? 'bg-lumen text-on-lumen'
                                  : 'bg-warning/20 text-warning'
                              )}
                            >
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-warning rounded-full" />
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Back to Site Link */}
      <div className="p-4 border-t border-line">
        <NavLink
          to="/"
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            'text-steel hover:text-bone hover:bg-surface-300',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Back to Site' : undefined}
        >
          {Icons.Back}
          {!collapsed && <span className="text-sm font-medium">Back to Site</span>}
        </NavLink>
      </div>
    </aside>
  );
};

export default AdminSidebar;
