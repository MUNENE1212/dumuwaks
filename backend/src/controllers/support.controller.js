const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Booking = require('../models/Booking');
const bcrypt = require('bcryptjs');

/**
 * @desc    Create a support ticket
 * @route   POST /api/v1/support/tickets
 * @access  Private
 */
exports.createTicket = async (req, res) => {
  try {
    const {
      subject,
      description,
      category,
      subcategory,
      priority,
      relatedBooking,
      relatedTransaction,
      attachments,
      tags
    } = req.body;

    // Validate user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Set SLA targets based on priority
    const slaTargets = {
      urgent: { firstResponse: 15, resolution: 120 },   // 15 min, 2 hours
      high: { firstResponse: 30, resolution: 240 },     // 30 min, 4 hours
      medium: { firstResponse: 60, resolution: 480 },   // 1 hour, 8 hours
      low: { firstResponse: 120, resolution: 1440 }     // 2 hours, 24 hours
    };

    const ticketPriority = priority || 'medium';
    const slaTarget = slaTargets[ticketPriority];

    const userId = req.user._id || req.user.id;

    const ticket = await SupportTicket.create({
      customer: userId,
      subject,
      description,
      category,
      subcategory,
      priority: ticketPriority,
      relatedBooking,
      relatedTransaction,
      attachments: attachments || [],
      tags: tags || [],
      source: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      sla: {
        firstResponseTime: {
          target: slaTarget.firstResponse
        },
        resolutionTime: {
          target: slaTarget.resolution
        }
      }
    });

    // Add initial message
    ticket.addMessage(
      userId,
      'customer',
      description,
      attachments || []
    );

    await ticket.save();

    // Notify support team and auto-assign
    try {
      const { emitToUser } = require('../config/socket');
      const notificationService = require('../services/notification.service');

      // Auto-assign based on category and agent availability
      const supportAgents = await User.find({ role: 'support' }).select('_id firstName lastName');
      if (supportAgents.length > 0) {
        // Pick agent with lowest open ticket count
        const SupportTicket = require('../models/SupportTicket');
        let bestAgent = supportAgents[0];
        let lowestCount = Infinity;
        for (const agent of supportAgents) {
          const count = await SupportTicket.countDocuments({
            'assignedTo.agent': agent._id,
            status: { $in: ['open', 'in_progress'] }
          });
          if (count < lowestCount) {
            lowestCount = count;
            bestAgent = agent;
          }
        }
        ticket.assignedTo = { agent: bestAgent._id, assignedAt: new Date() };
        await ticket.save();

        // Notify the assigned agent
        await notificationService.createNotification(bestAgent._id, {
          type: 'system_update',
          title: 'New Support Ticket',
          body: `Ticket #${ticket.ticketNumber}: ${subject}`,
          category: 'system',
          priority: priority === 'urgent' || priority === 'high' ? 'high' : 'normal'
        });
        emitToUser(bestAgent._id.toString(), 'ticket:assigned', { ticketId: ticket._id });
      }

      // Notify all support staff of new ticket
      for (const agent of supportAgents) {
        emitToUser(agent._id.toString(), 'ticket:new', { ticketId: ticket._id, category });
      }
    } catch (notifError) {
      console.error('Support notification error:', notifError);
    }

    await ticket.populate([
      { path: 'customer', select: 'firstName lastName email phoneNumber' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error creating support ticket',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * @desc    Get all tickets (with filters)
 * @route   GET /api/v1/support/tickets
 * @access  Private
 */
exports.getTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      assignedTo,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = {};
    const userId = req.user._id || req.user.id;

    // Role-based filtering
    if (req.user.role === 'customer') {
      query.customer = userId;
    } else if (req.user.role === 'support') {
      // Support agents see assigned tickets or unassigned
      if (!assignedTo) {
        query.$or = [
          { assignedTo: userId },
          { status: 'open', assignedTo: { $exists: false } }
        ];
      } else if (assignedTo === 'me') {
        query.assignedTo = userId;
      }
    }
    // Admin sees all tickets

    // Filters (ignore 'all' as it means no filter)
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (category && category !== 'all') query.category = category;
    if (assignedTo && assignedTo !== 'me' && assignedTo !== 'all') query.assignedTo = assignedTo;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Debug logging

    const tickets = await SupportTicket.find(query)
      .populate('customer', 'firstName lastName email phoneNumber profilePicture')
      .populate('assignedTo', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SupportTicket.countDocuments(query);
    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      tickets
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tickets'
    });
  }
};

/**
 * @desc    Get single ticket
 * @route   GET /api/v1/support/tickets/:id
 * @access  Private
 */
exports.getTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('customer', 'firstName lastName email phoneNumber profilePicture')
      .populate('assignedTo', 'firstName lastName email profilePicture')
      .populate('messages.sender', 'firstName lastName profilePicture role')
      .populate({
        path: 'relatedBooking',
        populate: {
          path: 'technician customer service',
          select: 'firstName lastName email phoneNumber profilePicture name description'
        }
      })
      .populate('relatedTransaction');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check authorization - support agents can view all tickets
    const userId = req.user._id || req.user.id;
    const customerId = ticket.customer._id || ticket.customer;
    const assignedToId = ticket.assignedTo?._id || ticket.assignedTo;

    const isAuthorized =
      customerId.toString() === userId.toString() ||
      (assignedToId && assignedToId.toString() === userId.toString()) ||
      req.user.role === 'admin' ||
      req.user.role === 'support';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this ticket'
      });
    }

    // Filter internal notes/messages for customers
    if (req.user.role === 'customer') {
      ticket.messages = ticket.messages.filter(m => !m.isInternal);
      ticket.internalNotes = undefined;
    }

    res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Add message to ticket
 * @route   POST /api/v1/support/tickets/:id/messages
 * @access  Private
 */
exports.addMessage = async (req, res) => {
  try {
    const { message, attachments, isInternal } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Check authorization
    const isAuthorized =
      ticket.customer.toString() === req.user.id ||
      ticket.assignedTo?.toString() === req.user.id ||
      req.user.role === 'admin' ||
      req.user.role === 'support';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add message to this ticket'
      });
    }

    // Only support/admin can add internal messages
    const messageIsInternal = (isInternal && (req.user.role === 'support' || req.user.role === 'admin'));

    // Determine sender role
    let senderRole = 'customer';
    if (req.user.role === 'support') senderRole = 'support';
    if (req.user.role === 'admin') senderRole = 'admin';

    ticket.addMessage(
      req.user.id,
      senderRole,
      message,
      attachments || [],
      messageIsInternal
    );

    // Update status if customer responds
    if (ticket.status === 'waiting_customer' && req.user.role === 'customer') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    await ticket.populate('messages.sender', 'firstName lastName profilePicture role');

    // Send notification and real-time update
    try {
      const notificationService = require('../services/notification.service');
      const { emitToUser } = require('../config/socket');

      // Determine who to notify
      const customerId = ticket.customer?.toString();
      const agentId = ticket.assignedTo?.agent?.toString();
      const recipientId = req.user.role === 'customer' ? agentId : customerId;

      if (recipientId && !messageIsInternal) {
        await notificationService.createNotification(recipientId, {
          type: 'system_update',
          title: 'New Support Message',
          body: `New message on ticket #${ticket.ticketNumber}`,
          category: 'system',
          priority: 'normal'
        });
        emitToUser(recipientId, 'support:message', {
          ticketId: ticket._id,
          messageId: ticket.messages[ticket.messages.length - 1]._id
        });
      }
    } catch (notifError) {
      console.error('Support message notification error:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Message added successfully',
      newMessage: ticket.messages[ticket.messages.length - 1]
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding message'
    });
  }
};

/**
 * @desc    Assign ticket to support agent
 * @route   PUT /api/v1/support/tickets/:id/assign
 * @access  Private (Support/Admin)
 */
exports.assignTicket = async (req, res) => {
  try {
    const { agentId } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Verify agent exists and has support role
    const agent = await User.findById(agentId);
    if (!agent || (agent.role !== 'support' && agent.role !== 'admin')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid support agent'
      });
    }

    // Check agent workload
    const workload = await SupportTicket.getAgentWorkload(agentId);
    const maxTickets = agent.supportInfo?.availability?.maxConcurrentTickets || 5;

    if (workload >= maxTickets) {
      return res.status(400).json({
        success: false,
        message: `Agent has reached maximum concurrent tickets (${maxTickets})`,
        currentWorkload: workload
      });
    }

    ticket.assignToAgent(agentId, req.user.id);

    await ticket.save();

    await ticket.populate('assignedTo', 'firstName lastName email');

    // Notify assigned agent
    try {
      const notificationService = require('../services/notification.service');
      const { emitToUser } = require('../config/socket');
      await notificationService.createNotification(agentId, {
        type: 'system_update',
        title: 'Ticket Assigned',
        body: `You have been assigned ticket #${ticket.ticketNumber}`,
        category: 'system',
        priority: 'high'
      });
      emitToUser(agentId, 'ticket:assigned', { ticketId: ticket._id });
    } catch (notifError) {
      console.error('Agent notification error:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Ticket assigned successfully',
      ticket
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning ticket'
    });
  }
};

/**
 * @desc    Update ticket status
 * @route   PUT /api/v1/support/tickets/:id/status
 * @access  Private (Support/Admin)
 */
exports.updateStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.status = status;
    ticket._currentUser = req.user.id;

    if (notes) {
      ticket.addInternalNote(notes, req.user.id);
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ticket status'
    });
  }
};

/**
 * @desc    Update ticket priority
 * @route   PUT /api/v1/support/tickets/:id/priority
 * @access  Private (Support/Admin)
 */
exports.updatePriority = async (req, res) => {
  try {
    const { priority } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.priority = priority;
    ticket.addInternalNote(`Priority changed to ${priority}`, req.user.id);

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket priority updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Update priority error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ticket priority'
    });
  }
};

/**
 * @desc    Close/resolve ticket
 * @route   PUT /api/v1/support/tickets/:id/close
 * @access  Private (Support/Admin)
 */
exports.closeTicket = async (req, res) => {
  try {
    const { summary, resolutionType, resolutionNotes } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.close(summary, resolutionType, req.user.id);

    if (resolutionNotes) {
      ticket.resolution.resolutionNotes = resolutionNotes;
    }

    await ticket.save();

    // Send satisfaction survey notification to customer
    try {
      const notificationService = require('../services/notification.service');
      const customerId = ticket.customer?.toString();
      if (customerId) {
        await notificationService.createNotification(customerId, {
          type: 'system_update',
          title: 'How was your experience?',
          body: `Your support ticket #${ticket.ticketNumber} has been resolved. Please rate your experience.`,
          category: 'system',
          priority: 'normal',
          actionData: { ticketId: ticket._id, action: 'rate_ticket' }
        });
      }
    } catch (notifError) {
      console.error('Survey notification error:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Ticket closed successfully',
      ticket
    });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing ticket'
    });
  }
};

/**
 * @desc    Reopen ticket
 * @route   PUT /api/v1/support/tickets/:id/reopen
 * @access  Private
 */
exports.reopenTicket = async (req, res) => {
  try {
    const { reason } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.status !== 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Can only reopen closed tickets'
      });
    }

    ticket.reopen(reason, req.user.id);

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket reopened successfully',
      ticket
    });
  } catch (error) {
    console.error('Reopen ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reopening ticket'
    });
  }
};

/**
 * @desc    Escalate ticket
 * @route   PUT /api/v1/support/tickets/:id/escalate
 * @access  Private (Support/Admin)
 */
exports.escalateTicket = async (req, res) => {
  try {
    const { escalatedTo, reason } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.escalate(escalatedTo, reason, req.user.id);

    await ticket.save();

    await ticket.populate('escalatedTo', 'firstName lastName email');

    // Notify escalated person
    try {
      const notificationService = require('../services/notification.service');
      const { emitToUser } = require('../config/socket');
      await notificationService.createNotification(escalatedTo, {
        type: 'system_update',
        title: 'Ticket Escalated to You',
        body: `Ticket #${ticket.ticketNumber} has been escalated: ${reason}`,
        category: 'system',
        priority: 'urgent'
      });
      emitToUser(escalatedTo, 'ticket:escalated', { ticketId: ticket._id });
    } catch (notifError) {
      console.error('Escalation notification error:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Ticket escalated successfully',
      ticket
    });
  } catch (error) {
    console.error('Escalate ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error escalating ticket'
    });
  }
};

/**
 * @desc    Add customer satisfaction rating
 * @route   POST /api/v1/support/tickets/:id/rate
 * @access  Private (Customer only)
 */
exports.rateTicket = async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only ticket creator can rate'
      });
    }

    if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate closed or resolved tickets'
      });
    }

    ticket.customerSatisfaction = {
      rating,
      feedback,
      ratedAt: new Date()
    };

    await ticket.save();

    // Update support agent's stats
    if (ticket.assignedTo) {
      const agent = await User.findById(ticket.assignedTo);
      if (agent && agent.supportInfo) {
        const currentRating = agent.supportInfo.stats.satisfactionRating || 0;
        const currentCount = agent.supportInfo.stats.ratingCount || 0;

        agent.supportInfo.stats.satisfactionRating =
          ((currentRating * currentCount) + rating) / (currentCount + 1);
        agent.supportInfo.stats.ratingCount = currentCount + 1;

        await agent.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!',
      rating: ticket.customerSatisfaction
    });
  } catch (error) {
    console.error('Rate ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rating ticket'
    });
  }
};

/**
 * @desc    Get support dashboard statistics (for Dashboard UI)
 * @route   GET /api/v1/support/dashboard-stats
 * @access  Private (Support/Admin)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const agentId = req.user.id;
    const { timeRange = 'today' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date(0);

    if (timeRange === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (timeRange === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (timeRange === 'month') {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Get ticket counts
    const openTickets = await SupportTicket.countDocuments({
      status: { $in: ['open', 'assigned'] },
    });

    const inProgressTickets = await SupportTicket.countDocuments({
      status: 'in_progress',
    });

    const resolvedToday = await SupportTicket.countDocuments({
      status: { $in: ['resolved', 'closed'] },
      resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });

    const totalResolved = await SupportTicket.countDocuments({
      status: { $in: ['resolved', 'closed'] },
    });

    // Get agent's personal stats
    const agentStats = await SupportTicket.getAgentStats(agentId, startDate, new Date());

    // Calculate average response and resolution times
    const responseTimeData = await SupportTicket.aggregate([
      {
        $match: {
          firstResponseAt: { $exists: true },
          createdAt: { $gte: startDate },
        },
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$firstResponseAt', '$createdAt'] },
              1000 * 60, // Convert to minutes
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
        },
      },
    ]);

    const avgResponseTime = responseTimeData.length > 0
      ? Math.round(responseTimeData[0].avgResponseTime)
      : 0;

    // Get satisfaction ratings
    const satisfactionData = await SupportTicket.aggregate([
      {
        $match: {
          'customerSatisfaction.rating': { $exists: true },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$customerSatisfaction.rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const satisfactionRating = satisfactionData.length > 0
      ? parseFloat(satisfactionData[0].avgRating.toFixed(1))
      : 0;
    const totalRatings = satisfactionData.length > 0 ? satisfactionData[0].count : 0;

    res.json({
      success: true,
      data: {
        openTickets,
        inProgressTickets,
        resolvedToday,
        totalResolved,
        avgResponseTime,
        satisfactionRating,
        totalRatings,
        agentStats: {
          ticketsHandled: agentStats.total || 0,
          ticketsClosed: agentStats.closed || 0,
          averageResponseTime: agentStats.avgResponseTime || 0,
          averageResolutionTime: agentStats.avgResolutionTime || 0,
          satisfactionRating: parseFloat(agentStats.satisfactionRating) || 0,
          ratingCount: agentStats.total || 0,
        },
        timeRange,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
    });
  }
};

/**
 * @desc    Get ticket statistics
 * @route   GET /api/v1/support/stats
 * @access  Private (Support/Admin)
 */
exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate, agentId } = req.query;

    let query = {};

    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // If support agent, show only their stats
    if (req.user.role === 'support' && !agentId) {
      query.assignedTo = req.user.id;
    } else if (agentId) {
      query.assignedTo = agentId;
    }

    const [statusBreakdown, priorityBreakdown, categoryBreakdown, agentStats] = await Promise.all([
      SupportTicket.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      SupportTicket.aggregate([
        { $match: query },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      SupportTicket.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      query.assignedTo ? SupportTicket.getAgentStats(
        query.assignedTo,
        query.createdAt?.$gte,
        query.createdAt?.$lte
      ) : null
    ]);

    const totalTickets = await SupportTicket.countDocuments(query);

    res.status(200).json({
      success: true,
      total: totalTickets,
      statusBreakdown,
      priorityBreakdown,
      categoryBreakdown,
      agentStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};

/**
 * @desc    Get support agent dashboard
 * @route   GET /api/v1/support/dashboard
 * @access  Private (Support/Admin)
 */
exports.getDashboard = async (req, res) => {
  try {
    const agentId = req.user.role === 'support' ? req.user.id : null;

    const [
      assignedTickets,
      unassignedTickets,
      urgentTickets,
      workload
    ] = await Promise.all([
      agentId ? SupportTicket.find({
        assignedTo: agentId,
        status: { $in: ['assigned', 'in_progress', 'waiting_customer'] }
      })
        .populate('customer', 'firstName lastName email')
        .sort({ priority: -1, createdAt: 1 })
        .limit(10) : [],

      SupportTicket.getUnassignedTickets(10),

      SupportTicket.find({
        priority: 'urgent',
        status: { $nin: ['closed', 'resolved'] }
      })
        .populate('customer', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName')
        .sort('createdAt')
        .limit(10),

      agentId ? SupportTicket.getAgentWorkload(agentId) : 0
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        assignedTickets,
        unassignedTickets,
        urgentTickets,
        currentWorkload: workload
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard'
    });
  }
};

/**
 * @desc    Update support agent availability
 * @route   PUT /api/v1/support/availability
 * @access  Private (Support)
 */
exports.updateAvailability = async (req, res) => {
  try {
    const { status } = req.body;

    const user = await User.findById(req.user.id);

    if (!user.supportInfo) {
      user.supportInfo = {};
    }

    if (!user.supportInfo.availability) {
      user.supportInfo.availability = {};
    }

    user.supportInfo.availability.status = status;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      availability: user.supportInfo.availability
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating availability'
    });
  }
};

/**
 * @desc    Create/Get support conversation
 * @route   POST /api/v1/support/conversation
 * @access  Private
 */
exports.createSupportConversation = async (req, res) => {
  try {
    const { ticketId, message } = req.body;

    // Check if ticket exists
    let ticket;
    if (ticketId) {
      ticket = await SupportTicket.findById(ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found'
        });
      }

      // Check if user has access to this ticket
      const hasAccess =
        ticket.customer.toString() === req.user.id ||
        ticket.assignedTo?.toString() === req.user.id ||
        req.user.role === 'admin' ||
        req.user.role === 'support';

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this ticket'
        });
      }

      // Check if conversation already exists for this ticket
      if (ticket.relatedConversation) {
        const conversation = await Conversation.findById(ticket.relatedConversation)
          .populate('participants.user', 'firstName lastName profilePicture role')
          .populate({
            path: 'lastMessage',
            populate: {
              path: 'sender',
              select: 'firstName lastName profilePicture'
            }
          });

        return res.status(200).json({
          success: true,
          message: 'Conversation already exists',
          conversation
        });
      }
    }

    // Find an available support agent
    let supportAgent;
    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      const supportUsers = await User.find({
        role: 'support',
        'supportInfo.availability.status': 'available'
      }).limit(5);

      // Simple round-robin assignment - find agent with least workload
      if (supportUsers.length > 0) {
        const workloads = await Promise.all(
          supportUsers.map(async (agent) => ({
            agent: agent._id,
            workload: await SupportTicket.getAgentWorkload(agent._id)
          }))
        );

        workloads.sort((a, b) => a.workload - b.workload);
        supportAgent = workloads[0].agent;
      } else {
        // No available agents, find any support user
        const anySupport = await User.findOne({ role: 'support' });
        if (anySupport) {
          supportAgent = anySupport._id;
        }
      }
    }

    // Create conversation participants
    const participantIds = supportAgent
      ? [req.user.id, supportAgent]
      : [req.user.id];

    const participantDocs = participantIds.map(userId => ({
      user: userId,
      role: userId.toString() === req.user.id ? 'member' : 'admin',
      joinedAt: new Date(),
      unreadCount: 0,
      isMuted: false,
      isPinned: false
    }));

    // Create support conversation
    const conversation = await Conversation.create({
      type: 'support',
      participants: participantDocs,
      name: ticketId ? `Support - ${ticket.subject}` : 'Support Chat',
      createdBy: req.user.id
    });

    // Link conversation to ticket if exists
    if (ticket) {
      ticket.relatedConversation = conversation._id;

      // Auto-assign ticket to support agent
      if (supportAgent && !ticket.assignedTo) {
        ticket.assignToAgent(supportAgent, req.user.id);
      }

      await ticket.save();
    }

    await conversation.populate('participants.user', 'firstName lastName profilePicture role');

    // If initial message provided, create it
    if (message) {
      const Message = require('../models/Message');
      await Message.create({
        conversation: conversation._id,
        sender: req.user.id,
        type: 'text',
        text: message,
        status: 'sent'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Support conversation created successfully',
      conversation,
      assignedAgent: supportAgent
    });
  } catch (error) {
    console.error('Create support conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating support conversation',
    });
  }
};

/**
 * @desc    Create customer account (WhatsApp onboarding)
 * @route   POST /api/v1/support/create-customer
 * @access  Private (Support/Admin only)
 */
exports.createCustomerAccount = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      address,
      source
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phoneNumber }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone number already exists',
        existingUser: {
          id: existingUser._id,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          phoneNumber: existingUser.phoneNumber
        }
      });
    }

    // Generate a secure random password if not provided
    const crypto = require('crypto');
    const userPassword = password || crypto.randomBytes(12).toString('base64url') + 'A1!';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userPassword, salt);

    // Create customer account
    const customer = await User.create({
      firstName,
      lastName,
      email: email?.toLowerCase(),
      phoneNumber,
      password: hashedPassword,
      role: 'customer',
      status: 'active',
      address: address || {},
      onboarding: {
        source: source || 'whatsapp_support',
        completed: true,
        completedAt: new Date()
      },
      createdBy: req.user.id,
      isEmailVerified: false,
      isPhoneVerified: false
    });

    // Create activity log
    customer.activityLog.push({
      action: 'account_created',
      performedBy: req.user.id,
      details: `Account created by support agent via ${source || 'WhatsApp'}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Customer account created successfully',
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        role: customer.role
      },
      temporaryPassword: password ? undefined : userPassword
    });
  } catch (error) {
    console.error('Create customer account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating customer account',
    });
  }
};

/**
 * @desc    Create booking/match for customer
 * @route   POST /api/v1/support/create-booking
 * @access  Private (Support/Admin only)
 */
exports.createBookingForCustomer = async (req, res) => {
  try {
    const {
      customerId,
      technicianId,
      serviceId,
      serviceType,
      scheduledDate,
      scheduledTime,
      address,
      description,
      urgency,
      estimatedDuration,
      notes
    } = req.body;

    // Validate customer exists
    const customer = await User.findById(customerId);
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validate technician exists and is available
    const technician = await User.findById(technicianId);
    if (!technician || technician.role !== 'technician') {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    if (technician.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Technician is not active'
      });
    }

    // Create booking
    const booking = await Booking.create({
      customer: customerId,
      technician: technicianId,
      service: serviceId,
      serviceType: serviceType || 'general',
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      scheduledTime,
      address: address || customer.address,
      description,
      status: 'pending',
      urgency: urgency || 'normal',
      estimatedDuration: estimatedDuration || 120,
      source: 'whatsapp_support',
      createdBy: req.user.id,
      notes: notes || `Booking created by support agent ${req.user.firstName} ${req.user.lastName}`
    });

    await booking.populate([
      { path: 'customer', select: 'firstName lastName email phoneNumber address' },
      { path: 'technician', select: 'firstName lastName email phoneNumber skills rating' },
      { path: 'service', select: 'name description category basePrice' }
    ]);

    // Create notification for customer
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: customerId,
      sender: technicianId,
      type: 'booking_created',
      category: 'booking',
      title: 'New Booking Created',
      body: `A booking has been created for you with ${technician.firstName} ${technician.lastName}`,
      relatedBooking: booking._id,
      priority: urgency === 'urgent' ? 'high' : 'normal'
    });

    // Create notification for technician
    await Notification.create({
      recipient: technicianId,
      sender: customerId,
      type: 'booking_created',
      category: 'booking',
      title: 'New Booking Assignment',
      body: `You have been assigned a new booking by support team`,
      relatedBooking: booking._id,
      priority: urgency === 'urgent' ? 'high' : 'normal'
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
    });
  }
};

/**
 * @desc    Search technicians for matching
 * @route   GET /api/v1/support/search-technicians
 * @access  Private (Support/Admin only)
 */
exports.searchTechnicians = async (req, res) => {
  try {
    const {
      skills,
      serviceType,
      location,
      minRating,
      availability,
      search,
      limit = 20
    } = req.query;

    const query = {
      role: 'technician',
      status: 'active',
      deletedAt: null
    };

    // Filter by skills
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query['skills.name'] = { $in: skillsArray };
    }

    // Filter by service type
    if (serviceType) {
      query['services'] = serviceType;
    }

    // Filter by minimum rating
    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Filter by availability
    if (availability === 'true') {
      query['availability.isAvailable'] = true;
    }

    // Text search
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { 'skills.name': { $regex: search, $options: 'i' } }
      ];
    }

    const technicians = await User.find(query)
      .select('firstName lastName email phoneNumber profilePicture skills rating availability location services')
      .limit(parseInt(limit))
      .sort({ 'rating.average': -1, 'rating.count': -1 });

    res.status(200).json({
      success: true,
      count: technicians.length,
      technicians
    });
  } catch (error) {
    console.error('Search technicians error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching technicians',
    });
  }
};
