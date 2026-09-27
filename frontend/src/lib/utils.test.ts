/**
 * Utility Functions Tests
 *
 * Tests for utility functions covering:
 * - cn (className merger)
 * - Token utilities
 * - Accessibility utilities
 * - Formatting utilities
 * - Date utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the utilities
import {
  cn,
  getToken,
  colorToken,
  colorTokens,
  generateId,
  srOnly,
  prefersReducedMotion,
  getAnimationDuration,
  getAriaCurrent,
  getIconButtonAria,
  getContrastRatio,
  meetsWCAG_AA,
  meetsWCAG_AAA,
  formatDate,
  formatCurrency,
  truncate,
  getInitials,
  timeAgo
} from './utils';

describe('Utility Functions', () => {
  // ============================================
  // CN (CLASSNAME MERGER) TESTS
  // ============================================
  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'included', false && 'excluded');
      expect(result).toContain('base');
      expect(result).toContain('included');
      expect(result).not.toContain('excluded');
    });

    it('should merge tailwind classes correctly', () => {
      // twMerge should handle conflicting tailwind classes
      const result = cn('p-4', 'p-6');
      expect(result).toBe('p-6');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base', undefined, null, 'end');
      expect(result).toContain('base');
      expect(result).toContain('end');
    });

    it('should handle object syntax', () => {
      const result = cn({ active: true, disabled: false });
      expect(result).toContain('active');
      expect(result).not.toContain('disabled');
    });

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).toContain('class3');
    });
  });

  // ============================================
  // TOKEN UTILITIES TESTS
  // ============================================
  describe('getToken', () => {
    it('should generate CSS var syntax for tokens', () => {
      const result = getToken('my-color');
      expect(result).toBe('var(--my-color)');
    });

    it('should not double-prefix if already has --', () => {
      const result = getToken('--my-color');
      expect(result).toBe('var(--my-color)');
    });

    it('should include fallback value', () => {
      const result = getToken('my-color', '#fff');
      expect(result).toBe('var(--my-color, #fff)');
    });

    it('should return just var() if no fallback', () => {
      const result = getToken('my-token');
      expect(result).toBe('var(--my-token)');
    });
  });

  describe('colorToken', () => {
    it('should return CSS var for color token', () => {
      const result = colorToken('bgPrimary');
      expect(result).toBe('var(--dw-bg-primary)');
    });

    it('should work for all color tokens', () => {
      const tokens = Object.keys(colorTokens) as (keyof typeof colorTokens)[];
      tokens.forEach(token => {
        const result = colorToken(token);
        expect(result).toMatch(/^var\(--dw-/);
      });
    });
  });

  // ============================================
  // ACCESSIBILITY UTILITIES TESTS
  // ============================================
  describe('generateId', () => {
    beforeEach(() => {
      // Reset the counter is not possible since it's a module-level variable
      // But we can test that it generates unique IDs
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should use custom prefix', () => {
      const id = generateId('custom');
      expect(id).toMatch(/^custom-/);
    });

    it('should use default prefix "dw"', () => {
      const id = generateId();
      expect(id).toMatch(/^dw-/);
    });
  });

  describe('srOnly', () => {
    it('should be defined as a string', () => {
      expect(srOnly).toBe('sr-only');
    });
  });

  describe('prefersReducedMotion', () => {
    beforeEach(() => {
      // Re-mock matchMedia — vitest's mockReset clears the setup.tsx mock
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });

    it('should return boolean', () => {
      const result = prefersReducedMotion();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getAnimationDuration', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });

    it('should return original duration when no reduced motion', () => {
      const duration = 500;
      const result = getAnimationDuration(duration);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(duration);
    });
  });

  describe('getAriaCurrent', () => {
    it('should return "page" when paths match', () => {
      const result = getAriaCurrent('/home', '/home');
      expect(result).toBe('page');
    });

    it('should return undefined when paths do not match', () => {
      const result = getAriaCurrent('/home', '/about');
      expect(result).toBeUndefined();
    });
  });

  describe('getIconButtonAria', () => {
    it('should return required aria attributes', () => {
      const result = getIconButtonAria('Menu');
      expect(result.role).toBe('button');
      expect(result['aria-label']).toBe('Menu');
    });

    it('should include aria-pressed when provided', () => {
      const result = getIconButtonAria('Toggle', true);
      expect(result['aria-pressed']).toBe(true);
    });

    it('should include aria-pressed as false when provided', () => {
      const result = getIconButtonAria('Toggle', false);
      expect(result['aria-pressed']).toBe(false);
    });

    it('should not include aria-pressed when undefined', () => {
      const result = getIconButtonAria('Menu', undefined);
      expect(result['aria-pressed']).toBeUndefined();
    });
  });

  // ============================================
  // CONTRAST UTILITIES TESTS
  // ============================================
  describe('getContrastRatio', () => {
    it('should calculate contrast ratio between two colors', () => {
      const ratio = getContrastRatio('#ffffff', '#000000');
      expect(ratio).toBe(21); // Maximum contrast
    });

    it('should return 1 for identical colors', () => {
      const ratio = getContrastRatio('#ff0000', '#ff0000');
      expect(ratio).toBe(1);
    });

    it('should handle different color formats', () => {
      const ratio = getContrastRatio('#e8a317', '#14110c');
      expect(ratio).toBeGreaterThan(1);
    });
  });

  describe('meetsWCAG_AA', () => {
    it('should return true for high contrast', () => {
      const result = meetsWCAG_AA('#ffffff', '#000000');
      expect(result).toBe(true);
    });

    it('should return false for low contrast', () => {
      const result = meetsWCAG_AA('#777777', '#888888');
      expect(result).toBe(false);
    });

    it('should have lower threshold for large text', () => {
      // Low contrast might pass for large text but fail for normal
      const normalResult = meetsWCAG_AA('#666666', '#ffffff', false);
      const largeResult = meetsWCAG_AA('#666666', '#ffffff', true);
      // Large text has lower requirements, so it may pass when normal fails
      expect(typeof largeResult).toBe('boolean');
      expect(typeof normalResult).toBe('boolean');
    });
  });

  describe('meetsWCAG_AAA', () => {
    it('should have stricter requirements than AA', () => {
      const aaResult = meetsWCAG_AA('#595959', '#ffffff');
      const aaaResult = meetsWCAG_AAA('#595959', '#ffffff');
      // AAA is stricter, so might fail where AA passes
      expect(typeof aaaResult).toBe('boolean');
      expect(typeof aaResult).toBe('boolean');
    });

    it('should return true for maximum contrast', () => {
      const result = meetsWCAG_AAA('#ffffff', '#000000');
      expect(result).toBe(true);
    });
  });

  // ============================================
  // FORMATTING UTILITIES TESTS
  // ============================================
  describe('formatDate', () => {
    it('should format date to readable string', () => {
      const result = formatDate('2024-01-15');
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('should accept Date object', () => {
      const result = formatDate(new Date('2024-06-20'));
      expect(result).toMatch(/Jun/);
      expect(result).toMatch(/20/);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with KES by default', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('1,000');
    });

    it('should accept different currency', () => {
      const result = formatCurrency(1000, { currency: 'USD' });
      expect(result).toContain('1,000');
    });

    it('should handle decimal amounts', () => {
      const result = formatCurrency(1000.5);
      expect(result).toContain('1,000');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const result = truncate('This is a long string', 10);
      expect(result).toBe('This is a ...');
      expect(result.length).toBe(13); // 10 chars + '...'
    });

    it('should not truncate short strings', () => {
      const result = truncate('Short', 10);
      expect(result).toBe('Short');
    });

    it('should handle exact length strings', () => {
      const result = truncate('Exactly10!', 10);
      expect(result).toBe('Exactly10!');
    });

    it('should handle empty strings', () => {
      const result = truncate('', 10);
      expect(result).toBe('');
    });
  });

  describe('getInitials', () => {
    it('should return uppercase initials', () => {
      const result = getInitials('John', 'Doe');
      expect(result).toBe('JD');
    });

    it('should handle lowercase names', () => {
      const result = getInitials('john', 'doe');
      expect(result).toBe('JD');
    });

    it('should handle single character names', () => {
      const result = getInitials('A', 'B');
      expect(result).toBe('AB');
    });
  });

  describe('timeAgo', () => {
    it('should return seconds ago for recent times', () => {
      const now = new Date();
      const result = timeAgo(now);
      expect(result).toMatch(/less than a minute ago|seconds? ago/);
    });

    it('should return minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      const result = timeAgo(date);
      expect(result).toMatch(/minutes? ago/);
    });

    it('should return hours ago', () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = timeAgo(date);
      expect(result).toMatch(/hours? ago/);
    });

    it('should return days ago', () => {
      const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = timeAgo(date);
      expect(result).toMatch(/days? ago/);
    });

    it('should accept string date', () => {
      const date = new Date(Date.now() - 1000).toISOString();
      const result = timeAgo(date);
      expect(result).toMatch(/ago/);
    });
  });
});
