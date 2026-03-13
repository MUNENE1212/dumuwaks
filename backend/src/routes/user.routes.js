const express = require('express');
const { body } = require('express-validator');
const {
  getUsers,
  getNearbyTechnicians,
  getUser,
  updateUser,
  deleteUser,
  toggleFollow,
  getFollowers,
  getFollowing,
  uploadProfilePicture,
  getPortfolio,
  updateAvailability,
  addFCMToken,
  removeFCMToken,
  searchUsersForMentions
} = require('../controllers/user.controller');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { uploadProfilePicture: profilePictureUpload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getUsers);
router.get('/nearby-technicians', getNearbyTechnicians);
router.get('/search/mentions', protect, searchUsersForMentions);
router.get('/:id', getUser);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);
router.get('/:id/portfolio', getPortfolio);

// Protected routes
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

router.post('/:id/follow', protect, toggleFollow);

router.post(
  '/:id/profile-picture',
  protect,
  profilePictureUpload,
  uploadProfilePicture
);

router.put(
  '/:id/availability',
  protect,
  authorize('technician'),
  updateAvailability
);

router.post(
  '/:id/fcm-token',
  protect,
  [
    body('token').notEmpty().withMessage('FCM token is required'),
    body('platform')
      .isIn(['ios', 'android', 'web'])
      .withMessage('Invalid platform'),
    validate
  ],
  addFCMToken
);

router.delete('/:id/fcm-token', protect, removeFCMToken);

module.exports = router;
