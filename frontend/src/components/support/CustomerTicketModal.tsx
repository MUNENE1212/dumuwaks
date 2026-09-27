import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Calendar, Tag, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { getTicketDetails, addTicketMessage, TicketDetails } from '@/services/support.service';
import { useAppSelector } from '@/store/hooks';
import Loading from '@/components/ui/Loading';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';

interface CustomerTicketModalProps {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const CustomerTicketModal: React.FC<CustomerTicketModalProps> = ({ ticketId, isOpen, onClose, onUpdate }) => {
  const { user } = useAppSelector((state) => state.auth);
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicketDetails();
    }
  }, [isOpen, ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const fetchTicketDetails = async () => {
    try {
      setIsLoading(true);
      const data = await getTicketDetails(ticketId);
      setTicket(data);
    } catch (error: unknown) {
      console.error('Error fetching ticket details:', error);
      toast.error(getErrorMessage(error, 'Failed to load ticket details'));
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setIsSending(true);
      await addTicketMessage(ticketId, message);
      setMessage('');
      await fetchTicketDetails();
      toast.success('Message sent successfully');
      if (onUpdate) onUpdate();
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      toast.error(getErrorMessage(error, 'Failed to send message'));
    } finally {
      setIsSending(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-surface-200 text-ink-muted',
      medium: 'bg-blue-900/30 text-blue-300',
      high: 'bg-orange-900/30 text-orange-300',
      urgent: 'bg-red-900/30 text-red-300',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Open',
      assigned: 'Assigned',
      in_progress: 'In Progress',
      waiting_customer: 'Waiting for Your Response',
      waiting_internal: 'Waiting for Support',
      resolved: 'Resolved',
      closed: 'Closed',
      reopened: 'Reopened',
    };
    return labels[status] || status;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface-000/50" onClick={onClose}></div>

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 bg-surface-100 rounded-lg shadow-xl flex flex-col" role="dialog" aria-modal="true" aria-labelledby="customer-ticket-title">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex-1">
            {isLoading ? (
              <div className="h-6 w-48 bg-surface-300 rounded animate-pulse"></div>
            ) : (
              <>
                <h2 id="customer-ticket-title" className="text-xl font-semibold text-ink">
                  {ticket?.subject}
                </h2>
                <p className="text-sm text-ink-muted mt-1">
                  Ticket #{ticket?.ticketNumber || ticket?._id}
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loading size="lg" text="Loading ticket details..." />
          </div>
        ) : ticket ? (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Messages Section */}
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {ticket.messages && ticket.messages.length > 0 ? (
                  ticket.messages.map((msg) => {
                    const isOwnMessage = msg.sender?._id === user?.id;
                    const isSupport = msg.senderRole === 'support' || msg.senderRole === 'admin';

                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                          {/* Sender info */}
                          <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`h-6 w-6 rounded-full ${isSupport ? ' bg-purple-400' : ' bg-blue-400'} flex items-center justify-center text-ink text-xs font-semibold`}>
                              {msg.sender?.firstName?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm font-medium text-ink">
                              {msg.sender?.firstName} {msg.sender?.lastName}
                              {isSupport && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded">
                                  Support Team
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Message bubble */}
                          <div
                            className={`px-4 py-3 rounded-lg ${
                              isOwnMessage
                                ? 'bg-cyan-600 text-on-lumen'
                                : 'bg-surface-200 text-ink'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          </div>

                          {/* Timestamp */}
                          <div className={`mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                            <span className="text-xs text-ink-muted">
                              {format(new Date(msg.timestamp), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-ink-muted">
                    <FileText className="h-12 w-12 mb-2" />
                    <p>No messages yet</p>
                    <p className="text-sm mt-1">Start the conversation by sending a message</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-line">
                {ticket.status === 'closed' ? (
                  <div className="flex items-center justify-center gap-2 text-ink-muted py-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">This ticket is closed. You cannot send new messages.</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-line-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-surface-200 text-ink"
                      disabled={isSending}
                    />
                    <button
                      type="submit"
                      disabled={!message.trim() || isSending}
                      className="px-4 py-2 bg-cyan-600 text-on-lumen rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {isSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Sidebar - Ticket Info */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-line overflow-y-auto p-6 space-y-6">
              {/* Status & Priority */}
              <div>
                <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Ticket Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-ink-muted">Status</label>
                    <div className={`mt-1 px-3 py-2 rounded-lg text-sm font-medium ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted">Priority</label>
                    <div className={`mt-1 px-3 py-2 rounded-lg text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted">Category</label>
                    <p className="mt-1 text-sm text-ink">
                      {ticket.category.replace('_', ' ').charAt(0).toUpperCase() + ticket.category.slice(1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assigned Agent */}
              {ticket.assignedTo && (
                <div>
                  <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assigned Support Agent
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-ink font-medium">
                      {typeof ticket.assignedTo === 'object' ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : ticket.assignedToDetails ? `${ticket.assignedToDetails.firstName} ${ticket.assignedToDetails.lastName}` : 'Unknown Agent'}
                    </p>
                    <p className="text-sm text-ink-muted">{typeof ticket.assignedTo === 'object' ? ticket.assignedTo.email : ticket.assignedToDetails?.email || 'N/A'}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div>
                <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Created:</span>
                    <span className="text-ink">
                      {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {ticket.assignedAt && (
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Assigned:</span>
                      <span className="text-ink">
                        {format(new Date(ticket.assignedAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  )}
                  {ticket.resolvedAt && (
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Resolved:</span>
                      <span className="text-ink">
                        {format(new Date(ticket.resolvedAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Original Description
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              {/* Help Notice */}
              {ticket.status === 'waiting_customer' && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-200">
                      The support team is waiting for your response. Please reply to continue.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-ink-muted mx-auto mb-4" />
              <p className="text-ink-muted">Failed to load ticket details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerTicketModal;
