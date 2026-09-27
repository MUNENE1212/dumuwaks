import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Ban,
  Trash2,
  RefreshCw,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUsers, updateUserStatus, deleteUser, PaginatedUsers, UserListItem } from '@/services/admin.service';
import Loading from '@/components/ui/Loading';
import { formatDistanceToNow } from 'date-fns';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Action modals
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data: PaginatedUsers = await getUsers({
        page: pagination.page,
        limit: pagination.limit,
        ...(searchQuery && { search: searchQuery }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
        sortBy,
        order,
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter, statusFilter, sortBy, order]);

  // Handle search (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchUsers();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle user status update
  const handleUpdateStatus = async (status: 'active' | 'suspended' | 'banned', reason?: string) => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await updateUserStatus(selectedUser._id, status, reason);
      setShowStatusModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating user status:', err);
      alert(err.message || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (reason?: string) => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await deleteUser(selectedUser._id, reason);
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900/30 text-green-400';
      case 'suspended':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'banned':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-surface-200 text-ink-muted';
    }
  };

  // Get role badge color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-900/30 text-purple-400';
      case 'technician':
        return 'bg-blue-900/30 text-blue-400';
      case 'support':
        return 'bg-orange-900/30 text-orange-400';
      default:
        return 'bg-surface-200 text-ink-muted';
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading size="lg" text="Loading users..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink flex items-center gap-2">
            <Users className="h-8 w-8 text-purple-600" />
            User Management
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage platform users and permissions
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-purple-600 text-on-lumen rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
            >
              <option value="">All Roles</option>
              <option value="customer">Customer</option>
              <option value="technician">Technician</option>
              <option value="admin">Admin</option>
              <option value="support">Support</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}-${order}`}
              onChange={(e) => {
                const [newSort, newOrder] = e.target.value.split('-');
                setSortBy(newSort);
                setOrder(newOrder as 'asc' | 'desc');
              }}
              className="px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="firstName-asc">Name (A-Z)</option>
              <option value="firstName-desc">Name (Z-A)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Users ({pagination.total.toLocaleString()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-ink-muted">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-200/50 border-b border-line">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Email/Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-surface-200/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-purple-400 flex items-center justify-center text-ink font-semibold">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-ink">
                              {user.firstName} {user.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-ink-muted">
                          {user.email}
                        </div>
                        {user.phoneNumber && (
                          <div className="text-xs text-ink-muted">
                            {user.phoneNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getRoleColor(user.role))}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(user.status))}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-muted">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {user.status === 'active' && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowStatusModal(true);
                              }}
                              className="p-2 text-yellow-600 hover:bg-yellow-900/20 rounded-lg transition-colors"
                              title="Suspend User"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          {user.status !== 'active' && (
                            <button
                              onClick={() => handleUpdateStatus('active')}
                              className="p-2 text-green-600 hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Activate User"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-ink-muted">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} users
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-line rounded-lg disabled:opacity-50 hover:bg-surface-200"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 border border-line rounded-lg disabled:opacity-50 hover:bg-surface-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update Modal */}
      {showStatusModal && selectedUser && (
        <div className="fixed inset-0 bg-surface-000/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-200 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-ink mb-4">
              Update User Status
            </h3>
            <p className="text-sm text-ink-muted mb-4">
              Update status for {selectedUser.firstName} {selectedUser.lastName}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleUpdateStatus('suspended', 'Suspended by admin')}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-yellow-600 text-on-lumen rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                Suspend User
              </button>
              <button
                onClick={() => handleUpdateStatus('banned', 'Banned by admin')}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-red-600 text-on-lumen rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Ban User
              </button>
              <button
                onClick={() => setShowStatusModal(false)}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-surface-300 text-ink rounded-lg hover:bg-surface-400 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-surface-000/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-200 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Delete User</h3>
            <p className="text-sm text-ink-muted mb-4">
              Are you sure you want to delete {selectedUser.firstName} {selectedUser.lastName}? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteUser('Deleted by admin')}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-on-lumen rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-surface-300 text-ink rounded-lg hover:bg-surface-400 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
