import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Star,
  RefreshCw,
  Filter,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { getCompleteDashboard, SupportDashboardStats, SupportTicket } from '@/services/support.service';
import Loading from '@/components/ui/Loading';
import TicketDetailModal from '@/components/support/TicketDetailModal';
import WhatsAppOnboarding from '@/components/support/WhatsAppOnboarding';
import toast from 'react-hot-toast';

const SupportDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [stats, setStats] = useState<SupportDashboardStats | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getCompleteDashboard('today', filter);
        setStats(data.stats);
        setTickets(data.tickets);
      } catch (err: any) {
        console.error('Error loading support dashboard:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [filter]);

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicketId(null);
  };

  const handleTicketUpdate = async () => {
    // Refresh tickets after update
    try {
      const data = await getCompleteDashboard('today', filter);
      setStats(data.stats);
      setTickets(data.tickets);
    } catch (err: any) {
      console.error('Error refreshing dashboard:', err);
    }
  };

  const handleWhatsAppOnboardingComplete = () => {
    setIsWhatsAppModalOpen(false);
    // Optionally refresh dashboard data
    handleTicketUpdate();
    toast.success('WhatsApp onboarding completed successfully!');
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-surface-200 text-ink-muted',
      medium: 'bg-blue-900/30 text-blue-300',
      high: 'bg-orange-900/30 text-orange-300',
      urgent: 'bg-red-900/30 text-red-300',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'text-orange-400',
      assigned: 'text-blue-400',
      in_progress: 'text-blue-400',
      resolved: 'text-green-400',
      closed: 'text-ink-muted',
      waiting_customer: 'text-yellow-400',
      waiting_internal: 'text-purple-400',
      reopened: 'text-red-400',
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading size="lg" text="Loading support dashboard..." />
      </div>
    );
  }

  // Show error state
  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-ink-muted">
          {error || 'Failed to load dashboard data'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-cyan-600 text-on-lumen rounded-lg hover:bg-cyan-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-cyan-600" />
            Support Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Welcome back, {user?.firstName}! Let's help some customers today.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-800 rounded-lg">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm font-medium text-green-300">Active</span>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ink">{stats.openTickets}</div>
            <p className="text-xs text-ink-muted mt-1">
              {stats.inProgressTickets} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ink">{stats.resolvedToday}</div>
            <p className="text-xs text-ink-muted mt-1">
              {stats.totalResolved} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ink">{stats.avgResponseTime}m</div>
            <p className="text-xs text-ink-muted mt-1">
              {stats.agentStats.averageResponseTime}m agent avg
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ink">{stats.satisfactionRating.toFixed(1)}</div>
            <p className="text-xs text-ink-muted mt-1">
              Based on {stats.totalRatings} ratings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Tickets List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Support Tickets</CardTitle>
                <button className="p-2 hover:bg-surface-200 rounded-lg transition-colors">
                  <RefreshCw className="h-4 w-4 text-ink-muted" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {(['all', 'open', 'in_progress', 'resolved'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                      filter === f
                        ? 'bg-cyan-600 text-on-lumen'
                        : 'bg-surface-200 text-ink-muted hover:bg-surface-300'
                    )}
                  >
                    {f.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-ink-muted mx-auto mb-3" />
                    <p className="text-ink-muted">No tickets in this category</p>
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <div
                      key={ticket._id}
                      onClick={() => handleTicketClick(ticket._id)}
                      className="p-4 border border-line rounded-lg hover:shadow-md hover:shadow-gray-800 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-ink-muted">
                              {ticket.ticketNumber || ticket._id}
                            </span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getPriorityColor(ticket.priority))}>
                              {ticket.priority.toUpperCase()}
                            </span>
                            {ticket.isEscalated && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-900/30 text-red-300">
                                ESCALATED
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-ink truncate">
                            {ticket.subject}
                          </h4>
                          <div className="flex items-center gap-3 mt-2 text-xs text-ink-muted">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {typeof ticket.customer === 'object' ? `${ticket.customer.firstName} ${ticket.customer.lastName}` : ticket.customerDetails ? `${ticket.customerDetails.firstName} ${ticket.customerDetails.lastName}` : 'Unknown'}
                            </span>
                            <span>•</span>
                            <span>{ticket.category}</span>
                            {ticket.messageCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="h-3 w-3" />
                                  {ticket.messageCount}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={cn('text-sm font-medium capitalize', getStatusColor(ticket.status))}>
                            {ticket.status.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-ink-muted mt-1">
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Stats & Quick Actions */}
        <div className="space-y-6">
          {/* Your Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Your Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-ink-muted">Tickets Handled</span>
                    <span className="font-semibold text-ink">
                      {stats.agentStats.ticketsHandled}
                    </span>
                  </div>
                  <div className="w-full bg-surface-300 rounded-full h-2">
                    <div
                      className="bg-cyan-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((stats.agentStats.ticketsHandled / (stats.agentStats.ticketsHandled + 50)) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-ink-muted">Resolution Rate</span>
                    <span className="font-semibold text-green-400">
                      {stats.agentStats.ticketsHandled > 0
                        ? ((stats.agentStats.ticketsClosed / stats.agentStats.ticketsHandled) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-300 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${stats.agentStats.ticketsHandled > 0
                          ? ((stats.agentStats.ticketsClosed / stats.agentStats.ticketsHandled) * 100)
                          : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-ink-muted">Customer Satisfaction</span>
                    <span className="font-semibold text-yellow-400">
                      {stats.agentStats.satisfactionRating.toFixed(1)} / 5.0
                    </span>
                  </div>
                  <div className="w-full bg-surface-300 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${(stats.agentStats.satisfactionRating / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="w-full px-3 py-2 text-sm bg-green-600 text-on-lumen rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  WhatsApp Onboarding
                </button>
                <button className="w-full px-3 py-2 text-sm bg-cyan-600 text-on-lumen rounded-lg hover:bg-cyan-700 transition-colors">
                  View All Tickets
                </button>
                <button className="w-full px-3 py-2 text-sm bg-surface-200 text-ink rounded-lg hover:bg-surface-300 transition-colors">
                  Knowledge Base
                </button>
                <button className="w-full px-3 py-2 text-sm bg-surface-200 text-ink rounded-lg hover:bg-surface-300 transition-colors">
                  View Reports
                </button>
                <button className="w-full px-3 py-2 text-sm bg-surface-200 text-ink rounded-lg hover:bg-surface-300 transition-colors">
                  Set Status
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">Shift Start</span>
                  <span className="font-medium text-ink">08:00 AM</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">Shift End</span>
                  <span className="font-medium text-ink">05:00 PM</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">Lunch Break</span>
                  <span className="font-medium text-ink">12:00 - 01:00 PM</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleTicketUpdate}
        />
      )}

      {/* WhatsApp Onboarding Modal */}
      <WhatsAppOnboarding
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onComplete={handleWhatsAppOnboardingComplete}
      />
    </div>
  );
};

export default SupportDashboard;
