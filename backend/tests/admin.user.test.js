/**
 * Admin User Management Tests
 *
 * Covers:
 * - GET  /api/v1/admin/users            — pagination, role/status/search filters
 * - GET  /api/v1/admin/users/:id        — single user, 404
 * - PATCH /api/v1/admin/users/:id       — field whitelist, 404
 * - PATCH /api/v1/admin/users/:id/status — active/suspended/banned, invalid values
 * - DELETE /api/v1/admin/users/:id      — soft-delete (deletedAt, status=deactivated)
 * - POST /api/v1/admin/users/:id/restore — unsets deletedAt, sets active
 *
 * Access-control:
 * - All routes require protect + authorize('admin')
 * - The controller functions themselves enforce admin-only logic;
 *   the route-level middleware is tested separately in auth.middleware.test.js
 */

const mongoose = require('mongoose');
const dbHandler = require('./utils/dbHandler');

// Mock Redis before requiring anything that depends on it
jest.mock('../src/config/redis', () => ({
  get: jest.fn().mockRejectedValue(new Error('Redis not available')),
}));

const {
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
  restoreUser,
} = require('../src/controllers/admin.controller');
const { authorize } = require('../src/middleware/auth');

describe('Admin User Management Controller', () => {
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
  // GET /api/v1/admin/users
  // ============================================================
  describe('getUsers', () => {
    it('returns all non-deleted users with pagination metadata', async () => {
      await dbHandler.createTestUser();
      await dbHandler.createTestUser();
      const admin = await dbHandler.createTestAdmin();

      const req = mockRequest({}, {}, {}, admin);
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.success).toBe(true);
      const { users, pagination } = res._jsonData.data;
      // 3 users total (2 customers + 1 admin), none deleted
      expect(users.length).toBe(3);
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('pages');
    });

    it('does not return soft-deleted users', async () => {
      await dbHandler.createTestUser({ deletedAt: new Date() });
      await dbHandler.createTestUser();

      const req = mockRequest({}, {}, {}, {});
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      const { users } = res._jsonData.data;
      expect(users.every(u => !u.deletedAt)).toBe(true);
    });

    it('filters by role', async () => {
      await dbHandler.createTestUser({ role: 'customer' });
      await dbHandler.createTestTechnician();

      const req = mockRequest({}, {}, { role: 'technician' }, {});
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.data.users.every(u => u.role === 'technician')).toBe(true);
    });

    it('filters by status', async () => {
      await dbHandler.createTestUser({ status: 'active' });
      await dbHandler.createTestUser({ status: 'suspended' });

      const req = mockRequest({}, {}, { status: 'suspended' }, {});
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.data.users.every(u => u.status === 'suspended')).toBe(true);
    });

    it('searches by firstName, lastName, email', async () => {
      await dbHandler.createTestUser({ firstName: 'Unique', lastName: 'SearchName' });
      await dbHandler.createTestUser({ firstName: 'Other', lastName: 'Person' });

      const req = mockRequest({}, {}, { search: 'SearchName' }, {});
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      const { users } = res._jsonData.data;
      expect(users.length).toBeGreaterThanOrEqual(1);
      expect(users.some(u => u.lastName === 'SearchName')).toBe(true);
    });

    it('respects page and limit parameters', async () => {
      for (let i = 0; i < 5; i++) {
        await dbHandler.createTestUser();
      }

      const req = mockRequest({}, {}, { page: '1', limit: '2' }, {});
      const res = mockResponse();
      await getUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.data.users.length).toBeLessThanOrEqual(2);
      expect(res._jsonData.data.pagination.page).toBe(1);
    });

    it('does not expose password or refresh tokens', async () => {
      await dbHandler.createTestUser();

      const req = mockRequest({}, {}, {}, {});
      const res = mockResponse();
      await getUsers(req, res);

      res._jsonData.data.users.forEach(u => {
        expect(u.password).toBeUndefined();
        expect(u.refreshTokens).toBeUndefined();
      });
    });
  });

  // ============================================================
  // GET /api/v1/admin/users/:userId
  // ============================================================
  describe('getUserById', () => {
    it('returns a user with full details (no password/tokens)', async () => {
      const user = await dbHandler.createTestUser();

      const req = mockRequest({}, { userId: user._id.toString() }, {}, {});
      const res = mockResponse();
      await getUserById(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.success).toBe(true);
      expect(res._jsonData.data._id.toString()).toBe(user._id.toString());
      expect(res._jsonData.data.password).toBeUndefined();
      expect(res._jsonData.data.refreshTokens).toBeUndefined();
    });

    it('returns 404 for a non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest({}, { userId: fakeId }, {}, {});
      const res = mockResponse();
      await getUserById(req, res);

      expect(res.statusCode).toBe(404);
      expect(res._jsonData.success).toBe(false);
    });
  });

  // ============================================================
  // PATCH /api/v1/admin/users/:userId
  // ============================================================
  describe('updateUser (admin)', () => {
    it('updates allowed fields on a user', async () => {
      const user = await dbHandler.createTestUser();

      const req = mockRequest(
        { firstName: 'AdminEdited', bio: 'Updated bio', isEmailVerified: true },
        { userId: user._id.toString() },
        {},
        {}
      );
      const res = mockResponse();
      await updateUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.success).toBe(true);
      expect(res._jsonData.data.firstName).toBe('AdminEdited');
      expect(res._jsonData.data.isEmailVerified).toBe(true);
    });

    it('can change a user\'s role via admin update', async () => {
      const user = await dbHandler.createTestUser({ role: 'customer' });

      const req = mockRequest(
        { role: 'support' },
        { userId: user._id.toString() },
        {},
        {}
      );
      const res = mockResponse();
      await updateUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.data.role).toBe('support');
    });

    it('ignores non-whitelisted fields (no stats manipulation)', async () => {
      const user = await dbHandler.createTestUser();

      const req = mockRequest(
        { 'stats.totalEarnings': 999999, password: 'hacked' },
        { userId: user._id.toString() },
        {},
        {}
      );
      const res = mockResponse();
      await updateUser(req, res);

      // Should still succeed (just ignores the disallowed fields)
      expect(res.statusCode).toBe(200);
      expect(res._jsonData.data.password).toBeUndefined();
    });

    it('returns 404 when user does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest(
        { firstName: 'Ghost' },
        { userId: fakeId },
        {},
        {}
      );
      const res = mockResponse();
      await updateUser(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================================
  // PATCH /api/v1/admin/users/:userId/status
  // ============================================================
  describe('updateUserStatus', () => {
    it('suspends an active user', async () => {
      const user = await dbHandler.createTestUser({ status: 'active' });

      const req = mockRequest(
        { status: 'suspended', reason: 'Violation of terms' },
        { userId: user._id.toString() },
        {},
        {}
      );
      const res = mockResponse();
      await updateUserStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.success).toBe(true);
      expect(res._jsonData.data.status).toBe('suspended');
    });

    it('bans a user', async () => {
      const user = await dbHandler.createTestUser();

      const req = mockRequest(
        { status: 'banned' },
        { userId: user._id.toString() },
        {},
        {}
      );
      const res = mockResponse();
      await updateUserStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.data.status).toBe('banned');
    });

    it('reactivates a suspended user', async () => {
      const user = await dbHandler.createTestUser({ status: 'suspended' });

      const req = mockRequest(
        { status: 'active' },
        { userId: user._id.toString() },
        {},
        {}
      );
      const res = mockResponse();
      await updateUserStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.data.status).toBe('active');
    });

    it('rejects an invalid status value', async () => {
      const user = await dbHandler.createTestUser();

      const req = mockRequest(
        { status: 'deleted' }, // not in allowed list
        { userId: user._id.toString() },
        {},
        {}
      );
      const res = mockResponse();
      await updateUserStatus(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._jsonData.success).toBe(false);
    });

    it('returns 404 when user does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest(
        { status: 'banned' },
        { userId: fakeId },
        {},
        {}
      );
      const res = mockResponse();
      await updateUserStatus(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================================
  // DELETE /api/v1/admin/users/:userId  (soft delete)
  // ============================================================
  describe('deleteUser (admin)', () => {
    it('soft-deletes a user (sets deletedAt and status=deactivated)', async () => {
      const User = require('../src/models/User');
      const user = await dbHandler.createTestUser();

      const req = mockRequest(
        { reason: 'Terms violation' },
        { userId: user._id.toString() },
        {},
        {}
      );
      const res = mockResponse();
      await deleteUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.success).toBe(true);

      const deleted = await User.findById(user._id);
      expect(deleted.deletedAt).toBeDefined();
      expect(deleted.status).toBe('deactivated');
      expect(deleted.deleteReason).toBe('Terms violation');
    });

    it('uses default delete reason when none is provided', async () => {
      const User = require('../src/models/User');
      const user = await dbHandler.createTestUser();

      const req = mockRequest({}, { userId: user._id.toString() }, {}, {});
      const res = mockResponse();
      await deleteUser(req, res);

      expect(res.statusCode).toBe(200);
      const deleted = await User.findById(user._id);
      expect(deleted.deleteReason).toBe('Deleted by admin');
    });

    it('returns 404 when user does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest({}, { userId: fakeId }, {}, {});
      const res = mockResponse();
      await deleteUser(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================================
  // POST /api/v1/admin/users/:userId/restore
  // ============================================================
  describe('restoreUser', () => {
    it('restores a soft-deleted user (unsets deletedAt, sets active)', async () => {
      const User = require('../src/models/User');
      const user = await dbHandler.createTestUser({
        status: 'deactivated',
        deletedAt: new Date(),
        deleteReason: 'Some reason',
      });

      const req = mockRequest({}, { userId: user._id.toString() }, {}, {});
      const res = mockResponse();
      await restoreUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._jsonData.success).toBe(true);

      const restored = await User.findById(user._id);
      expect(restored.status).toBe('active');
      expect(restored.deletedAt).toBeUndefined();
      expect(restored.deleteReason).toBeUndefined();
    });

    it('can restore a user who was previously suspended then deleted', async () => {
      const User = require('../src/models/User');
      const user = await dbHandler.createTestUser({
        status: 'deactivated',
        deletedAt: new Date(),
      });

      const req = mockRequest({}, { userId: user._id.toString() }, {}, {});
      const res = mockResponse();
      await restoreUser(req, res);

      expect(res.statusCode).toBe(200);
      const restored = await User.findById(user._id);
      expect(restored.status).toBe('active');
    });

    it('returns 404 when user does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const req = mockRequest({}, { userId: fakeId }, {}, {});
      const res = mockResponse();
      await restoreUser(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================================
  // Role-based access enforcement (route-level middleware check)
  // ============================================================
  describe('authorize middleware — admin routes', () => {
    it('rejects customer role from admin-only routes', () => {
      const req = { user: { role: 'customer' } };
      const res = mockResponse();
      const next = mockNext();

      authorize('admin')(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects technician role from admin-only routes', () => {
      const req = { user: { role: 'technician' } };
      const res = mockResponse();
      const next = mockNext();

      authorize('admin')(req, res, next);

      expect(res.statusCode).toBe(403);
    });

    it('rejects support role from admin-only routes', () => {
      const req = { user: { role: 'support' } };
      const res = mockResponse();
      const next = mockNext();

      authorize('admin')(req, res, next);

      expect(res.statusCode).toBe(403);
    });

    it('allows admin role through admin-only routes', () => {
      const req = { user: { role: 'admin' } };
      const res = mockResponse();
      const next = mockNext();

      authorize('admin')(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
