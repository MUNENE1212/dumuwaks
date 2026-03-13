const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const User = require('../models/User');

/**
 * @desc    Create a transaction/payment
 * @route   POST /api/v1/transactions
 * @access  Private
 */
exports.createTransaction = async (req, res) => {
  try {
    const {
      booking,
      amount,
      gateway,
      type = 'booking_payment',
      description
    } = req.body;

    // Verify booking exists
    const bookingDoc = await Booking.findById(booking);
    if (!bookingDoc) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (bookingDoc.customer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create payment for this booking'
      });
    }

    // Generate transaction number
    const txnCount = await Transaction.countDocuments();
    const transactionNumber = `TXN-${Date.now()}-${(txnCount + 1).toString().padStart(6, '0')}`;

    // Create transaction
    const transaction = await Transaction.create({
      transactionNumber,
      booking,
      payer: req.user.id,
      payee: bookingDoc.technician,
      amount: {
        gross: amount,
        platformFee: amount * (process.env.PLATFORM_FEE_PERCENTAGE || 0.1),
        net: amount * (1 - (process.env.PLATFORM_FEE_PERCENTAGE || 0.1))
      },
      currency: 'KES', // Default to Kenyan Shillings
      gateway,
      type,
      description,
      status: 'pending',
      escrow: {
        isEscrow: true,
        heldAmount: amount,
        status: 'held'
      }
    });

    // Initialize payment with gateway
    if (gateway === 'mpesa') {
      try {
        const mpesaService = require('../services/mpesa.service');
        const stkResult = await mpesaService.initiateSTKPush({
          phoneNumber: req.body.phoneNumber || req.user.phoneNumber,
          amount,
          accountReference: transaction.transactionNumber,
          transactionDesc: description || `Payment for ${transaction.transactionNumber}`
        });
        transaction.metadata = { ...transaction.metadata, mpesaCheckoutRequestId: stkResult.CheckoutRequestID };
        await transaction.save();
      } catch (paymentError) {
        console.error('M-Pesa STK push error:', paymentError);
        // Transaction created but payment initiation failed — user can retry
      }
    }

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating transaction',
    });
  }
};

/**
 * @desc    Get all transactions
 * @route   GET /api/v1/transactions
 * @access  Private
 */
exports.getTransactions = async (req, res) => {
  try {
    const {
      status,
      gateway,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    // Filter by user role
    if (req.user.role !== 'admin') {
      query.$or = [
        { payer: req.user.id },
        { payee: req.user.id }
      ];
    }

    if (status) query.status = status;
    if (gateway) query.gateway = gateway;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .populate('payer', 'firstName lastName email')
      .populate('payee', 'firstName lastName email')
      .populate('booking', 'bookingNumber serviceType')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions'
    });
  }
};

/**
 * @desc    Get single transaction
 * @route   GET /api/v1/transactions/:id
 * @access  Private
 */
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('payer', 'firstName lastName email phoneNumber')
      .populate('payee', 'firstName lastName email phoneNumber')
      .populate('booking');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check authorization
    const isAuthorized =
      transaction.payer._id.toString() === req.user.id ||
      transaction.payee?._id.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this transaction'
      });
    }

    res.status(200).json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction'
    });
  }
};

/**
 * @desc    Release escrow payment
 * @route   POST /api/v1/transactions/:id/release-escrow
 * @access  Private (Admin or automated)
 */
exports.releaseEscrow = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (!transaction.escrow.isEscrow) {
      return res.status(400).json({
        success: false,
        message: 'This transaction does not use escrow'
      });
    }

    if (transaction.escrow.status !== 'held') {
      return res.status(400).json({
        success: false,
        message: `Escrow already ${transaction.escrow.status}`
      });
    }

    transaction.escrow.status = 'released';
    transaction.escrow.releasedAt = new Date();
    transaction.status = 'completed';
    transaction.completedAt = new Date();

    await transaction.save();

    // Process payout to technician via escrow service
    try {
      if (transaction.booking) {
        const escrowService = require('../services/escrow.service');
        const Booking = require('../models/Booking');
        const booking = await Booking.findById(transaction.booking);
        if (booking?.escrow) {
          await escrowService.releaseEscrow(booking.escrow, req.user.id);
        }
      }
    } catch (payoutError) {
      console.error('Payout processing error:', payoutError);
    }

    res.status(200).json({
      success: true,
      message: 'Escrow released successfully',
      transaction
    });
  } catch (error) {
    console.error('Release escrow error:', error);
    res.status(500).json({
      success: false,
      message: 'Error releasing escrow'
    });
  }
};

/**
 * @desc    Process refund
 * @route   POST /api/v1/transactions/:id/refund
 * @access  Private (Admin)
 */
exports.processRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund completed transactions'
      });
    }

    const refundAmount = amount || transaction.amount.gross;

    if (refundAmount > transaction.amount.gross) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount exceeds transaction amount'
      });
    }

    transaction.refund = {
      isRefunded: true,
      amount: refundAmount,
      reason,
      processedAt: new Date(),
      processedBy: req.user.id,
      status: 'completed'
    };

    transaction.status = 'refunded';

    await transaction.save();

    // Process actual refund through payment gateway
    if (transaction.gateway === 'mpesa') {
      try {
        const mpesaService = require('../services/mpesa.service');
        const payer = await User.findById(transaction.payer).select('phoneNumber');
        if (payer?.phoneNumber) {
          await mpesaService.initiateB2C({
            phoneNumber: payer.phoneNumber,
            amount: refundAmount,
            remarks: `Refund for ${transaction.transactionNumber}`,
            occasion: reason || 'Transaction refund'
          });
        }
      } catch (refundError) {
        console.error('Gateway refund error:', refundError);
        // Refund record created — gateway processing can be retried manually
      }
    }

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      transaction
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing refund'
    });
  }
};

/**
 * @desc    Webhook handler for payment gateways
 * @route   POST /api/v1/transactions/webhook/:gateway
 * @access  Public (verified by gateway signature)
 */
exports.handleWebhook = async (req, res) => {
  try {
    const { gateway } = req.params;
    const webhookData = req.body;

    // Verify webhook data based on gateway
    if (gateway === 'mpesa') {
      const mpesaService = require('../services/mpesa.service');
      if (!mpesaService.validateCallback(webhookData)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid M-Pesa callback data'
        });
      }
    } else {
      console.warn(`Webhook received for unknown gateway: ${gateway}`);
    }

    // Find transaction by gateway reference
    const transaction = await Transaction.findOne({
      'gatewayResponse.reference': webhookData.reference || webhookData.id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Update transaction based on webhook event
    transaction.gatewayResponse = {
      ...transaction.gatewayResponse,
      ...webhookData,
      webhookReceivedAt: new Date()
    };

    // Update status based on gateway response
    if (webhookData.status === 'success' || webhookData.status === 'completed') {
      transaction.status = 'completed';
      transaction.completedAt = new Date();
    } else if (webhookData.status === 'failed') {
      transaction.status = 'failed';
      transaction.failureReason = webhookData.message || 'Payment failed';
    }

    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook'
    });
  }
};

/**
 * @desc    Get transaction statistics
 * @route   GET /api/v1/transactions/stats
 * @access  Private
 */
exports.getTransactionStats = async (req, res) => {
  try {
    const query = {};

    if (req.user.role !== 'admin') {
      query.$or = [
        { payer: req.user.id },
        { payee: req.user.id }
      ];
    }

    const stats = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount.gross' }
        }
      }
    ]);

    const total = await Transaction.countDocuments(query);
    const totalRevenue = await Transaction.aggregate([
      { $match: { ...query, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount.gross' } } }
    ]);

    res.status(200).json({
      success: true,
      total,
      totalRevenue: totalRevenue[0]?.total || 0,
      stats
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction statistics'
    });
  }
};
