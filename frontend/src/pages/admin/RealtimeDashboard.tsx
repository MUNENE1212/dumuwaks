/**
 * Real-Time Analytics Dashboard for Admin Panel
 *
 * Main dashboard page that displays live metrics, activity feed,
 * and status distribution for platform monitoring.
 *
 * Features:
 * - Real-time metrics updates via WebSocket (every 30 seconds)
 * - Live activity feed with auto-scroll
 * - Status distribution visualization
 * - Fallback to REST API if WebSocket unavailable
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';
import { socketService } from '@/services/socket';
import analyticsService, {
  getRealtimeMetrics,
  getTrends,
  getStatusDistribution,
  getActivityFeed,
} from '@/services/analytics.service';
import LiveMetricsCards from '@/components/admin/LiveMetricsCards';
import ActivityFeed from '@/components/admin/ActivityFeed';
import StatusDistribution from '@/components/admin/StatusDistribution';
import type {
  RealtimeMetrics,
  StatusDistribution as StatusDistributionType,
  ActivityEvent,
  TrendData,
  TimePeriod,
} from '@/types/analytics';
import { ANALYTICS_EVENTS } from '@/types/analytics';

const RealtimeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  // State
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistributionType | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('7d');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection state
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  /**
   * Load initial data from REST API
   */
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [metricsData, distributionData, activityData, trendsData] = await Promise.all([
        getRealtimeMetrics(),
        getStatusDistribution(),
        getActivityFeed(20),
        getTrends(selectedPeriod),
      ]);

      setMetrics(metricsData);
      setStatusDistribution(distributionData);
      setActivities(activityData);
      setTrends(trendsData);
    } catch (err: any) {
      console.error('Error loading analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  /**
   * Manual refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInitialData();
    setIsRefreshing(false);
  };

  /**
   * Handle activity click
   */
  const handleActivityClick = (activity: ActivityEvent) => {
    // Navigate to relevant page based on activity type
    if (activity.type.includes('booking') && activity.data.id) {
      navigate(`/admin/bookings/${activity.data.id}`);
    } else if (activity.type.includes('user') && activity.data.id) {
      navigate(`/admin/users/${activity.data.id}`);
    }
  };

  /**
   * Subscribe to WebSocket events
   */
  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    // Connect socket if not connected
    if (!socketService.isConnected()) {
      socketService.connect(user.id);
    }

    setIsSocketConnected(socketService.isConnected());

    // Subscribe to analytics updates
    socketService.emit(ANALYTICS_EVENTS.SUBSCRIBE);

    // Listen for metrics updates
    const handleMetricsUpdate = (data: RealtimeMetrics) => {
      setMetrics(data);
    };

    // Listen for status distribution updates
    const handleStatusDistribution = (data: StatusDistributionType) => {
      setStatusDistribution(data);
    };

    // Listen for new activity
    const handleActivity = (activity: ActivityEvent) => {
      setActivities(prev => [activity, ...prev].slice(0, 100));
    };

    // Listen for activity feed
    const handleActivityFeed = (feed: ActivityEvent[]) => {
      setActivities(feed);
    };

    // Listen for errors
    const handleError = (err: { error: string }) => {
      console.error('Analytics socket error:', err.error);
    };

    socketService.on(ANALYTICS_EVENTS.METRICS_UPDATE, handleMetricsUpdate);
    socketService.on(ANALYTICS_EVENTS.STATUS_DISTRIBUTION, handleStatusDistribution);
    socketService.on(ANALYTICS_EVENTS.ACTIVITY, handleActivity);
    socketService.on(ANALYTICS_EVENTS.ACTIVITY_FEED, handleActivityFeed);
    socketService.on(ANALYTICS_EVENTS.ERROR, handleError);

    // Connection status
    socketService.on('connect', () => setIsSocketConnected(true));
    socketService.on('disconnect', () => setIsSocketConnected(false));

    // Load initial data
    loadInitialData();

    // Cleanup
    return () => {
      socketService.off(ANALYTICS_EVENTS.METRICS_UPDATE, handleMetricsUpdate);
      socketService.off(ANALYTICS_EVENTS.STATUS_DISTRIBUTION, handleStatusDistribution);
      socketService.off(ANALYTICS_EVENTS.ACTIVITY, handleActivity);
      socketService.off(ANALYTICS_EVENTS.ACTIVITY_FEED, handleActivityFeed);
      socketService.off(ANALYTICS_EVENTS.ERROR, handleError);
      socketService.emit(ANALYTICS_EVENTS.UNSUBSCRIBE);
    };
  }, [user, navigate, loadInitialData]);

  /**
   * Load trends when period changes
   */
  useEffect(() => {
    const loadTrends = async () => {
      try {
        const trendsData = await getTrends(selectedPeriod);
        setTrends(trendsData);
      } catch (err) {
        console.error('Error loading trends:', err);
      }
    };

    if (!isLoading) {
      loadTrends();
    }
  }, [selectedPeriod, isLoading]);

  // Error state
  if (error && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-ink-muted">
          {error}
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-purple-600 text-on-lumen rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink dark:text-ink">
            Real-Time Analytics
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Monitor platform activity in real-time
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2 text-sm">
            {isSocketConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-green-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-400">Polling</span>
              </>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
              'bg-surface-200 border border-line',
              'hover:bg-surface-300',
              isRefreshing && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Metrics Cards */}
      <section>
        <LiveMetricsCards metrics={metrics} isLoading={isLoading} />
      </section>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="lg:col-span-2">
          <StatusDistribution
            data={statusDistribution}
            isLoading={isLoading}
          />
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <div className="bg-surface-200 rounded-xl p-6 shadow-sm border border-line">
            <ActivityFeed
              activities={activities}
              isLoading={isLoading}
              onActivityClick={handleActivityClick}
            />
          </div>
        </div>
      </div>

      {/* Trends section (optional - can be expanded) */}
      {trends && (
        <section className="bg-surface-200 rounded-xl p-6 shadow-sm border border-line">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink dark:text-ink">
              Trends
            </h3>
            <div className="flex gap-2">
              {(['24h', '7d', '30d', '90d'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-lg transition-colors',
                    selectedPeriod === period
                      ? 'bg-purple-900 text-purple-300'
                      : 'bg-surface-300 text-ink-muted hover:bg-surface-400'
                  )}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Simple trend summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface-300/50 rounded-lg">
              <p className="text-sm text-ink-muted">Total Bookings</p>
              <p className="text-2xl font-bold text-ink dark:text-ink">
                {trends.bookings.reduce((sum, b) => sum + (b.count || 0), 0)}
              </p>
            </div>
            <div className="p-4 bg-surface-300/50 rounded-lg">
              <p className="text-sm text-ink-muted">Total Revenue</p>
              <p className="text-2xl font-bold text-ink dark:text-ink">
                {analyticsService.formatCurrency(
                  trends.revenue.reduce((sum, r) => sum + (r.revenue || 0), 0)
                )}
              </p>
            </div>
            <div className="p-4 bg-surface-300/50 rounded-lg">
              <p className="text-sm text-ink-muted">New Users</p>
              <p className="text-2xl font-bold text-ink dark:text-ink">
                {trends.users.reduce((sum, u) => sum + (u.count || 0), 0)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer info */}
      <div className="text-center text-xs text-ink-muted">
        <p>
          Data refreshes automatically every 30 seconds via WebSocket.
          Last update: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleTimeString() : 'N/A'}
        </p>
      </div>
    </div>
  );
};

export default RealtimeDashboard;
