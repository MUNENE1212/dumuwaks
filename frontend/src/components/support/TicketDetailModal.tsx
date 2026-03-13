import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Calendar, Tag, AlertCircle, CheckCircle, Clock, FileText, Package } from 'lucide-react';
import { format } from 'date-fns';
import { getTicketDetails, addTicketMessage, updateTicketStatus, TicketDetails } from '@/services/support.service';
import { useAppSelector } from '@/store/hooks';
import Loading from '@/components/ui/Loading';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';

interface TicketDetailModalProps {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticketId, isOpen, onClose, onUpdate }) => {
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTicketStatus(ticketId, newStatus as 'open' | 'assigned' | 'in_progress' | 'waiting_customer' | 'waiting_internal' | 'resolved' | 'closed' | 'reopened');
      await fetchTicketDetails();
      toast.success(`Ticket status updated to ${newStatus}`);
      if (onUpdate) onUpdate();
    } catch (error: unknown) {
      console.error('Error updating status:', error);
      toast.error(getErrorMessage(error, 'Failed to update status'));
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'text-orange-600 dark:text-orange-400',
      assigned: 'text-blue-600 dark:text-blue-400',
      in_progress: 'text-blue-600 dark:text-blue-400',
      resolved: 'text-green-600 dark:text-green-400',
      closed: 'text-gray-600 dark:text-gray-400',
      waiting_customer: 'text-yellow-600 dark:text-yellow-400',
      waiting_internal: 'text-purple-600 dark:text-purple-400',
      reopened: 'text-red-600 dark:text-red-400',
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col" role="dialog" aria-modal="true" aria-labelledby="ticket-detail-title">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            {isLoading ? (
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ) : (
              <>
                <h2 id="ticket-detail-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {ticket?.subject}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Ticket #{ticket?.ticketNumber || ticket?._id}
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                              {msg.sender?.firstName?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {msg.sender?.firstName} {msg.sender?.lastName}
                              {isSupport && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                                  Support
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Message bubble */}
                          <div
                            className={`px-4 py-3 rounded-lg ${
                              isOwnMessage
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          </div>

                          {/* Timestamp */}
                          <div className={`mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(msg.timestamp), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FileText className="h-12 w-12 mb-2" />
                    <p>No messages yet</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    disabled={isSending || ticket.status === 'closed'}
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || isSending || ticket.status === 'closed'}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar - Ticket Info */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {typeof ticket.customer === 'object' ? `${ticket.customer.firstName} ${ticket.customer.lastName}` : ticket.customerDetails ? `${ticket.customerDetails.firstName} ${ticket.customerDetails.lastName}` : 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{typeof ticket.customer === 'object' ? ticket.customer.email : ticket.customerDetails?.email || 'N/A'}</p>
                  {(typeof ticket.customer === 'object' && ticket.customer.phoneNumber) || (ticket.customerDetails?.phoneNumber) ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{typeof ticket.customer === 'object' ? ticket.customer.phoneNumber : ticket.customerDetails?.phoneNumber}</p>
                  ) : null}
                </div>
              </div>

              {/* Status & Priority */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      disabled={ticket.status === 'closed'}
                    >
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_customer">Waiting Customer</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Priority</label>
                    <div className={`mt-1 px-3 py-2 rounded-lg text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Category</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {ticket.category.replace('_', ' ').charAt(0).toUpperCase() + ticket.category.slice(1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Created:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {ticket.assignedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Assigned:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {format(new Date(ticket.assignedAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  )}
                  {ticket.resolvedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Resolved:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {format(new Date(ticket.resolvedAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Booking */}
              {ticket.relatedBooking && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Related Booking
                  </h3>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Service:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {(ticket.relatedBooking as any)?.service?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Technician:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {(ticket.relatedBooking as any)?.technician?.firstName} {(ticket.relatedBooking as any)?.technician?.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {(ticket.relatedBooking as any)?.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Failed to load ticket details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetailModal;
