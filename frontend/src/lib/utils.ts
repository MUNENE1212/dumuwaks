import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, differenceInYears } from 'date-fns';

/**
 * Merge class names with Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ============================================
   DESIGN TOKEN ACCESS UTILITIES
   Rich Dark Design System for Dumuwaks
   ============================================ */

/**
 * Get CSS variable value with fallback
 * @param variable - CSS variable name (with or without -- prefix)
 * @param fallback - Fallback value if variable is not defined
 */
export function getToken(variable: string, fallback: string = ''): string {
  const varName = variable.startsWith('--') ? variable : `--${variable}`;
  return `var(${varName}${fallback ? `, ${fallback}` : ''})`;
}

/**
 * Get color token value
 */
export function colorToken(color: keyof typeof colorTokens): string {
  return getToken(colorTokens[color]);
}

/**
 * Rich Dark Design System Color Tokens
 * Maps semantic names to CSS variable names
 */
export const colorTokens = {
  // Background colors
  bgPrimary: '--dw-bg-primary',      // Deep Mahogany #14110c
  bgSecondary: '--dw-bg-secondary',    // Iron Charcoal #1d1811
  bgTertiary: '--dw-bg-tertiary',
  bgElevated: '--dw-bg-elevated',
  bgHover: '--dw-bg-hover',
  bgActive: '--dw-bg-active',

  // Text colors
  textPrimary: '--dw-text-primary',    // Soft Bone #f5eee1
  textSecondary: '--dw-text-secondary',  // Steel Grey #b8ab95
  textTertiary: '--dw-text-tertiary',
  textDisabled: '--dw-text-disabled',
  textLink: '--dw-text-link',          // Circuit Blue #e8a317

  // Brand/Accent colors
  accentPrimary: '--dw-accent-primary',  // Circuit Blue #e8a317
  accentSecondary: '--dw-accent-secondary', // Wrench Purple #1fa3d6
  accentHover: '--dw-accent-hover',

  // Semantic colors
  success: '--dw-color-success',
  successBg: '--dw-color-success-bg',
  warning: '--dw-color-warning',
  warningBg: '--dw-color-warning-bg',
  error: '--dw-color-error',
  errorBg: '--dw-color-error-bg',
  info: '--dw-color-info',
  infoBg: '--dw-color-info-bg',

  // Border colors
  borderSubtle: '--dw-border-subtle',
  borderDefault: '--dw-border-default',
  borderStrong: '--dw-border-strong',
  borderFocus: '--dw-border-focus',
} as const;

/**
 * Spacing tokens
 */
export const spacingTokens = {
  0: '--dw-spacing-0',
  1: '--dw-spacing-1',
  2: '--dw-spacing-2',
  3: '--dw-spacing-3',
  4: '--dw-spacing-4',
  5: '--dw-spacing-5',
  6: '--dw-spacing-6',
  8: '--dw-spacing-8',
  10: '--dw-spacing-10',
  12: '--dw-spacing-12',
  16: '--dw-spacing-16',
  20: '--dw-spacing-20',
  24: '--dw-spacing-24',
} as const;

/**
 * Radius tokens
 */
export const radiusTokens = {
  none: '--dw-radius-none',
  sm: '--dw-radius-sm',
  md: '--dw-radius-md',
  lg: '--dw-radius-lg',
  xl: '--dw-radius-xl',
  '2xl': '--dw-radius-2xl',
  full: '--dw-radius-full',
} as const;

/**
 * Shadow tokens
 */
export const shadowTokens = {
  sm: '--dw-shadow-sm',
  md: '--dw-shadow-md',
  lg: '--dw-shadow-lg',
  xl: '--dw-shadow-xl',
  '2xl': '--dw-shadow-2xl',
  glass: '--dw-shadow-glass',
  glassLg: '--dw-shadow-glass-lg',
  led: '--dw-shadow-led',
  ledLg: '--dw-shadow-led-lg',
  ledPurple: '--dw-shadow-led-purple',
  brand: '--dw-shadow-brand',
  brandLg: '--dw-shadow-brand-lg',
  mahogany: '--dw-shadow-mahogany',
  mahoganyLg: '--dw-shadow-mahogany-lg',
} as const;

/**
 * Get inline style for dynamic design token usage
 * @param tokens - Object of token names to values
 */
export function tokenStyles(tokens: Record<string, string>): React.CSSProperties {
  const styles: React.CSSProperties = {};
  for (const [key, value] of Object.entries(tokens)) {
    styles[key as keyof React.CSSProperties] = getToken(value) as any;
  }
  return styles;
}

/**
 * Create a style object with LED glow effect
 * @param color - Base color for the glow (default: Circuit Blue)
 */
export function ledGlowStyle(color?: string): React.CSSProperties {
  return {
    boxShadow: color
      ? `0 0 10px ${color}40, 0 0 20px ${color}20`
      : getToken('--dw-shadow-led'),
  };
}

/**
 * Create gradient style
 * @param from - Start color
 * @param to - End color
 * @param direction - Gradient direction (default: 135deg)
 */
export function gradientStyle(
  from: string,
  to: string,
  direction: string = '135deg'
): React.CSSProperties {
  return {
    background: `linear-gradient(${direction}, ${from}, ${to})`,
  };
}

/* ============================================
   ACCESSIBILITY UTILITIES
   ============================================ */

/**
 * Generate a unique ID for accessibility attributes
 */
let idCounter = 0;
export function generateId(prefix: string = 'dw'): string {
  return `${prefix}-${idCounter++}`;
}

/**
 * Screen reader only - visually hide but keep accessible
 * Returns CSS class name for screen reader only content
 */
export const srOnly = 'sr-only';

/**
 * Focus visible utilities
 * Returns class that only shows focus ring when using keyboard
 */
export const focusVisible = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get safe animation duration based on reduced motion preference
 */
export function getAnimationDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0.01 : normalDuration;
}

/**
 * Announce message to screen readers via ARIA live region
 * Creates a temporary element, appends to DOM, then removes after announcement
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const element = document.createElement('div');
  element.setAttribute('aria-live', priority);
  element.setAttribute('aria-atomic', 'true');
  element.className = 'sr-only';
  element.textContent = message;

  document.body.appendChild(element);

  // Remove after announcement (typical screen reader delay)
  setTimeout(() => {
    document.body.removeChild(element);
  }, 1000);
}

/**
 * Trap focus within a container element (for modals, dialogs)
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Focus first element
  if (firstElement) {
    firstElement.focus();
  }

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Get aria-current value based on page/path
 */
export function getAriaCurrent(currentPath: string, itemPath: string): 'page' | undefined {
  return currentPath === itemPath ? 'page' : undefined;
}

/**
 * Generate ARIA attributes for icon buttons
 */
export function getIconButtonAria(label: string, pressed?: boolean): {
  role: string;
  'aria-label': string;
  'aria-pressed'?: boolean;
} {
  const attrs = {
    role: 'button',
    'aria-label': label,
  } as { role: string; 'aria-label': string; 'aria-pressed'?: boolean };

  if (pressed !== undefined) {
    attrs['aria-pressed'] = pressed;
  }

  return attrs;
}

/**
 * Calculate contrast ratio between two colors (for WCAG compliance)
 * Returns ratio from 1-21 (higher is better contrast)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color (for contrast calculations)
 */
function getLuminance(color: string): number {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const [R, G, B] = [r, g, b].map((channel) => {
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Check if contrast meets WCAG AA standard (4.5:1 for normal text)
 */
export function meetsWCAG_AA(foreground: string, background: string, largeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minimum = largeText ? 3 : 4.5;
  return ratio >= minimum;
}

/**
 * Check if contrast meets WCAG AAA standard (7:1 for normal text)
 */
export function meetsWCAG_AAA(foreground: string, background: string, largeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minimum = largeText ? 4.5 : 7;
  return ratio >= minimum;
}

/**
 * Format date to readable string using date-fns
 */
export function formatDate(
  date: Date | string | number,
  formatStr: string = 'MMM dd, yyyy'
): string {
  return format(new Date(date), formatStr);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format currency in Kenyan Shilling
 */
export function formatCurrency(
  amount: number,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/**
 * Format rating to display with stars
 */
export function formatRating(
  rating: number,
  maxRating: number = 5
): {
  full: number;
  half: number;
  empty: number;
  displayValue: string;
} {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const halfStars = hasHalfStar ? 1 : 0;
  const emptyStars = maxRating - fullStars - halfStars;

  return {
    full: fullStars,
    half: halfStars,
    empty: emptyStars,
    displayValue: rating.toFixed(1),
  };
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date | string | number): number {
  return differenceInYears(new Date(), new Date(dateOfBirth));
}

/**
 * Truncate text
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Get initials from name(s)
 */
export function getInitials(firstName: string, lastName?: string): string {
  if (lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  // Handle single name or full name string
  return firstName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Calculate time ago (legacy - use formatRelativeTime)
 */
export function timeAgo(date: string | Date): string {
  return formatRelativeTime(date);
}

/**
 * Format phone number in Kenyan format
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+254' + cleaned.slice(1);
  }

  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return '+' + cleaned;
  }

  return phone;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  const kenyanPhoneRegex = /^(0|254|\+254)?[17]\d{8}$/;
  return kenyanPhoneRegex.test(cleaned);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate random ID string
 */
export function generateRandomId(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if code is running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if code is running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

