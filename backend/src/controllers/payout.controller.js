const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Booking = require('../models/Booking');
const mpesaService = require('../services/mpesa.service');

/**
 * @desc    Get all pending payouts (Admin/Finance)
 * @route   GET /api/v1/payments/payouts
 * @access  Private (Admin/Finance)
 */
exports.getPendingPayouts = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20, technician } = req.query;

    const query = {
      type: 'technician_payout',
    };

    if (status) {
      query.status = status;
    }

    if (technician) {
      query.payee = technician;
    }

    const payouts = await Transaction.find(query)
      .populate('payee', 'firstName lastName email phoneNumber')
      .populate('payer', 'firstName lastName')
      .populate('booking', 'bookingNumber serviceType pricing')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    // Calculate total amount pending
    const totalPendingAmount = await Transaction.aggregate([
      { $match: { type: 'technician_payout', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount.gross' } } }
    ]);

    res.status(200).json({
      success: true,
      count: payouts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      totalPendingAmount: totalPendingAmount[0]?.total || 0,
      payouts,
    });
  } catch (error) {
    console.error('Get Pending Payouts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending payouts',
    });
  }
};

/**
 * @desc    Get payout details
 * @route   GET /api/v1/payments/payouts/:id
 * @access  Private (Admin/Finance or Technician owns it)
 */
exports.getPayoutDetails = async (req, res) => {
  try {
    const payout = await Transaction.findById(req.params.id)
      .populate('payee', 'firstName lastName email phoneNumber')
      .populate('payer', 'firstName lastName')
      .populate('booking', 'bookingNumber serviceType pricing status');

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    // Check authorization
    const isAdmin = ['admin', 'finance', 'support'].includes(req.user.role);
    const isTechnician = payout.payee._id.toString() === req.user.id;

    if (!isAdmin && !isTechnician) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payout',
      });
    }

    res.status(200).json({
      success: true,
      payout,
    });
  } catch (error) {
    console.error('Get Payout Details Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payout details',
    });
  }
};

/**
 * @desc    Process payout via M-Pesa B2C
 * @route   POST /api/v1/payments/payouts/:id/process
 * @access  Private (Admin/Finance)
 */
exports.processPayout = async (req, res) => {
  try {
    const { remarks } = req.body;

    const payout = await Transaction.findById(req.params.id)
      .populate('payee', 'firstName lastName phoneNumber')
      .populate('booking', 'bookingNumber');

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    // Check if payout is pending
    if (payout.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot process payout with status: ${payout.status}`,
      });
    }

    // Verify technician has phone number
    if (!payout.payee.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Technician does not have a phone number on file',
      });
    }
    // Update status to processing
    payout.status = 'processing';
    payout.processingStartedAt = new Date();
    payout.processedBy = req.user.id;
    await payout.save();

    // Initiate M-Pesa B2C
    const b2cResult = await mpesaService.initiateB2C({
      phoneNumber: payout.payee.phoneNumber,
      // Net of platform fee and VAT: gross would pay the platform's share to the technician
      amount: payout.amount.net ?? payout.amount.gross,
      remarks: remarks || `Payout for ${payout.booking.bookingNumber}`,
      occasion: payout.booking.bookingNumber,
    });

    if (!b2cResult.success) {
      // B2C initiation failed
      payout.status = 'failed';
      payout.failedAt = new Date();
      payout.failureReason = b2cResult.error;
      await payout.save();

      return res.status(400).json({
        success: false,
        message: 'Failed to initiate payout',
        error: b2cResult.error,
        details: b2cResult.details,
      });
    }

    // Update payout with B2C details
    payout.mpesaDetails = {
      conversationId: b2cResult.data.conversationId,
      originatorConversationId: b2cResult.data.originatorConversationId,
      phoneNumber: payout.payee.phoneNumber,
    };
    payout.externalTransactionId = b2cResult.data.conversationId;
    await payout.save();

    res.status(200).json({
      success: true,
      message: 'Payout processing initiated successfully',
      payout,
      b2cResponse: b2cResult.data,
    });
  } catch (error) {
    console.error('Process Payout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payout',
    });
  }
};

/**
 * @desc    Batch process multiple payouts
 * @route   POST /api/v1/payments/payouts/batch
 * @access  Private (Admin/Finance)
 */
exports.batchProcessPayouts = async (req, res) => {
  try {
    const { payoutIds, remarks } = req.body;

    if (!payoutIds || !Array.isArray(payoutIds) || payoutIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payout IDs array is required',
      });
    }

    const results = {
      successful: [],
      failed: [],
      total: payoutIds.length,
    };

    for (const payoutId of payoutIds) {
      try {
        const payout = await Transaction.findById(payoutId)
          .populate('payee', 'firstName lastName phoneNumber')
          .populate('booking', 'bookingNumber');

        if (!payout || payout.status !== 'pending') {
          results.failed.push({
            payoutId,
            reason: 'Payout not found or not in pending status',
          });
          continue;
        }

        if (!payout.payee.phoneNumber) {
          results.failed.push({
            payoutId,
            reason: 'Technician does not have a phone number',
          });
          continue;
        }

        // Update to processing
        payout.status = 'processing';
        payout.processingStartedAt = new Date();
        payout.processedBy = req.user.id;
        await payout.save();

        // Initiate B2C
        const b2cResult = await mpesaService.initiateB2C({
          phoneNumber: payout.payee.phoneNumber,
          // Net of platform fee and VAT: gross would pay the platform's share to the technician
          amount: payout.amount.net ?? payout.amount.gross,
          remarks: remarks || `Payout for ${payout.booking.bookingNumber}`,
          occasion: payout.booking.bookingNumber,
        });

        if (b2cResult.success) {
          payout.mpesaDetails = {
            conversationId: b2cResult.data.conversationId,
            originatorConversationId: b2cResult.data.originatorConversationId,
            phoneNumber: payout.payee.phoneNumber,
          };
          payout.externalTransactionId = b2cResult.data.conversationId;
          await payout.save();

          results.successful.push({
            payoutId,
            // Net of platform fee and VAT: gross would pay the platform's share to the technician
            amount: payout.amount.net ?? payout.amount.gross,
            technician: `${payout.payee.firstName} ${payout.payee.lastName}`,
          });
        } else {
          payout.status = 'failed';
          payout.failedAt = new Date();
          payout.failureReason = b2cResult.error;
          await payout.save();

          results.failed.push({
            payoutId,
            reason: b2cResult.error,
          });
        }

        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.failed.push({
          payoutId,
          reason: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${results.successful.length} of ${results.total} payouts`,
      results,
    });
  } catch (error) {
    console.error('Batch Process Payouts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing batch payouts',
    });
  }
};

/**
 * @desc    Get technician's payout history
 * @route   GET /api/v1/payments/payouts/my-payouts
 * @access  Private (Technician)
 */
exports.getMyPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = {
      type: 'technician_payout',
      payee: req.user.id,
    };

    if (status) {
      query.status = status;
    }

    const payouts = await Transaction.find(query)
      .populate('booking', 'bookingNumber serviceType pricing status')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    // Calculate earnings
    const earnings = await Transaction.aggregate([
      { $match: { type: 'technician_payout', payee: req.user._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount.gross' } } }
    ]);

    const pendingEarnings = await Transaction.aggregate([
      { $match: { type: 'technician_payout', payee: req.user._id, status: { $in: ['pending', 'processing'] } } },
      { $group: { _id: null, total: { $sum: '$amount.gross' } } }
    ]);

    res.status(200).json({
      success: true,
      count: payouts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      totalEarnings: earnings[0]?.total || 0,
      pendingEarnings: pendingEarnings[0]?.total || 0,
      payouts,
    });
  } catch (error) {
    console.error('Get My Payouts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payout history',
    });
  }
};

module.exports = exports;
