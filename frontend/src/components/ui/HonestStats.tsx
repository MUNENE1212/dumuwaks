import React, { useEffect, useState } from 'react';
import { Users, Wrench, Calendar, Star, Info, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import axios from '@/lib/axios';

/**
 * HonestStats - Displays real platform statistics from live database
 * No hardcoded numbers, no inflated claims, just honest data
 */
export const HonestStats: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [stats, setStats] = useState<{
    totalCustomers: number;
    totalTechnicians: number;
    activeTechnicians: number;
    totalBookings: number;
    averageRating: number;
    totalReviews: number;
    lastUpdated: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get('/public/stats');
        setStats(response.data.data);
      } catch (err: any) {
        console.error('Failed to fetch stats:', err);
        setError('Unable to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 text-center bg-surface-200 border border-line rounded-lg">
              <div className="h-6 w-16 mx-auto mb-2 bg-surface-300 rounded animate-pulse" />
              <div className="h-4 w-20 mx-auto bg-surface-300 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={cn('w-full', className)}>
        <p className="text-red-400 text-sm text-center p-4 bg-red-900/20 rounded-lg">
          {error || 'Statistics temporarily unavailable'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* Real Customers - Not inflated */}
        <div className="flex items-center gap-3 p-4 bg-surface-200 border border-line rounded-lg hover:border-purple-500 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 text-on-lumen flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl md:text-2xl font-bold text-ink dark:text-ink leading-tight">
              {stats.totalCustomers.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-ink-muted mt-0.5">
              Real Customers
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              Verified users
            </div>
          </div>
        </div>

        {/* Technicians - Active vs Total */}
        <div className="flex items-center gap-3 p-4 bg-surface-200 border border-line rounded-lg hover:border-purple-500 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 text-on-lumen flex-shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl md:text-2xl font-bold text-ink dark:text-ink leading-tight">
              {stats.totalTechnicians}
            </div>
            <div className="text-xs font-semibold text-ink-muted mt-0.5">
              Technicians
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              {stats.activeTechnicians} active now
            </div>
          </div>
        </div>

        {/* Completed Bookings - Real transactions */}
        <div className="flex items-center gap-3 p-4 bg-surface-200 border border-line rounded-lg hover:border-purple-500 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 text-on-lumen flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl md:text-2xl font-bold text-ink dark:text-ink leading-tight">
              {stats.totalBookings.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-ink-muted mt-0.5">
              Completed Bookings
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              Real transactions
            </div>
          </div>
        </div>

        {/* Average Rating - Honest */}
        <div className="flex items-center gap-3 p-4 bg-surface-200 border border-line rounded-lg hover:border-purple-500 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 text-on-lumen flex-shrink-0">
            <Star className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl md:text-2xl font-bold text-ink dark:text-ink leading-tight">
              {stats.averageRating.toFixed(1)}★
            </div>
            <div className="text-xs font-semibold text-ink-muted mt-0.5">
              Average Rating
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              From {stats.totalReviews} reviews
            </div>
          </div>
        </div>
      </div>

      {/* Data Source Transparency */}
      <div className="flex items-center gap-2 p-3 bg-surface-100/50 rounded-lg text-xs text-ink-muted">
        <Activity className="w-4 h-4 flex-shrink-0" />
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1">
          Live from database • Updated {formatDistanceToNow(new Date(stats.lastUpdated))} ago
        </span>
      </div>
    </div>
  );
};
