import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchDashboardStats, fetchRecentActivity } from '@/store/slices/dashboardSlice';
import { motion } from 'framer-motion';
import {
  User, Calendar, MessageSquare, Star, RefreshCw,
  ArrowRight, Search, Briefcase, TrendingUp, Clock,
  ChevronRight, Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Feed from '@/components/social/Feed';
import Loading from '@/components/ui/Loading';
import EmailVerificationBanner from '@/components/common/EmailVerificationBanner';
import AdminDashboard from './AdminDashboard';
import SupportDashboard from './SupportDashboard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { stats, recentActivity, isLoading } = useAppSelector((state) => state.dashboard);

  // Route to role-specific dashboard
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user?.role === 'support') {
    return <SupportDashboard />;
  }

  // Fetch dashboard data on mount
  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchRecentActivity(10));
  }, [dispatch]);

  const displayStats = [
    {
      name: 'Total Bookings',
      value: stats?.totalBookings?.toString() || '0',
      icon: Calendar,
      subtext: stats?.completedBookings
        ? `${stats.completedBookings} completed`
        : 'No bookings yet',
      trend: stats?.completedBookings ? 'positive' : 'neutral',
      accent: 'circuit',
    },
    {
      name: 'Active',
      value: stats?.activeBookings?.toString() || '0',
      icon: Clock,
      subtext: stats?.pendingBookings
        ? `${stats.pendingBookings} pending`
        : 'No pending',
      trend: 'neutral',
      accent: 'wrench',
    },
    {
      name: 'Messages',
      value: stats?.unreadMessages?.toString() || '0',
      icon: MessageSquare,
      subtext: stats?.unreadMessages
        ? `${stats.unreadMessages} unread`
        : 'All caught up',
      trend: stats?.unreadMessages ? 'neutral' : 'positive',
      accent: 'circuit',
    },
    {
      name: user?.role === 'customer' ? 'Spent' : 'Earned',
      value: stats?.totalEarnings
        ? `KSh ${stats.totalEarnings.toLocaleString()}`
        : stats?.totalSpent
        ? `KSh ${stats.totalSpent.toLocaleString()}`
        : 'KSh 0',
      icon: TrendingUp,
      subtext: stats?.averageRating
        ? `${stats.averageRating.toFixed(1)} avg rating`
        : 'No ratings yet',
      trend: stats?.averageRating && stats.averageRating >= 4 ? 'positive' : 'neutral',
      accent: 'success',
    },
  ];

  const quickActions = user?.role === 'customer'
    ? [
        {
          icon: Search,
          label: 'Find Technicians',
          description: 'Search for skilled professionals',
          path: '/find-technicians',
          accent: 'circuit',
        },
        {
          icon: Calendar,
          label: 'New Booking',
          description: 'Create a service booking',
          path: '/booking-flow',
          accent: 'wrench',
        },
      ]
    : [
        {
          icon: Briefcase,
          label: 'View Requests',
          description: 'Check booking requests',
          path: '/bookings',
          accent: 'circuit',
        },
        {
          icon: Sparkles,
          label: 'Update Portfolio',
          description: 'Showcase your work',
          path: '/settings',
          accent: 'wrench',
        },
      ];

  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div className="pb-20 md:pb-0">
      <EmailVerificationBanner />
      {/* Welcome Header */}
      <motion.div
        {...fadeUp}
        transition={{ delay: 0.05 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-bone sm:text-3xl">
              Welcome back, {user?.firstName}
            </h1>
            <p className="mt-1 text-sm text-steel sm:text-base">
              {user?.role === 'customer'
                ? 'Find services and connect with the community'
                : 'Manage your bookings and showcase your work'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Row - Horizontal scroll on mobile */}
      <motion.div
        {...fadeUp}
        transition={{ delay: 0.1 }}
        className="mb-6 sm:mb-8"
      >
        {isLoading && !stats ? (
          <div className="flex justify-center py-8">
            <Loading size="md" text="Loading stats..." />
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0">
            {displayStats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="min-w-[140px] snap-start flex-shrink-0 sm:min-w-0 sm:flex-shrink"
                >
                  <div className="glass-card rounded-2xl p-4 h-full transition-all duration-200 hover:shadow-led">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        stat.accent === 'circuit' ? 'bg-lumen/15' :
                        stat.accent === 'wrench' ? 'bg-wrench/15' :
                        'bg-emerald-500/15'
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          stat.accent === 'circuit' ? 'text-lumen-ink' :
                          stat.accent === 'wrench' ? 'text-wrench' :
                          'text-emerald-400'
                        }`} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-bone">{stat.value}</p>
                    <p className="text-xs text-steel mt-0.5">{stat.name}</p>
                    <p className={`text-xs mt-1 ${
                      stat.trend === 'positive' ? 'text-emerald-400' : 'text-steel/60'
                    }`}>
                      {stat.subtext}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        {...fadeUp}
        transition={{ delay: 0.2 }}
        className="mb-6 sm:mb-8"
      >
        <h2 className="text-base font-semibold text-bone mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="glass-card rounded-2xl p-4 text-left transition-all duration-200 hover:shadow-led hover:border-strong group"
              >
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                  action.accent === 'circuit' ? 'bg-lumen/15' : 'bg-wrench/15'
                }`}>
                  <Icon className={`h-5 w-5 ${
                    action.accent === 'circuit' ? 'text-lumen-ink' : 'text-wrench'
                  }`} />
                </div>
                <h3 className="font-medium text-bone text-sm">{action.label}</h3>
                <p className="text-xs text-steel mt-0.5">{action.description}</p>
                <ArrowRight className="mt-2 h-4 w-4 text-steel/40 transition-transform group-hover:translate-x-1 group-hover:text-lumen-ink" />
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Main Content - Feed + Activity */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Feed */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.3 }}
          className="lg:col-span-8"
        >
          <Feed />
        </motion.div>

        {/* Sidebar - Recent Activity */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.35 }}
          className="lg:col-span-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-bone">Recent Activity</h2>
            <button
              onClick={() => dispatch(fetchRecentActivity(10))}
              disabled={isLoading}
              className="text-steel hover:text-bone disabled:opacity-50 transition-colors"
              title="Refresh activity"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4">
              {isLoading && recentActivity.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loading size="sm" text="Loading activity..." />
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-steel/30" />
                  <p className="text-sm text-steel">No recent activity</p>
                  <p className="text-xs text-steel/60 mt-1">Your activity will show up here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity) => {
                    const iconConfig = getActivityIcon(activity.type, activity.status);
                    const Icon = iconConfig.icon;

                    return (
                      <div key={activity._id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-surface-300/50 transition-colors">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconConfig.bg}`}>
                          <Icon className={`h-4 w-4 ${iconConfig.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-bone truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-steel truncate mt-0.5">
                            {activity.description}
                          </p>
                          <p className="text-xs text-steel/50 mt-1">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {recentActivity.length > 0 && (
              <button
                onClick={() => navigate('/bookings')}
                className="flex w-full items-center justify-center gap-2 border-t border-line p-3 text-sm text-lumen-ink hover:bg-surface-300/50 transition-colors"
              >
                View all activity
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Helper function to get icon configuration
const getActivityIcon = (type: string, status?: string) => {
  if (type === 'booking') {
    if (status === 'completed') {
      return { icon: Calendar, bg: 'bg-emerald-500/15', color: 'text-emerald-400' };
    }
    if (status === 'cancelled' || status === 'disputed') {
      return { icon: Calendar, bg: 'bg-red-500/15', color: 'text-red-400' };
    }
    return { icon: Calendar, bg: 'bg-lumen/15', color: 'text-lumen-ink' };
  }

  if (type === 'message') {
    return { icon: MessageSquare, bg: 'bg-lumen/15', color: 'text-lumen-ink' };
  }

  if (type === 'review') {
    return { icon: Star, bg: 'bg-amber-500/15', color: 'text-amber-400' };
  }

  if (type === 'payment') {
    return { icon: TrendingUp, bg: 'bg-emerald-500/15', color: 'text-emerald-400' };
  }

  return { icon: User, bg: 'bg-surface-300', color: 'text-steel' };
};

export default Dashboard;
