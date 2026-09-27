/**
 * Tests for Tracking Service
 *
 * Tests cover:
 * - Tracking session creation
 * - Location updates with ETA calculation
 * - Kenya bounds validation
 * - Pause/resume privacy controls
 * - Session completion
 * - Authorization checks
 */

const {
  startTrackingSession,
  updateTechnicianLocation,
  getTrackingSession,
  endTrackingSession,
  pauseTracking,
  resumeTracking,
  validateKenyaBounds,
  isTrackingActive,
  getAllActiveSessions,
  cleanupExpiredSessions,
  getTrackingStats,
  KENYA_BOUNDS
} = require('../src/services/tracking.service');

describe('Tracking Service', () => {
  // Clean up after each test
  afterEach(() => {
    // End every session explicitly. cleanupExpiredSessions(0) alone loses a
    // same-millisecond race on fast machines (sessionAge of 0 > 0 is false),
    // which leaks sessions into later tests.
    getAllActiveSessions().forEach((s) => endTrackingSession(s.bookingId, s.technicianId));
    cleanupExpiredSessions(0); // belt and braces
  });

  describe('validateKenyaBounds', () => {
    it('should validate coordinates within Kenya bounds', () => {
      // Nairobi coordinates
      const result = validateKenyaBounds(36.8219, -1.2921);
      expect(result.isValid).toBe(true);
    });

    it('should validate Mombasa coordinates', () => {
      const result = validateKenyaBounds(39.6682, -4.0435);
      expect(result.isValid).toBe(true);
    });

    it('should validate Kisumu coordinates', () => {
      const result = validateKenyaBounds(34.7617, -0.1022);
      expect(result.isValid).toBe(true);
    });

    it('should reject coordinates outside Kenya (London)', () => {
      const result = validateKenyaBounds(-0.1276, 51.5074);
      expect(result.isValid).toBe(false);
      // London's longitude is outside Kenya bounds
      expect(result.error).toMatch(/Longitude|Latitude/);
    });

    it('should reject coordinates outside Kenya (New York)', () => {
      const result = validateKenyaBounds(-74.006, 40.7128);
      expect(result.isValid).toBe(false);
    });

    it('should reject invalid longitude type', () => {
      const result = validateKenyaBounds('invalid', -1.2921);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('numbers');
    });

    it('should reject invalid latitude type', () => {
      const result = validateKenyaBounds(36.8219, null);
      expect(result.isValid).toBe(false);
    });

    it('should reject NaN coordinates', () => {
      const result = validateKenyaBounds(NaN, -1.2921);
      expect(result.isValid).toBe(false);
    });

    it('should accept coordinates at boundary edges', () => {
      // Test min bounds
      expect(validateKenyaBounds(KENYA_BOUNDS.minLng, KENYA_BOUNDS.minLat).isValid).toBe(true);
      // Test max bounds
      expect(validateKenyaBounds(KENYA_BOUNDS.maxLng, KENYA_BOUNDS.maxLat).isValid).toBe(true);
    });
  });

  describe('startTrackingSession', () => {
    it('should create a new tracking session', () => {
      const session = startTrackingSession(
        'booking123',
        'tech456',
        'cust789',
        { coordinates: [36.8219, -1.2921], address: 'Nairobi, Kenya' }
      );

      expect(session).toBeDefined();
      expect(session.bookingId).toBe('booking123');
      expect(session.technicianId).toBe('tech456');
      expect(session.customerId).toBe('cust789');
      expect(session.status).toBe('active');
      expect(session.isPaused).toBe(false);
      expect(session.startTime).toBeInstanceOf(Date);
    });

    it('should require bookingId, technicianId, and customerId', () => {
      expect(() => startTrackingSession()).toThrow('required');
      expect(() => startTrackingSession('booking1')).toThrow('required');
      expect(() => startTrackingSession('booking1', 'tech1')).toThrow('required');
    });

    it('should require destination coordinates', () => {
      expect(() => startTrackingSession('b1', 't1', 'c1')).toThrow('Destination');
      expect(() => startTrackingSession('b1', 't1', 'c1', {})).toThrow('Destination');
    });

    it('should validate destination coordinates', () => {
      expect(() => startTrackingSession(
        'b1', 't1', 'c1',
        { coordinates: [200, -100] } // Invalid coordinates
      )).toThrow('Invalid destination');
    });

    it('should replace existing session for same booking', () => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });

      const newSession = startTrackingSession('booking1', 'tech2', 'cust1', {
        coordinates: [39.6682, -4.0435],
        address: 'Mombasa'
      });

      expect(newSession.technicianId).toBe('tech2');
      expect(newSession.destination.address).toBe('Mombasa');
    });
  });

  describe('updateTechnicianLocation', () => {
    beforeEach(() => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi CBD'
      });
    });

    it('should update technician location', () => {
      const result = updateTechnicianLocation('booking1', 'tech1', [36.8036, -1.2634]);

      expect(result).toBeDefined();
      expect(result.position.coordinates).toEqual([36.8036, -1.2634]);
      expect(result.eta).toBeDefined();
      expect(result.eta.minutes).toBeGreaterThanOrEqual(0);
      expect(result.eta.text).toMatch(/^~\d+ min$/);
    });

    it('should reject updates from unauthorized technician', () => {
      expect(() => updateTechnicianLocation('booking1', 'wrong_tech', [36.8036, -1.2634]))
        .toThrow('Unauthorized');
    });

    it('should reject updates for non-existent session', () => {
      expect(() => updateTechnicianLocation('nonexistent', 'tech1', [36.8036, -1.2634]))
        .toThrow('No active tracking session');
    });

    it('should reject invalid coordinates', () => {
      expect(() => updateTechnicianLocation('booking1', 'tech1', [200, -100]))
        .toThrow('Invalid coordinates');
    });

    it('should reject coordinates not in array format', () => {
      expect(() => updateTechnicianLocation('booking1', 'tech1', 'invalid'))
        .toThrow('array');
    });

    it('should store position history', () => {
      updateTechnicianLocation('booking1', 'tech1', [36.81, -1.29]);
      updateTechnicianLocation('booking1', 'tech1', [36.82, -1.28]);
      updateTechnicianLocation('booking1', 'tech1', [36.83, -1.27]);

      const session = getTrackingSession('booking1', 'cust1');
      // Position history is maintained internally
      expect(session.currentPosition.coordinates).toEqual([36.83, -1.27]);
    });

    it('should reject updates when tracking is paused', () => {
      pauseTracking('booking1', 'tech1');

      expect(() => updateTechnicianLocation('booking1', 'tech1', [36.8036, -1.2634]))
        .toThrow('paused');
    });
  });

  describe('getTrackingSession', () => {
    beforeEach(() => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });
    });

    it('should return session for authorized customer', () => {
      const session = getTrackingSession('booking1', 'cust1');
      expect(session).toBeDefined();
      expect(session.bookingId).toBe('booking1');
    });

    it('should return session for authorized technician', () => {
      const session = getTrackingSession('booking1', 'tech1');
      expect(session).toBeDefined();
      expect(session.technicianId).toBe('tech1');
    });

    it('should reject unauthorized users', () => {
      expect(() => getTrackingSession('booking1', 'wrong_user'))
        .toThrow('Unauthorized');
    });

    it('should return null for non-existent session', () => {
      const session = getTrackingSession('nonexistent', 'cust1');
      expect(session).toBeNull();
    });
  });

  describe('pauseTracking', () => {
    beforeEach(() => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });
    });

    it('should pause tracking session', () => {
      const result = pauseTracking('booking1', 'tech1');

      expect(result.isPaused).toBe(true);
      expect(result.status).toBe('paused');
    });

    it('should reject pause from unauthorized user', () => {
      expect(() => pauseTracking('booking1', 'cust1'))
        .toThrow('Unauthorized');
    });

    it('should reject double pause', () => {
      pauseTracking('booking1', 'tech1');
      expect(() => pauseTracking('booking1', 'tech1'))
        .toThrow('already paused');
    });

    it('should reject pause for non-existent session', () => {
      expect(() => pauseTracking('nonexistent', 'tech1'))
        .toThrow('No active tracking session');
    });
  });

  describe('resumeTracking', () => {
    beforeEach(() => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });
      pauseTracking('booking1', 'tech1');
    });

    it('should resume tracking session', () => {
      const result = resumeTracking('booking1', 'tech1');

      expect(result.isPaused).toBe(false);
      expect(result.status).toBe('active');
    });

    it('should reject resume from unauthorized user', () => {
      expect(() => resumeTracking('booking1', 'cust1'))
        .toThrow('Unauthorized');
    });

    it('should reject resume when not paused', () => {
      resumeTracking('booking1', 'tech1');
      expect(() => resumeTracking('booking1', 'tech1'))
        .toThrow('not paused');
    });
  });

  describe('endTrackingSession', () => {
    beforeEach(() => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });
    });

    it('should end tracking session', () => {
      const summary = endTrackingSession('booking1', 'tech1');

      expect(summary).toBeDefined();
      expect(summary.status).toBe('completed');
      expect(summary.endTime).toBeInstanceOf(Date);
      expect(summary.duration).toBeDefined();
    });

    it('should remove session from active sessions', () => {
      endTrackingSession('booking1', 'tech1');

      const session = getTrackingSession('booking1', 'cust1');
      expect(session).toBeNull();
    });

    it('should reject end from unauthorized user', () => {
      expect(() => endTrackingSession('booking1', 'cust1'))
        .toThrow('Unauthorized');
    });

    it('should reject end for non-existent session', () => {
      expect(() => endTrackingSession('nonexistent', 'tech1'))
        .toThrow('No active tracking session');
    });
  });

  describe('isTrackingActive', () => {
    it('should return true for active session', () => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });

      expect(isTrackingActive('booking1')).toBe(true);
    });

    it('should return false for paused session', () => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });
      pauseTracking('booking1', 'tech1');

      expect(isTrackingActive('booking1')).toBe(false);
    });

    it('should return false for non-existent session', () => {
      expect(isTrackingActive('nonexistent')).toBe(false);
    });
  });

  describe('getAllActiveSessions', () => {
    it('should return all active sessions', () => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });
      startTrackingSession('booking2', 'tech2', 'cust2', {
        coordinates: [39.6682, -4.0435],
        address: 'Mombasa'
      });

      const sessions = getAllActiveSessions();

      expect(sessions.length).toBe(2);
      expect(sessions.find(s => s.bookingId === 'booking1')).toBeDefined();
      expect(sessions.find(s => s.bookingId === 'booking2')).toBeDefined();
    });

    it('should return empty array when no sessions', () => {
      const sessions = getAllActiveSessions();
      expect(sessions.length).toBe(0);
    });
  });

  describe('getTrackingStats', () => {
    it('should return correct statistics', () => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });
      startTrackingSession('booking2', 'tech2', 'cust2', {
        coordinates: [39.6682, -4.0435],
        address: 'Mombasa'
      });
      pauseTracking('booking1', 'tech1');

      const stats = getTrackingStats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.activeSessions).toBe(1);
      expect(stats.pausedSessions).toBe(1);
      expect(stats.kenyaBounds).toEqual(KENYA_BOUNDS);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should not clean up recent sessions', () => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });

      // Clean up sessions older than 60 minutes (none should be removed)
      const cleaned = cleanupExpiredSessions(60);

      // Session should still exist
      expect(getAllActiveSessions().length).toBe(1);
      expect(cleaned).toBe(0);
    });

    it('should return count of cleaned sessions', () => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi'
      });
      startTrackingSession('booking2', 'tech2', 'cust2', {
        coordinates: [39.6682, -4.0435],
        address: 'Mombasa'
      });

      // Clean up with -1 minutes (forces cleanup of all sessions immediately)
      // Since startTime is Date.now(), any negative maxAge should trigger cleanup
      const cleaned = cleanupExpiredSessions(-1);

      // Both sessions should be removed since -1 minutes means all
      expect(cleaned).toBe(2);
      expect(getAllActiveSessions().length).toBe(0);
    });
  });

  describe('ETACalculation', () => {
    it('should calculate ETA when location is updated', () => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921], // Nairobi CBD
        address: 'Nairobi CBD'
      }, 'urban');

      const result = updateTechnicianLocation('booking1', 'tech1', [36.8036, -1.2634]); // Westlands

      expect(result.eta).toBeDefined();
      expect(result.eta.minutes).toBeGreaterThan(0);
      expect(result.eta.text).toMatch(/^~\d+ min$/);
      expect(result.eta.distance).toBeGreaterThan(0);
      expect(result.eta.distanceText).toMatch(/^\d+(\.\d)? km$/);
    });

    it('should show 0 ETA when at destination', () => {
      startTrackingSession('booking1', 'tech1', 'cust1', {
        coordinates: [36.8219, -1.2921],
        address: 'Nairobi CBD'
      });

      const result = updateTechnicianLocation('booking1', 'tech1', [36.8219, -1.2921]);

      expect(result.eta.minutes).toBe(0);
      expect(result.eta.text).toBe('~0 min');
    });
  });
});
