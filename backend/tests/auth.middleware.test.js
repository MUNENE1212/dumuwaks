/**
 * Auth Middleware Tests
 *
 * Covers:
 * - protect     — no token, invalid token, expired token, suspended/banned account, valid token
 * - authorize   — correct role, wrong role, no user set
 * - optionalAuth — valid token, invalid token, no token (all continue to next)
 * - requireVerified — unverified email blocked, verified passes
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dbHandler = require('./utils/dbHandler');
const { protect, authorize, optionalAuth, requireVerified } = require('../src/middleware/auth');

// Suppress Redis — the middleware fails open when Redis is unavailable
jest.mock('../src/config/redis', () => ({
  get: jest.fn().mockRejectedValue(new Error('Redis not available')),
}));

const JWT_SECRET = process.env.JWT_SECRET;

const makeToken = (payload, options = {}) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '1h', ...options });

describe('Auth Middleware', () => {
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
  // protect
  // ============================================================
  describe('protect', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const req = mockRequest({}, {}, {}, null, {});
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when token is malformed', async () => {
      const req = mockRequest({}, {}, {}, null, { authorization: 'Bearer notavalidtoken' });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when token is expired', async () => {
      const user = await dbHandler.createTestUser();
      const expiredToken = makeToken({ id: user._id.toString() }, { expiresIn: '-1s' });

      const req = mockRequest({}, {}, {}, null, { authorization: `Bearer ${expiredToken}` });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the user in the token does not exist', async () => {
      const ghostId = new mongoose.Types.ObjectId().toString();
      const token = makeToken({ id: ghostId });

      const req = mockRequest({}, {}, {}, null, { authorization: `Bearer ${token}` });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when the user account is suspended', async () => {
      const user = await dbHandler.createTestUser({ status: 'suspended' });
      const token = makeToken({ id: user._id.toString() });

      const req = mockRequest({}, {}, {}, null, { authorization: `Bearer ${token}` });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when the user account is banned', async () => {
      const user = await dbHandler.createTestUser({ status: 'banned' });
      const token = makeToken({ id: user._id.toString() });

      const req = mockRequest({}, {}, {}, null, { authorization: `Bearer ${token}` });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() and sets req.user for a valid active-user token', async () => {
      const user = await dbHandler.createTestUser({ status: 'active' });
      const token = makeToken({ id: user._id.toString() });

      const req = mockRequest({}, {}, {}, null, { authorization: `Bearer ${token}` });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(user._id.toString());
      expect(req.user.id.toString()).toBe(user._id.toString()); // consistency alias
      expect(req.user.password).toBeUndefined(); // sensitive field excluded
    });

    it('does not expose password in req.user', async () => {
      const user = await dbHandler.createTestUser();
      const token = makeToken({ id: user._id.toString() });

      const req = mockRequest({}, {}, {}, null, { authorization: `Bearer ${token}` });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.password).toBeUndefined();
    });
  });

  // ============================================================
  // authorize
  // ============================================================
  describe('authorize', () => {
    it('calls next() when user role is in the allowed roles list', () => {
      const req = { user: { role: 'admin' } };
      const res = mockResponse();
      const next = mockNext();

      authorize('admin', 'support')(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 403 when user role is NOT in the allowed roles list', () => {
      const req = { user: { role: 'customer' } };
      const res = mockResponse();
      const next = mockNext();

      authorize('admin', 'support')(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when req.user is not set (protect not run)', () => {
      const req = {};
      const res = mockResponse();
      const next = mockNext();

      authorize('admin')(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('correctly enforces technician-only access', () => {
      const techReq = { user: { role: 'technician' } };
      const custReq = { user: { role: 'customer' } };
      const res1 = mockResponse();
      const res2 = mockResponse();
      const next1 = mockNext();
      const next2 = mockNext();

      authorize('technician')(techReq, res1, next1);
      authorize('technician')(custReq, res2, next2);

      expect(next1).toHaveBeenCalled();
      expect(next2).not.toHaveBeenCalled();
      expect(res2.statusCode).toBe(403);
    });

    it('works with multiple allowed roles', () => {
      ['customer', 'technician', 'corporate', 'support', 'admin'].forEach(role => {
        const req = { user: { role } };
        const res = mockResponse();
        const next = mockNext();

        authorize('admin', 'support', 'corporate')(req, res, next);

        if (['admin', 'support', 'corporate'].includes(role)) {
          expect(next).toHaveBeenCalled();
        } else {
          expect(res.statusCode).toBe(403);
        }
      });
    });
  });

  // ============================================================
  // optionalAuth
  // ============================================================
  describe('optionalAuth', () => {
    it('sets req.user and calls next() when a valid token is provided', async () => {
      const user = await dbHandler.createTestUser();
      const token = makeToken({ id: user._id.toString() });

      const req = mockRequest({}, {}, {}, null, { authorization: `Bearer ${token}` });
      const res = mockResponse();
      const next = mockNext();

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(user._id.toString());
    });

    it('sets req.user to null and still calls next() for an invalid token', async () => {
      const req = mockRequest({}, {}, {}, null, { authorization: 'Bearer invalid.token.here' });
      const res = mockResponse();
      const next = mockNext();

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it('calls next() without modifying req.user when no token is provided', async () => {
      const req = mockRequest({}, {}, {}, null, {});
      const res = mockResponse();
      const next = mockNext();

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeFalsy(); // no token → user stays null/undefined
    });

    it('never returns an error response — always continues', async () => {
      const req = mockRequest({}, {}, {}, null, { authorization: 'Bearer completelybroken' });
      const res = mockResponse();
      const next = mockNext();

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      // optionalAuth must not send a response
      expect(res._jsonData).toBeNull();
    });
  });

  // ============================================================
  // requireVerified
  // ============================================================
  describe('requireVerified', () => {
    it('calls next() for a user with a verified email', () => {
      const req = { user: { isEmailVerified: true } };
      const res = mockResponse();
      const next = mockNext();

      requireVerified(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('returns 403 for a user with an unverified email', () => {
      const req = { user: { isEmailVerified: false } };
      const res = mockResponse();
      const next = mockNext();

      requireVerified(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
