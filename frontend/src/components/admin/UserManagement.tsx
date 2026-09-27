/**
 * UserManagement Component
 *
 * Admin interface for managing users including:
 * - User search and filters
 * - User details view
 * - Account status toggle (active/suspended)
 * - Role management
 * - View user's bookings and transactions
 *
 * @module components/admin/UserManagement
 */

import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { getUsers, getUserById, updateUserStatus } from '@/services/admin.service';
import type { AdminUser } from '@/types/admin';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import VerifiedBadge, { isVerifiedTechnician } from '@/components/common/VerifiedBadge';
import { setTechnicianVerification } from '@/services/admin.service';

/**
 * User role options
 */
const userRoles = [
  { value: '', label: 'All Roles' },
  { value: 'customer', label: 'Customers' },
  { value: 'technician', label: 'Technicians' },
  { value: 'admin', label: 'Admins' },
];

/**
 * User status options
 */
const userStatuses = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Banned' },
  { value: 'deactivated', label: 'Deactivated' },
];

/**
 * Get status color class
 */
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    active: 'bg-success/20 text-success',
    suspended: 'bg-warning/20 text-warning',
    banned: 'bg-error/20 text-error',
    deactivated: 'bg-steel/20 text-steel',
  };
  return colors[status] || 'bg-steel/20 text-steel';
};

/**
 * Get role color class
 */
const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    customer: 'bg-lumen/20 text-lumen-ink',
    technician: 'bg-wrench/20 text-wrench',
    admin: 'bg-error/20 text-error',
  };
  return colors[role] || 'bg-steel/20 text-steel';
};

/**
 * Format date
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * User detail modal props
 */
interface UserDetailModalProps {
  user: (AdminUser & { bookings?: any[]; transactions?: any[] }) | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (userId: string, status: string, reason?: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * User Detail Modal Component
 */
const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  isOpen,
  onClose,
  onStatusChange,
  isLoading,
}) => {
  const [verifiedState, setVerifiedState] = useState<{ verification: { isVerified: boolean } } | null>(null);
  const [verifying, setVerifying] = useState(false);
  useEffect(() => setVerifiedState(null), [user?._id]);
  const toggleVerification = async () => {
    if (!user) return;
    const next = !isVerifiedTechnician(verifiedState ?? user);
    setVerifying(true);
    try {
      const res = await setTechnicianVerification(user._id, next);
      setVerifiedState({ verification: res.verification });
      toast.success(next ? 'Technician marked ID verified' : 'Verification removed');
    } catch {
      toast.error('Could not update verification');
    } finally {
      setVerifying(false);
    }
  };
  const [statusAction, setStatusAction] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (!isOpen || !user) return null;

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'suspended' || newStatus === 'banned') {
      if (!reason.trim()) {
        setStatusAction(newStatus);
        return;
      }
    }
    await onStatusChange(user._id, newStatus, reason || undefined);
    setStatusAction(null);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay-medium">
      <div className="glass-modal rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-line">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-lumen/20 flex items-center justify-center">
                  <span className="text-lumen-ink font-bold text-lg">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-bone">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-sm text-steel">{user.email}</p>
              </div>
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
          {/* Badges */}
          <div className="flex items-center gap-2">
            <span className={clsx('px-3 py-1 rounded-full text-sm font-medium capitalize', getRoleColor(user.role))}>
              {user.role}
            </span>
            <span className={clsx('px-3 py-1 rounded-full text-sm font-medium capitalize', getStatusColor(user.status))}>
              {user.status}
            </span>
            {user.role === 'technician' && <VerifiedBadge user={verifiedState ?? user} size="md" />}
            {user.isOnline && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-lumen/20 text-lumen-ink">
                Online
              </span>
            )}
          </div>

          {user.role === 'technician' && (
            <div className="rounded-md border border-line bg-surface-300 p-4">
              <p className="text-sm text-ink">
                Mark this technician ID-verified only after you have checked their national ID or passport against
                their name. Customers see the badge on every listing.
              </p>
              <button
                type="button"
                disabled={verifying}
                onClick={toggleVerification}
                className={clsx('btn btn-sm mt-3', isVerifiedTechnician(verifiedState ?? user) ? 'btn-outline' : 'btn-primary')}
              >
                {isVerifiedTechnician(verifiedState ?? user) ? 'Remove verification' : 'Mark ID verified'}
              </button>
            </div>
          )}

                    {/* Contact Info */}
          <div className="glass-card rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-bone">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-steel">Email</p>
                <p className="text-sm text-bone">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-steel">Phone</p>
                <p className="text-sm text-bone">{user.phoneNumber || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-steel">Joined</p>
                <p className="text-sm text-bone">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-steel">Last Login</p>
                <p className="text-sm text-bone">{user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="glass-card rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-bone">{user.stats?.totalBookings ?? 0}</p>
              <p className="text-xs text-steel">Bookings</p>
            </div>
            <div className="glass-card rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-lumen-ink">{user.stats?.averageRating?.toFixed(1) ?? '0.0'}</p>
              <p className="text-xs text-steel">Rating</p>
            </div>
            <div className="glass-card rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-success">{user.stats?.totalSpent?.toLocaleString() ?? 0}</p>
              <p className="text-xs text-steel">Spent (KES)</p>
            </div>
            <div className="glass-card rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-wrench">{user.stats?.totalEarned?.toLocaleString() ?? 0}</p>
              <p className="text-xs text-steel">Earned (KES)</p>
            </div>
          </div>

          {/* Status Management */}
          <div className="glass-card rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-bone">Account Status</h3>

            {statusAction ? (
              <div className="space-y-3">
                <label className="block text-sm text-steel">
                  Reason for {statusAction} (required)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 bg-charcoal border border-line rounded-lg text-bone focus:border-lumen focus:outline-none"
                  rows={3}
                  placeholder={`Enter the reason for ${statusAction} this account...`}
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleStatusChange(statusAction)}
                    disabled={!reason.trim() || isLoading}
                  >
                    Confirm {statusAction}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setStatusAction(null); setReason(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.status !== 'active' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusChange('active')}
                    disabled={isLoading}
                  >
                    Activate
                  </Button>
                )}
                {user.status !== 'suspended' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusAction('suspended')}
                    disabled={isLoading}
                  >
                    Suspend
                  </Button>
                )}
                {user.status !== 'banned' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setStatusAction('banned')}
                    disabled={isLoading}
                  >
                    Ban
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Bookings Preview */}
          {user.bookings && user.bookings.length > 0 && (
            <div className="glass-card rounded-lg p-4">
              <h3 className="text-sm font-semibold text-bone mb-3">Recent Bookings</h3>
              <div className="space-y-2">
                {user.bookings.slice(0, 5).map((booking, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-charcoal rounded">
                    <span className="text-sm text-bone">{booking._id}</span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full capitalize', getStatusColor(booking.status))}>
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Main UserManagement Component
 */
const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal
  const [selectedUser, setSelectedUser] = useState<(AdminUser & { bookings?: any[]; transactions?: any[] }) | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  /**
   * Fetch users
   */
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit: 15,
      });

      setUsers(data.users as AdminUser[]);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Handle user status change
   */
  const handleStatusChange = async (userId: string, status: string, reason?: string) => {
    try {
      setActionLoading(true);
      await updateUserStatus(userId, status as any, reason);
      await fetchUsers();
      if (selectedUser?._id === userId) {
        setSelectedUser({ ...selectedUser, status: status as any });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * View user details
   */
  const viewUserDetails = async (userId: string) => {
    try {
      const userData = await getUserById(userId);
      setSelectedUser(userData as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user details');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-bone">User Management</h1>
        <p className="text-steel text-sm mt-1">
          Manage platform users, roles, and account status
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div className="sm:col-span-1">
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
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, phone..."
                className="w-full pl-9 pr-4 py-2 bg-charcoal border border-line rounded-lg text-bone text-sm placeholder:text-steel/50 focus:border-lumen focus:outline-none"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-xs text-steel mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-charcoal border border-line rounded-lg text-bone text-sm focus:border-lumen focus:outline-none"
            >
              {userRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs text-steel mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-charcoal border border-line rounded-lg text-bone text-sm focus:border-lumen focus:outline-none"
            >
              {userStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-surface-300" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-300 rounded w-24" />
                  <div className="h-3 bg-surface-300 rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-steel/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-bone">No users found</h3>
          <p className="mt-2 text-steel">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user._id}
              className="glass-card rounded-xl p-4 hover:border-strong transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-lumen/20 flex items-center justify-center">
                      <span className="text-lumen-ink font-bold">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-bone">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-steel">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {user.isOnline && (
                    <span className="w-2 h-2 rounded-full bg-success" title="Online" />
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium capitalize', getRoleColor(user.role))}>
                  {user.role}
                </span>
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium capitalize', getStatusColor(user.status))}>
                  {user.status}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-steel">
                <span>Joined {formatDate(user.createdAt)}</span>
                {user.stats?.totalBookings !== undefined && (
                  <span>{user.stats.totalBookings} bookings</span>
                )}
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => viewUserDetails(user._id)}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onStatusChange={handleStatusChange}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default UserManagement;
