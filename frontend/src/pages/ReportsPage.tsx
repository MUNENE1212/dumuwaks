import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReports } from '@/services/admin.service';
import Loading from '@/components/ui/Loading';
import { format, subDays } from 'date-fns';

const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch reports
  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getReports(startDate, endDate);
      setReports(data);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  // Calculate totals
  const getTotalRevenue = () => {
    if (!reports?.revenueReport) return 0;
    return reports.revenueReport.reduce((sum: number, item: any) => sum + item.totalRevenue, 0);
  };

  const getTotalBookings = () => {
    if (!reports?.revenueReport) return 0;
    return reports.revenueReport.reduce((sum: number, item: any) => sum + item.bookingCount, 0);
  };

  const getTotalUsers = () => {
    if (!reports?.userReport) return 0;
    return reports.userReport.reduce((sum: number, item: any) => sum + item.count, 0);
  };

  // Get booking status stats
  const getBookingStats = () => {
    if (!reports?.bookingStatusReport) return { completed: 0, cancelled: 0, pending: 0, total: 0 };

    const stats = reports.bookingStatusReport.reduce(
      (acc: any, item: any) => {
        acc.total += item.count;
        if (item._id === 'completed') acc.completed = item.count;
        if (item._id === 'cancelled') acc.cancelled = item.count;
        if (['pending', 'accepted', 'in_progress'].includes(item._id)) acc.pending += item.count;
        return acc;
      },
      { completed: 0, cancelled: 0, pending: 0, total: 0 }
    );

    return stats;
  };

  if (isLoading && !reports) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading size="lg" text="Loading reports..." />
      </div>
    );
  }

  const bookingStats = getBookingStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Comprehensive platform analytics and insights
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Calendar className="h-5 w-5 text-ink-muted" />
              <span className="text-sm text-ink-muted">Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
              />
              <span className="text-ink-muted">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="px-3 py-2 border border-line rounded-lg bg-surface-200 text-ink"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-200">
          {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-muted">Total Revenue</p>
                <p className="text-2xl font-bold text-ink mt-1">
                  KES {getTotalRevenue().toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-muted">Total Bookings</p>
                <p className="text-2xl font-bold text-ink mt-1">
                  {getTotalBookings().toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-muted">New Users</p>
                <p className="text-2xl font-bold text-ink mt-1">
                  {getTotalUsers().toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-muted">Completion Rate</p>
                <p className="text-2xl font-bold text-ink mt-1">
                  {bookingStats.total > 0
                    ? ((bookingStats.completed / bookingStats.total) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {reports?.revenueReport && reports.revenueReport.length > 0 ? (
            <div className="space-y-3">
              {reports.revenueReport.slice(0, 10).map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="text-sm text-ink-muted w-24">
                    {format(new Date(item._id), 'MMM dd')}
                  </div>
                  <div className="flex-1 bg-surface-300 rounded-full h-8 relative">
                    <div
                      className=" bg-purple-500 h-8 rounded-full flex items-center justify-end pr-3 text-on-lumen text-sm font-medium"
                      style={{
                        width: `${Math.min(
                          (item.totalRevenue / Math.max(...reports.revenueReport.map((r: any) => r.totalRevenue))) *
                            100,
                          100
                        )}%`,
                      }}
                    >
                      {item.bookingCount} bookings
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-ink w-32 text-right">
                    KES {item.totalRevenue.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted">
              No revenue data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports?.bookingStatusReport && reports.bookingStatusReport.length > 0 ? (
                reports.bookingStatusReport.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item._id === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {item._id === 'cancelled' && <XCircle className="h-5 w-5 text-red-600" />}
                      {!['completed', 'cancelled'].includes(item._id) && (
                        <div className="h-5 w-5 rounded-full bg-blue-900/30" />
                      )}
                      <span className="text-sm capitalize text-ink">
                        {item._id.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-ink">
                        {item.count} bookings
                      </span>
                      <span className="text-sm text-ink-muted">
                        KES {item.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-ink-muted">
                  No booking data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports?.topServicesReport && reports.topServicesReport.length > 0 ? (
                reports.topServicesReport.map((service: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-400 flex items-center justify-center text-ink font-semibold text-sm">
                        #{index + 1}
                      </div>
                      <span className="text-sm capitalize text-ink">
                        {service._id || 'Other'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-ink">
                        {service.count} bookings
                      </span>
                      <span className="text-sm text-green-400">
                        KES {service.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-ink-muted">
                  No service data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Registration Trend */}
      <Card>
        <CardHeader>
          <CardTitle>User Registration Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {reports?.userReport && reports.userReport.length > 0 ? (
            <div className="space-y-3">
              {/* Group by date and display */}
              {Array.from(
                new Set(reports.userReport.map((item: any) => item._id.date))
              )
                .slice(0, 10)
                .map((date: any, index: number) => {
                  const dayData = reports.userReport.filter((item: any) => item._id.date === date);
                  const totalCount = dayData.reduce((sum: number, item: any) => sum + item.count, 0);

                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="text-sm text-ink-muted w-24">
                        {format(new Date(date), 'MMM dd')}
                      </div>
                      <div className="flex-1 flex gap-1">
                        {dayData.map((item: any, idx: number) => {
                          const roleColors: any = {
                            customer: 'bg-ink-faint',
                            technician: 'bg-blue-500',
                            admin: 'bg-purple-500',
                            support: 'bg-orange-500',
                          };
                          return (
                            <div
                              key={idx}
                              className={cn('h-8 rounded', roleColors[item._id.role] || 'bg-ink-faint')}
                              style={{
                                width: `${(item.count / totalCount) * 100}%`,
                              }}
                              title={`${item._id.role}: ${item.count}`}
                            />
                          );
                        })}
                      </div>
                      <div className="text-sm font-semibold text-ink w-16 text-right">
                        {totalCount} users
                      </div>
                    </div>
                  );
                })}
              <div className="pt-4 border-t border-line">
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-ink-faint" />
                    <span className="text-ink-muted">Customer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-blue-500" />
                    <span className="text-ink-muted">Technician</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-purple-500" />
                    <span className="text-ink-muted">Admin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-orange-500" />
                    <span className="text-ink-muted">Support</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted">
              No user registration data available for this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
