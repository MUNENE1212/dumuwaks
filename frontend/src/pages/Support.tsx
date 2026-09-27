import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  MessageSquare,
  FileText,
  Phone,
  Mail,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Loading from '@/components/ui/Loading';
import CustomerTicketModal from '@/components/support/CustomerTicketModal';
import { cn } from '@/lib/utils';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface SupportTicket {
  _id: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
    profilePicture?: string;
  };
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  subject: string;
  description: string;
  status: 'open' | 'assigned' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  subcategory?: string;
  messages?: Array<{
    sender: any;
    senderRole: string;
    message: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

interface NewTicketForm {
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
}

const SUPPORT_CATEGORIES = [
  { value: 'technical', label: 'Technical Issue', icon: AlertCircle },
  { value: 'billing', label: 'Billing & Payments', icon: FileText },
  { value: 'booking', label: 'Booking Issue', icon: MessageSquare },
  { value: 'account', label: 'Account & Profile', icon: HelpCircle },
  { value: 'other', label: 'Other', icon: MessageCircle },
];

const FAQ_ITEMS = [
  {
    question: 'How do I book a technician?',
    answer: 'Go to "Find Technicians", search by service category and location, then select a technician and create a booking.',
  },
  {
    question: 'Can I message a technician before booking?',
    answer: 'For your safety, you can only message technicians after creating a booking with them.',
  },
  {
    question: 'How do I cancel a booking?',
    answer: 'Go to "My Bookings", select the booking, and click the "Cancel Booking" button.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept M-Pesa, bank transfers, and credit/debit cards.',
  },
];

const Support: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newTicket, setNewTicket] = useState<NewTicketForm>({
    subject: '',
    category: 'technical',
    priority: 'medium',
    description: '',
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/support/tickets');
      setTickets(response.data.tickets || []);
    } catch (error: any) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);

      // Create support ticket
      const ticketResponse = await axios.post('/support/tickets', {
        subject: newTicket.subject,
        description: newTicket.description,
        category: newTicket.category,
        priority: newTicket.priority,
      });

      // Create support conversation
      const conversationResponse = await axios.post('/support/conversation', {
        ticketId: ticketResponse.data.ticket._id,
        message: newTicket.description,
      });

      toast.success('Support ticket created successfully!');
      setShowNewTicket(false);
      setNewTicket({
        subject: '',
        category: 'technical',
        priority: 'medium',
        description: '',
      });
      fetchTickets();
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      toast.error(error.response?.data?.message || 'Failed to create support ticket');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicketId(null);
  };

  const handleTicketUpdate = () => {
    fetchTickets();
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open':
        return {
          label: 'Open',
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/30',
          icon: Clock,
        };
      case 'assigned':
        return {
          label: 'Assigned',
          color: 'text-indigo-400',
          bgColor: 'bg-indigo-900/30',
          icon: AlertCircle,
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/30',
          icon: AlertCircle,
        };
      case 'waiting_customer':
        return {
          label: 'Waiting for You',
          color: 'text-orange-400',
          bgColor: 'bg-orange-900/30',
          icon: Clock,
        };
      case 'resolved':
        return {
          label: 'Resolved',
          color: 'text-green-400',
          bgColor: 'bg-green-900/30',
          icon: CheckCircle,
        };
      case 'closed':
        return {
          label: 'Closed',
          color: 'text-ink-muted',
          bgColor: 'bg-surface-300',
          icon: XCircle,
        };
      default:
        return {
          label: 'Open',
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/30',
          icon: Clock,
        };
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.subject?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.category?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading size="lg" text="Loading support tickets..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Support & Help Center</h1>
        <p className="mt-2 text-ink-muted">
          Get help with your bookings, account, and technical issues
        </p>
      </div>

      {/* Quick Contact */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <button className="flex items-center space-x-4 rounded-lg border border-line bg-surface-200 p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Phone className="h-6 w-6 text-primary-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-ink">Call Us</h3>
            <p className="text-sm text-ink-muted">+254 700 000 000</p>
          </div>
        </button>

        <button className="flex items-center space-x-4 rounded-lg border border-line bg-surface-200 p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-ink">Email Us</h3>
            <p className="text-sm text-ink-muted">support@handylink.com</p>
          </div>
        </button>

        <button
          onClick={() => setShowNewTicket(true)}
          className="flex items-center space-x-4 rounded-lg border-2 border-dashed border-primary-300 bg-primary-50 p-4 transition-colors hover:border-primary-500 hover:bg-primary-100"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-200">
            <Plus className="h-6 w-6 text-primary-700" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-primary-900">New Ticket</h3>
            <p className="text-sm text-primary-700">Create a support request</p>
          </div>
        </button>
      </div>

      {/* FAQ Section */}
      <div className="mb-8 rounded-lg border border-line bg-surface-200 p-6 shadow-sm">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-ink">
          <HelpCircle className="mr-2 h-5 w-5 text-primary-600" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((faq, index) => (
            <div key={index} className="rounded-lg border border-line">
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-surface-100 bg-surface-100"
              >
                <span className="font-medium text-ink">{faq.question}</span>
                <ChevronRight
                  className={cn(
                    'h-5 w-5 text-ink-muted transition-transform',
                    expandedFaq === index && 'rotate-90'
                  )}
                />
              </button>
              {expandedFaq === index && (
                <div className="border-t border-line bg-surface-100 p-4">
                  <p className="text-ink-muted">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Support Tickets Section */}
      <div className="rounded-lg border border-line bg-surface-200 shadow-sm">
        {/* Header */}
        <div className="border-b border-line p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">My Support Tickets</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowNewTicket(true)}
              className="flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-line-strong py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-ink-muted" />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_customer">Waiting for Response</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="divide-y divide-line">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-ink-muted" />
              <h3 className="mt-4 text-lg font-medium text-ink">No support tickets</h3>
              <p className="mt-2 text-ink-muted">
                {searchQuery || statusFilter !== 'all'
                  ? 'No tickets match your filters'
                  : 'Create a new ticket to get help from our support team'}
              </p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const statusConfig = getStatusConfig(ticket.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={ticket._id}
                  onClick={() => handleTicketClick(ticket._id)}
                  className="p-6 transition-colors hover:bg-surface-100/50 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-ink">
                            {ticket.subject}
                          </h3>
                          <span
                            className={cn(
                              'rounded-full px-3 py-1 text-xs font-semibold',
                              statusConfig.bgColor,
                              statusConfig.color
                            )}
                          >
                            <StatusIcon className="mr-1 inline h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </div>
                        {ticket.priority && (
                          <span className={cn(
                            'text-xs px-2 py-1 rounded-full',
                            ticket.priority === 'urgent' && 'bg-red-100 text-red-700',
                            ticket.priority === 'high' && 'bg-orange-100 text-orange-700',
                            ticket.priority === 'medium' && 'bg-yellow-100 text-yellow-700',
                            ticket.priority === 'low' && 'bg-surface-300 text-ink'
                          )}>
                            {ticket.priority.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
                        {ticket.description}
                      </p>

                      <div className="mt-3 flex items-center space-x-4 text-xs text-ink-muted">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {ticket.category}
                        </span>
                        <span>
                          Created {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                        </span>
                        {ticket.assignedTo && (
                          <span>
                            Assigned to {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-000 bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-surface-200 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-ink">Create Support Ticket</h2>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-muted">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="mt-1 w-full rounded-lg border border-line-strong px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Category"
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                >
                  {SUPPORT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Priority"
                  value={newTicket.priority}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, priority: e.target.value as any })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>

              <Textarea
                label="Description"
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                rows={6}
                placeholder="Please describe your issue in detail..."
                required
              />

              <div className="flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewTicket(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Ticket Detail Modal */}
      {selectedTicketId && (
        <CustomerTicketModal
          ticketId={selectedTicketId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleTicketUpdate}
        />
      )}
    </div>
  );
};

export default Support;
