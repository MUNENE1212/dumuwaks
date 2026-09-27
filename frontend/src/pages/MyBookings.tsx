import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchBookings, clearError } from '@/store/slices/bookingSlice';
import BookingCard from '@/components/bookings/BookingCard';
import Loading from '@/components/ui/Loading';
import Alert from '@/components/ui/Alert';
import { Filter, Search, Calendar, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const MyBookings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { bookings, isLoading, error, pagination } = useAppSelector(
    (state) => state.bookings
  );
  const { user } = useAppSelector((state) => state.auth);

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const statusFilters = [
    { value: 'all', label: 'All Bookings', icon: Package },
    { value: 'pending', label: 'Pending', color: 'text-yellow-600' },
    { value: 'assigned', label: 'Assigned', color: 'text-purple-600' },
    { value: 'accepted', label: 'Accepted', color: 'text-green-600' },
    { value: 'in_progress', label: 'In Progress', color: 'text-blue-600' },
    { value: 'completed', label: 'Completed', color: 'text-green-600' },
    { value: 'cancelled', label: 'Cancelled', color: 'text-ink-muted' },
  ];

  useEffect(() => {
    const params = activeFilter !== 'all' ? { status: activeFilter } : {};
    dispatch(fetchBookings(params));
  }, [dispatch, activeFilter]);

  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.bookingNumber.toLowerCase().includes(query) ||
      booking.serviceType.toLowerCase().includes(query) ||
      booking.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center text-3xl font-bold text-ink">
          <Calendar className="mr-3 h-8 w-8 text-primary-600" />
          My Bookings
        </h1>
        <p className="mt-2 text-ink-muted">
          Manage and track all your service bookings
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6">
          <Alert
            variant="error"
            message={error}
            onClose={() => dispatch(clearError())}
          />
        </div>
      )}

      {/* Filters & Search */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by booking number, service type, or description..."
            className="w-full rounded-lg border border-line-strong py-3 pl-12 pr-4 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
          />
        </div>

        {/* Status Filters */}
        <div className="rounded-lg border border-line bg-surface-200 p-2 shadow-sm">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <Filter className="h-4 w-4 text-ink-muted" />
            {statusFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={cn(
                    'flex items-center space-x-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    activeFilter === filter.value
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-ink-muted hover:bg-surface-100'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className={filter.color}>{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-muted">Total Bookings</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {pagination.total}
              </p>
            </div>
            <Package className="h-10 w-10 text-ink-muted" />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-muted">Active</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">
                {bookings.filter((b) =>
                  ['pending', 'assigned', 'accepted', 'in_progress'].includes(b.status)
                ).length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-muted">Completed</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {bookings.filter((b) => b.status === 'completed').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-muted">Cancelled</p>
              <p className="mt-1 text-2xl font-bold text-ink-muted">
                {bookings.filter((b) => b.status === 'cancelled').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-surface-300 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-ink-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <Loading size="lg" text="Loading bookings..." />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface-200 p-12 text-center shadow-sm">
          <Package className="mx-auto h-16 w-16 text-ink-muted" />
          <h3 className="mt-4 text-lg font-semibold text-ink">
            No bookings found
          </h3>
          <p className="mt-2 text-sm text-ink-muted">
            {activeFilter !== 'all'
              ? `No ${activeFilter} bookings at the moment.`
              : searchQuery
              ? 'No bookings match your search criteria.'
              : user?.role === 'customer'
              ? 'Start by finding a technician and creating your first booking.'
              : 'You have no bookings yet. Customers will find you through our AI matching system.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking._id}
              booking={booking}
              userRole={user?.role || 'customer'}
            />
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center pt-6">
              <div className="flex space-x-2">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => {
                      const params =
                        activeFilter !== 'all'
                          ? { status: activeFilter, page }
                          : { page };
                      dispatch(fetchBookings(params));
                    }}
                    className={cn(
                      'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      page === pagination.page
                        ? 'bg-primary-600 text-on-lumen'
                        : 'bg-surface-200 text-ink hover:bg-surface-100 border border-line-strong'
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
