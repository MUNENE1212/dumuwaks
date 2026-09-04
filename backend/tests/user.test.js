/**
 * User Controller Tests
 *
 * Covers:
 * - GET /api/v1/users         — public listing, admin filtering
 * - GET /api/v1/users/:id     — public profile, technician stats, 404
 * - PUT /api/v1/users/:id     — self-update, cross-user block, admin override, admin-only fields
 * - DELETE /api/v1/users/:id  — soft delete, authorization
 * - POST /api/v1/users/:id/follow — follow/unfollow toggle, self-follow block
 * - GET /api/v1/users/:id/followers|following
 * - PUT /api/v1/users/:id/availability — technician-only, self-only
 * - POST|DELETE /api/v1/users/:id/fcm-token
 * - GET /api/v1/users/search/mentions
 */

const mongoose = require('mongoose');
const dbHandler = require('./utils/dbHandler');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  toggleFollow,
  getFollowers,
  getFollowing,
  updateAvailability,
  addFCMToken,
  removeFCMToken,
  searchUsersForMentions,
} = require('../src/controllers/user.controller');

// Silence notification/socket side-effects in follow tests
jest.mock('../src/services/notification.service', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));
jest.mock('../src/config/socket', () => ({
  emitToUser: jest.fn(),
}));

describe('User Controller', () => {
  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  afterEach(async () => {
    await dbHandler.clearDatabase();
    jest.clearAllMocks();
  });

  // ============================================================
  // GET /api/v1/users
  // ============================================================
  describe('getUsers', () => {
    it('returns only active users to public (no auth)', async () => {
      await dbHandler.createTestUser({ status: 'active' });
      await dbHandler.createTestUser({ status: 'suspended' });

      const req = mockRequest({}, {}, {}, null);
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      const { users } = res._jsonData;
      expect(users.every(u => u.status === 'active')).toBe(true);
    });

    it('returns all statuses when requester is admin', async () => {
      const admin = await dbHandler.createTestAdmin();
      await dbHandler.createTestUser({ status: 'active' });
      await dbHandler.createTestUser({ status: 'suspended' });

      const req = mockRequest({}, {}, { status: 'suspended' }, admin);
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.users.every(u => u.status === 'suspended')).toBe(true);
    });

    it('filters by role', async () => {
      await dbHandler.createTestUser({ role: 'customer' });
      await dbHandler.createTestTechnician();

      const req = mockRequest({}, {}, { role: 'technician' }, null);
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.users.every(u => u.role === 'technician')).toBe(true);
    });

    it('filters by minRating', async () => {
      const User = require('../src/models/User');
      const highRated = await dbHandler.createTestUser();
      await User.findByIdAndUpdate(highRated._id, { 'rating.average': 4.5 });
      const lowRated = await dbHandler.createTestUser();
      await User.findByIdAndUpdate(lowRated._id, { 'rating.average': 2.0 });

      const req = mockRequest({}, {}, { minRating: '4.0' }, null);
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      res._jsonData.users.forEach(u => {
        expect(u.rating?.average ?? 0).toBeGreaterThanOrEqual(4.0);
      });
    });

    it('paginates results correctly', async () => {
      for (let i = 0; i < 5; i++) {
        await dbHandler.createTestUser();
      }

      const req = mockRequest({}, {}, { page: '1', limit: '2' }, null);
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.users.length).toBeLessThanOrEqual(2);
      expect(res._jsonData.page).toBe(1);
    });

    it('does not expose password or auth tokens', async () => {
      await dbHandler.createTestUser();

      const req = mockRequest({}, {}, {}, null);
      const res = mockResponse();
      await getUsers(req, res);

      res._jsonData.users.forEach(u => {
        expect(u.password).toBeUndefined();
        expect(u.twoFactorAuth).toBeUndefined();
        expect(u.loginHistory).toBeUndefined();
      });
    });
  });

  // ============================================================
  // GET /api/v1/users/:id
  // ============================================================
  describe('getUser', () => {
    it('returns a user profile without sensitive fields', async () => {
      const user = await dbHandler.createTestUser();

      const req = mockRequest({}, { id: user._id.toString() }, {}, null);
      const res = mockResponse();
      await getUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.user).toBeDefined();
      expect(res._jsonData.user.password).toBeUndefined();
      expect(res._jsonData.user.twoFactorAuth).toBeUndefined();
      expect(res._jsonData.user.loginHistory).toBeUndefined();
    });

    it('returns 404 for a non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest({}, { id: fakeId }, {}, null);
      const res = mockResponse();
      await getUser(req, res);

      expect(res.statusCode).toBe(404);
      expect(res._jsonData.success).toBe(false);
    });

    it('attaches stats for technician profiles', async () => {
      const tech = await dbHandler.createTestTechnician();

      const req = mockRequest({}, { id: tech._id.toString() }, {}, null);
      const res = mockResponse();
      await getUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.user._doc?.stats).toBeDefined();
      expect(res._jsonData.user._doc.stats).toHaveProperty('completedBookings');
    });
  });

  // ============================================================
  // PUT /api/v1/users/:id
  // ============================================================
  describe('updateUser', () => {
    it('allows a user to update their own profile', async () => {
      const user = await dbHandler.createTestUser();
      const userId = user._id.toString();

      const req = mockRequest(
        { firstName: 'Updated', bio: 'New bio' },
        { id: userId },
        {},
        { id: userId, _id: user._id, role: 'customer' }
      );
      const res = mockResponse();
      await updateUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.success).toBe(true);
      expect(res._jsonData.user.firstName).toBe('Updated');
      expect(res._jsonData.user.bio).toBe('New bio');
    });

    it('blocks a user from updating another user\'s profile', async () => {
      const userA = await dbHandler.createTestUser();
      const userB = await dbHandler.createTestUser();

      const req = mockRequest(
        { firstName: 'Hacked' },
        { id: userB._id.toString() },
        {},
        { id: userA._id.toString(), _id: userA._id, role: 'customer' }
      );
      const res = mockResponse();
      await updateUser(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._jsonData.success).toBe(false);
    });

    it('allows admin to update any user profile', async () => {
      const admin = await dbHandler.createTestAdmin();
      const user = await dbHandler.createTestUser();

      const req = mockRequest(
        { firstName: 'AdminChanged' },
        { id: user._id.toString() },
        {},
        { id: admin._id.toString(), _id: admin._id, role: 'admin' }
      );
      const res = mockResponse();
      await updateUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.user.firstName).toBe('AdminChanged');
    });

    it('admin can change user role and status', async () => {
      const admin = await dbHandler.createTestAdmin();
      const user = await dbHandler.createTestUser({ role: 'customer' });

      const req = mockRequest(
        { role: 'technician', status: 'suspended' },
        { id: user._id.toString() },
        {},
        { id: admin._id.toString(), _id: admin._id, role: 'admin' }
      );
      const res = mockResponse();
      await updateUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.user.role).toBe('technician');
      expect(res._jsonData.user.status).toBe('suspended');
    });

    it('non-admin cannot change role or status', async () => {
      const user = await dbHandler.createTestUser();
      const userId = user._id.toString();

      const req = mockRequest(
        { role: 'admin', status: 'banned' },
        { id: userId },
        {},
        { id: userId, _id: user._id, role: 'customer' }
      );
      const res = mockResponse();
      await updateUser(req, res);

      // Request succeeds but role/status changes are ignored
      expect(res.statusCode).toBe(200);
      // Re-fetch to confirm values unchanged
      const User = require('../src/models/User');
      const refreshed = await User.findById(user._id);
      expect(refreshed.role).toBe('customer');
      expect(refreshed.status).toBe('active');
    });

    it('returns 404 when target user does not exist', async () => {
      const admin = await dbHandler.createTestAdmin();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest(
        { firstName: 'Ghost' },
        { id: fakeId },
        {},
        { id: admin._id.toString(), _id: admin._id, role: 'admin' }
      );
      const res = mockResponse();
      await updateUser(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('allows updating nested location', async () => {
      const user = await dbHandler.createTestUser();
      const userId = user._id.toString();

      const req = mockRequest(
        { location: { coordinates: [36.82, -1.29], city: 'Nairobi', country: 'Kenya' } },
        { id: userId },
        {},
        { id: userId, _id: user._id, role: 'customer' }
      );
      const res = mockResponse();
      await updateUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.user.location.city).toBe('Nairobi');
    });
  });

  // ============================================================
  // DELETE /api/v1/users/:id
  // ============================================================
  describe('deleteUser', () => {
    it('allows a user to soft-delete their own account', async () => {
      const User = require('../src/models/User');
      const user = await dbHandler.createTestUser();
      const userId = user._id.toString();

      const req = mockRequest({}, { id: userId }, {}, { id: userId, _id: user._id, role: 'customer' });
      const res = mockResponse();
      await deleteUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.success).toBe(true);

      const deleted = await User.findById(user._id);
      expect(deleted.status).toBe('deactivated');
      expect(deleted.deletedAt).toBeDefined();
    });

    it('blocks a user from deleting another user\'s account', async () => {
      const userA = await dbHandler.createTestUser();
      const userB = await dbHandler.createTestUser();

      const req = mockRequest(
        {},
        { id: userB._id.toString() },
        {},
        { id: userA._id.toString(), _id: userA._id, role: 'customer' }
      );
      const res = mockResponse();
      await deleteUser(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._jsonData.success).toBe(false);
    });

    it('allows admin to delete any user account', async () => {
      const admin = await dbHandler.createTestAdmin();
      const user = await dbHandler.createTestUser();
      const User = require('../src/models/User');

      const req = mockRequest(
        {},
        { id: user._id.toString() },
        {},
        { id: admin._id.toString(), _id: admin._id, role: 'admin' }
      );
      const res = mockResponse();
      await deleteUser(req, res);

      expect(res.statusCode).toBe(200);
      const deleted = await User.findById(user._id);
      expect(deleted.status).toBe('deactivated');
    });

    it('returns 404 when target user does not exist', async () => {
      const admin = await dbHandler.createTestAdmin();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest({}, { id: fakeId }, {}, { id: admin._id.toString(), _id: admin._id, role: 'admin' });
      const res = mockResponse();
      await deleteUser(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================================
  // POST /api/v1/users/:id/follow  (toggle)
  // ============================================================
  describe('toggleFollow', () => {
    it('allows a user to follow another user', async () => {
      const userA = await dbHandler.createTestUser();
      const userB = await dbHandler.createTestUser();

      const req = mockRequest(
        {},
        { id: userB._id.toString() },
        {},
        { id: userA._id.toString(), _id: userA._id }
      );
      const res = mockResponse();
      await toggleFollow(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.isFollowing).toBe(true);
      expect(res._jsonData.followersCount).toBe(1);
    });

    it('allows a user to unfollow someone they already follow', async () => {
      const User = require('../src/models/User');
      const userA = await dbHandler.createTestUser();
      const userB = await dbHandler.createTestUser();

      // Pre-populate follow relationship
      await User.findByIdAndUpdate(userA._id, { $push: { following: userB._id }, followingCount: 1 });
      await User.findByIdAndUpdate(userB._id, { $push: { followers: userA._id }, followersCount: 1 });

      const req = mockRequest(
        {},
        { id: userB._id.toString() },
        {},
        { id: userA._id.toString(), _id: userA._id }
      );
      const res = mockResponse();
      await toggleFollow(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.isFollowing).toBe(false);
      expect(res._jsonData.followersCount).toBe(0);
    });

    it('blocks a user from following themselves', async () => {
      const user = await dbHandler.createTestUser();
      const userId = user._id.toString();

      const req = mockRequest({}, { id: userId }, {}, { id: userId, _id: user._id });
      const res = mockResponse();
      await toggleFollow(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._jsonData.success).toBe(false);
    });

    it('returns 404 when target user does not exist', async () => {
      const user = await dbHandler.createTestUser();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest({}, { id: fakeId }, {}, { id: user._id.toString(), _id: user._id });
      const res = mockResponse();
      await toggleFollow(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================================
  // GET /api/v1/users/:id/followers|following
  // ============================================================
  describe('getFollowers / getFollowing', () => {
    it('returns a user\'s followers list', async () => {
      const User = require('../src/models/User');
      const userA = await dbHandler.createTestUser();
      const userB = await dbHandler.createTestUser();
      await User.findByIdAndUpdate(userB._id, { $push: { followers: userA._id } });

      const req = mockRequest({}, { id: userB._id.toString() }, {}, null);
      const res = mockResponse();
      await getFollowers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.count).toBe(1);
    });

    it('returns a user\'s following list', async () => {
      const User = require('../src/models/User');
      const userA = await dbHandler.createTestUser();
      const userB = await dbHandler.createTestUser();
      await User.findByIdAndUpdate(userA._id, { $push: { following: userB._id } });

      const req = mockRequest({}, { id: userA._id.toString() }, {}, null);
      const res = mockResponse();
      await getFollowing(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.count).toBe(1);
    });

    it('returns 404 for followers of non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({}, { id: fakeId }, {}, null);
      const res = mockResponse();
      await getFollowers(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================================
  // PUT /api/v1/users/:id/availability  (technician only)
  // ============================================================
  describe('updateAvailability', () => {
    it('allows a technician to update their own availability', async () => {
      const tech = await dbHandler.createTestTechnician();
      const techId = tech._id.toString();

      const req = mockRequest(
        { isAvailable: false },
        { id: techId },
        {},
        { id: techId, _id: tech._id, role: 'technician' }
      );
      const res = mockResponse();
      await updateAvailability(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.availability.isAvailable).toBe(false);
    });

    it('blocks a technician from updating another technician\'s availability', async () => {
      const techA = await dbHandler.createTestTechnician();
      const techB = await dbHandler.createTestTechnician();

      const req = mockRequest(
        { isAvailable: false },
        { id: techB._id.toString() },
        {},
        { id: techA._id.toString(), _id: techA._id, role: 'technician' }
      );
      const res = mockResponse();
      await updateAvailability(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('rejects non-technician users', async () => {
      const customer = await dbHandler.createTestUser({ role: 'customer' });
      const customerId = customer._id.toString();

      const req = mockRequest(
        { isAvailable: true },
        { id: customerId },
        {},
        { id: customerId, _id: customer._id, role: 'customer' }
      );
      const res = mockResponse();
      await updateAvailability(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._jsonData.message).toMatch(/technician/i);
    });

    it('updates availability schedule', async () => {
      const tech = await dbHandler.createTestTechnician();
      const techId = tech._id.toString();
      const schedule = [{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isAvailable: true }];

      const req = mockRequest(
        { schedule },
        { id: techId },
        {},
        { id: techId, _id: tech._id, role: 'technician' }
      );
      const res = mockResponse();
      await updateAvailability(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.availability.schedule).toHaveLength(1);
    });
  });

  // ============================================================
  // POST|DELETE /api/v1/users/:id/fcm-token
  // ============================================================
  describe('FCM token management', () => {
    it('allows a user to add an FCM token', async () => {
      const user = await dbHandler.createTestUser();
      const userId = user._id.toString();

      const req = mockRequest(
        { token: 'fcm-abc-123', platform: 'android', device: 'Pixel 7' },
        { id: userId },
        {},
        { id: userId, _id: user._id }
      );
      const res = mockResponse();
      await addFCMToken(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.success).toBe(true);
    });

    it('blocks adding FCM token for another user', async () => {
      const userA = await dbHandler.createTestUser();
      const userB = await dbHandler.createTestUser();

      const req = mockRequest(
        { token: 'fcm-xyz', platform: 'ios' },
        { id: userB._id.toString() },
        {},
        { id: userA._id.toString(), _id: userA._id }
      );
      const res = mockResponse();
      await addFCMToken(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('rejects FCM token request without required fields', async () => {
      const user = await dbHandler.createTestUser();
      const userId = user._id.toString();

      const req = mockRequest(
        { device: 'iPhone' }, // missing token and platform
        { id: userId },
        {},
        { id: userId, _id: user._id }
      );
      const res = mockResponse();
      await addFCMToken(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('allows a user to remove their FCM token', async () => {
      const User = require('../src/models/User');
      const user = await dbHandler.createTestUser();
      const userId = user._id.toString();
      await User.findByIdAndUpdate(user._id, {
        $push: { fcmTokens: { token: 'fcm-to-remove', platform: 'web', addedAt: new Date() } }
      });

      const req = mockRequest(
        { token: 'fcm-to-remove' },
        { id: userId },
        {},
        { id: userId, _id: user._id }
      );
      const res = mockResponse();
      await removeFCMToken(req, res);

      expect(res.statusCode).toBe(200);

      const updated = await User.findById(user._id);
      expect(updated.fcmTokens.find(t => t.token === 'fcm-to-remove')).toBeUndefined();
    });

    it('blocks removing FCM token of another user', async () => {
      const userA = await dbHandler.createTestUser();
      const userB = await dbHandler.createTestUser();

      const req = mockRequest(
        { token: 'some-token' },
        { id: userB._id.toString() },
        {},
        { id: userA._id.toString(), _id: userA._id }
      );
      const res = mockResponse();
      await removeFCMToken(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ============================================================
  // GET /api/v1/users/search/mentions
  // ============================================================
  describe('searchUsersForMentions', () => {
    it('returns matching active users for a valid query', async () => {
      await dbHandler.createTestUser({ firstName: 'Alice', lastName: 'Kamau' });
      await dbHandler.createTestUser({ firstName: 'Bob', lastName: 'Mutua' });

      const req = mockRequest({}, {}, { q: 'Ali' }, { id: 'any' });
      const res = mockResponse();
      await searchUsersForMentions(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.users.some(u => u.name === 'Alice Kamau')).toBe(true);
    });

    it('rejects a query shorter than 2 characters', async () => {
      const req = mockRequest({}, {}, { q: 'A' }, { id: 'any' });
      const res = mockResponse();
      await searchUsersForMentions(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('rejects empty query', async () => {
      const req = mockRequest({}, {}, {}, { id: 'any' });
      const res = mockResponse();
      await searchUsersForMentions(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('limits results to 10 users', async () => {
      for (let i = 0; i < 15; i++) {
        await dbHandler.createTestUser({ firstName: `Tester${i}`, lastName: 'Common' });
      }

      const req = mockRequest({}, {}, { q: 'Tester' }, { id: 'any' });
      const res = mockResponse();
      await searchUsersForMentions(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.users.length).toBeLessThanOrEqual(10);
    });

    it('does not return deleted users', async () => {
      await dbHandler.createTestUser({
        firstName: 'DeletedUser',
        lastName: 'Test',
        deletedAt: new Date(),
      });

      const req = mockRequest({}, {}, { q: 'Deleted' }, { id: 'any' });
      const res = mockResponse();
      await searchUsersForMentions(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.users.find(u => u.name === 'DeletedUser Test')).toBeUndefined();
    });
  });
});
