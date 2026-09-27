/**
 * Technician ID verification and public user serialization.
 */
jest.mock('../src/services/notification.service', () => ({ createNotification: jest.fn() }));

const express = require('express');
const request = require('supertest');
const dbHandler = require('./utils/dbHandler');
const User = require('../src/models/User');

const app = express();
app.use(express.json());
app.use('/api/v1/users', require('../src/routes/user.routes'));
app.use('/api/v1/admin', require('../src/routes/admin.routes'));
const auth = (u) => ({ Authorization: `Bearer ${dbHandler.generateTestToken(u._id)}` });

let technician;
let admin;

beforeAll(() => dbHandler.connect());
beforeEach(async () => {
  await dbHandler.clearDatabase();
  technician = await dbHandler.createTestTechnician();
  admin = await dbHandler.createTestAdmin();
  await User.updateOne(
    { _id: technician._id },
    {
      $set: {
        refreshTokens: [{ token: 'secret-refresh', createdAt: new Date() }],
        'kyc.idNumber': '12345678',
        payoutDestination: { method: 'mpesa', phone: '254711222333', verifiedAt: new Date() },
      },
    }
  );
});
afterAll(() => dbHandler.closeDatabase());

it('public user endpoints never return tokens, ID data or payout details', async () => {
  const res = await request(app).get(`/api/v1/users/${technician._id}`);
  const body = JSON.stringify(res.body);
  expect(res.status).toBe(200);
  expect(body).not.toMatch(/secret-refresh|12345678|254711222333/);
  expect(body).not.toMatch(/"password"|"kyc"|"payoutDestination"|"refreshTokens"/);
});

it('every technician is shown as not yet verified until an admin checks their ID', async () => {
  let res = await request(app).get(`/api/v1/users/${technician._id}`);
  const user = res.body.data?.user || res.body.data || res.body.user;
  expect(user.verification).toEqual({ isVerified: false, verifiedAt: null });

  const denied = await request(app).patch(`/api/v1/admin/users/${technician._id}/verification`).set(auth(technician)).send({ verified: true });
  expect(denied.status).toBe(403);

  const ok = await request(app).patch(`/api/v1/admin/users/${technician._id}/verification`).set(auth(admin)).send({ verified: true });
  expect(ok.status).toBe(200);
  expect(ok.body.data.verification.isVerified).toBe(true);

  res = await request(app).get(`/api/v1/users/${technician._id}`);
  const after = res.body.data?.user || res.body.data || res.body.user;
  expect(after.verification.isVerified).toBe(true);
  const stored = await User.findById(technician._id).select('kyc');
  expect(String(stored.kyc.verifiedBy)).toBe(String(admin._id));
});

it('only technicians can be verified', async () => {
  const res = await request(app).patch(`/api/v1/admin/users/${admin._id}/verification`).set(auth(admin)).send({ verified: true });
  expect(res.status).toBe(400);
});
