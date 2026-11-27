/**
 * Traction KPIs
 *
 * The maths is tested as pure functions; the routes are tested with the
 * service mocked, so no database is needed.
 */

const express = require('express');
const request = require('supertest');

const {
  weekStart,
  lastWeekStarts,
  countByWeek,
  share,
  repeatRate,
} = require('../src/services/traction.service');

describe('traction maths', () => {
  describe('weekStart (Monday 00:00 East Africa Time)', () => {
    it('maps a Wednesday to the Monday of the same week', () => {
      // Wed 26 Nov 2026 12:00 EAT = 09:00 UTC
      const start = weekStart(new Date('2026-11-26T09:00:00Z'));
      // Mon 23 Nov 2026 00:00 EAT = Sun 22 Nov 21:00 UTC
      expect(start.toISOString()).toBe('2026-11-22T21:00:00.000Z');
    });

    it('treats Sunday night UTC that is already Monday in Nairobi as the new week', () => {
      // Sun 29 Nov 2026 22:30 UTC = Mon 30 Nov 01:30 EAT
      const start = weekStart(new Date('2026-11-29T22:30:00Z'));
      expect(start.toISOString()).toBe('2026-11-29T21:00:00.000Z');
    });

    it('keeps Sunday evening in Nairobi in the old week', () => {
      // Sun 29 Nov 2026 20:00 EAT = 17:00 UTC
      const start = weekStart(new Date('2026-11-29T17:00:00Z'));
      expect(start.toISOString()).toBe('2026-11-22T21:00:00.000Z');
    });
  });

  describe('lastWeekStarts', () => {
    it('returns the requested number of weeks, oldest first, ending with the current week', () => {
      const weeks = lastWeekStarts(new Date('2026-11-26T09:00:00Z'), 3);
      expect(weeks.map((w) => w.toISOString())).toEqual([
        '2026-11-08T21:00:00.000Z',
        '2026-11-15T21:00:00.000Z',
        '2026-11-22T21:00:00.000Z',
      ]);
    });
  });

  describe('countByWeek', () => {
    const weeks = lastWeekStarts(new Date('2026-11-26T09:00:00Z'), 2);

    it('counts dates into their week and labels weeks by their Nairobi date', () => {
      const result = countByWeek(
        [
          new Date('2026-11-17T08:00:00Z'), // week of 16 Nov
          new Date('2026-11-24T08:00:00Z'), // week of 23 Nov
          new Date('2026-11-25T08:00:00Z'), // week of 23 Nov
        ],
        weeks
      );
      expect(result).toEqual([
        { weekStart: '2026-11-16', count: 1 },
        { weekStart: '2026-11-23', count: 2 },
      ]);
    });

    it('ignores dates outside the range and empty values', () => {
      const result = countByWeek([new Date('2026-01-01T00:00:00Z'), null, undefined], weeks);
      expect(result.map((r) => r.count)).toEqual([0, 0]);
    });
  });

  describe('share', () => {
    it('rounds to three decimal places', () => {
      expect(share(1, 3)).toBe(0.333);
    });

    it('returns null when there is nothing to divide by', () => {
      expect(share(0, 0)).toBeNull();
    });
  });

  describe('repeatRate', () => {
    it('is customers with 2+ jobs over customers with 1+', () => {
      expect(repeatRate([1, 1, 2, 5])).toBe(0.5);
    });

    it('is null with no customers', () => {
      expect(repeatRate([])).toBeNull();
    });
  });
});

describe('traction routes', () => {
  const sample = {
    asOf: '2026-11-26T09:00:00.000Z',
    weeks: 12,
    technicians: { registered: 10, verified: 4 },
    customers: { registered: 25 },
    completedJobs: { total: 7, inWindow: 7, perWeek: [] },
    repeatCustomerRate: 0.2,
    inAppPaymentShare: 0.5,
  };

  let tractionService;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../src/services/traction.service', () => ({
      getTraction: jest.fn(async ({ includeRevenue } = {}) =>
        includeRevenue ? { ...sample, platformRevenueByMonth: [{ month: '2026-11', amountKes: 1200 }] } : sample
      ),
    }));
    tractionService = require('../src/services/traction.service');
  });

  afterEach(() => {
    jest.dontMock('../src/services/traction.service');
  });

  it('GET /api/v1/public/traction returns aggregate figures without revenue', async () => {
    const app = express();
    app.use('/api/v1/public', require('../src/routes/traction.routes'));

    const res = await request(app).get('/api/v1/public/traction');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.technicians.verified).toBe(4);
    expect(res.body.data.platformRevenueByMonth).toBeUndefined();
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    expect(tractionService.getTraction).toHaveBeenCalledWith({ weeks: 12 });
  });

  it('serves the cached figures on the next request within the hour', async () => {
    const app = express();
    app.use('/api/v1/public', require('../src/routes/traction.routes'));

    await request(app).get('/api/v1/public/traction');
    await request(app).get('/api/v1/public/traction');

    expect(tractionService.getTraction).toHaveBeenCalledTimes(1);
  });

  it('returns 500 without internal details when the service fails', async () => {
    tractionService.getTraction.mockRejectedValueOnce(new Error('db down'));
    const app = express();
    app.use('/api/v1/public', require('../src/routes/traction.routes'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/api/v1/public/traction');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, message: 'Failed to retrieve traction figures' });
  });
});
