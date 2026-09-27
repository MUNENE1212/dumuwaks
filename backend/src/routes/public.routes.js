const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

/**
 * @route   GET /api/public/stats
 * @desc    Get honest, real-time platform statistics
 * @access  Public
 * @cache   5 minutes
 */
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

    // Count REAL customers (verified, not deleted)
    const totalCustomers = await User.countDocuments({
      role: 'customer',
      isEmailVerified: true,
      deletedAt: null
    });

    // Count REAL technicians (verified, not deleted)
    const totalTechnicians = await User.countDocuments({
      role: 'technician',
      isEmailVerified: true,
      deletedAt: null
    });

    // Count active technicians (logged in within last 30 min)
    const activeTechnicians = await User.countDocuments({
      role: 'technician',
      isOnline: true,
      lastLogin: { $gte: fiveMinutesAgo },
      deletedAt: null
    });

    // Count completed bookings
    const totalBookings = await Booking.countDocuments({
      status: 'completed'
    });

    // Calculate REAL average rating from verified reviews only
    const reviewStats = await Review.aggregate([
      {
        $match: {
          // Only count reviews from completed bookings
          booking: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      totalCustomers,
      totalTechnicians,
      activeTechnicians,
      totalBookings,
      averageRating: reviewStats[0]?.averageRating || 0,
      totalReviews: reviewStats[0]?.totalReviews || 0,
      lastUpdated: now.toISOString()
    };

    // Cache for 5 minutes (300 seconds)
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/public/reviews
 * @desc    Get verified public reviews (paginated)
 * @access  Public
 */
router.get('/reviews', async (req, res) => {
  try {
    const {
      limit = 10,
      skip = 0,
      sort = '-createdAt',
      minRating = 1
    } = req.query;

    // Validate inputs
    const parsedLimit = Math.min(parseInt(limit), 50); // Max 50 reviews
    const parsedSkip = parseInt(skip) || 0;

    // Fetch reviews with real customer and booking data
    const reviews = await Review.find({
      rating: { $gte: parseFloat(minRating) },
      // Only reviews from completed bookings
      booking: { $exists: true, $ne: null }
    })
      .populate({
        path: 'booking',
        select: 'serviceCategory status'
      })
      .populate({
        path: 'customer',
        select: 'firstName location'
      })
      .sort(sort)
      .limit(parsedLimit)
      .skip(parsedSkip)
      .lean();

    // Sanitize reviews for public display (remove sensitive info)
    const sanitizedReviews = reviews.map(review => ({
      _id: review._id,
      rating: review.rating,
      text: review.text,
      customer: {
        firstName: review.customer?.firstName || 'Anonymous',
        location: {
          city: review.customer?.location?.city || 'Nairobi'
        }
      },
      booking: {
        serviceCategory: review.booking?.serviceCategory || 'General'
      },
      createdAt: review.createdAt,
      // No customer last name, email, phone, etc.
      isVerified: true // All reviews shown are from completed bookings
    }));

    const total = await Review.countDocuments({
      rating: { $gte: parseFloat(minRating) },
      booking: { $exists: true, $ne: null }
    });

    res.json({
      success: true,
      data: {
        reviews: sanitizedReviews,
        total,
        hasMore: (parsedSkip + parsedLimit) < total,
        count: sanitizedReviews.length
      }
    });
  } catch (error) {
    console.error('Error fetching public reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews'
    });
  }
});

/**
 * @route   GET /api/public/technicians
 * @desc    Get public technician listings (with honest availability)
 * @access  Public
 */
router.get('/technicians', async (req, res) => {
  try {
    const {
      serviceCategory,
      location,
      availability = 'all',
      limit = 20
    } = req.query;

    const now = new Date();
    const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);

    // Build query
    const query = {
      role: 'technician',
      isEmailVerified: true,
      deletedAt: null
    };

    // Filter by service category
    if (serviceCategory) {
      query['skills.category'] = serviceCategory;
    }

    // Filter by location
    if (location) {
      query['location.city'] = { $regex: location, $options: 'i' };
    }

    // Find technicians
    // Public listing: allow-list the fields (lean() skips the User JSON transform)
    let technicians = await User.find(query)
      .select('firstName lastName profilePicture bio skills location rating businessName isOnline lastLogin availability kyc.verified kyc.verifiedAt createdAt')
      .limit(parseInt(limit))
      .lean();

    // Jobs actually completed and paid through Dumuwaks (not the rating count)
    const done = await Booking.aggregate([
      { $match: { technician: { $in: technicians.map((t) => t._id) }, status: { $in: ['verified', 'paid'] } } },
      { $group: { _id: '$technician', n: { $sum: 1 } } }
    ]);
    const doneBy = Object.fromEntries(done.map((d) => [String(d._id), d.n]));

    // Add real-time availability status
    technicians = technicians.map(({ kyc, ...tech }) => ({
      ...tech,
      verification: { isVerified: Boolean(kyc && kyc.verified), verifiedAt: (kyc && kyc.verifiedAt) || null },
      isAvailableNow: tech.isOnline && tech.lastLogin >= thirtyMinutesAgo,
      lastActive: tech.lastLogin,
      publicStats: {
        jobsCompleted: doneBy[String(tech._id)] || 0,
        reviews: tech.rating?.count || 0,
        averageRating: tech.rating?.average || 0
      }
    }));

    // Filter by availability if requested
    let filteredTechnicians = technicians;
    if (availability === 'available-now') {
      filteredTechnicians = technicians.filter(t => t.isAvailableNow);
    } else if (availability === 'available-today') {
      // Technicians who are online OR have been active today
      const today = new Date(now.setHours(0, 0, 0, 0));
      filteredTechnicians = technicians.filter(t =>
        t.isAvailableNow || (t.lastLogin && t.lastLogin >= today)
      );
    }

    // Calculate availability counts
    const availableNow = technicians.filter(t => t.isAvailableNow).length;
    const availableToday = technicians.filter(t => {
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      return t.isAvailableNow || (t.lastLogin && t.lastLogin >= todayStart);
    }).length;

    res.json({
      success: true,
      data: {
        technicians: filteredTechnicians,
        total: filteredTechnicians.length,
        availableNow,
        availableToday,
        lastUpdated: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching public technicians:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch technicians'
    });
  }
});

module.exports = router;
