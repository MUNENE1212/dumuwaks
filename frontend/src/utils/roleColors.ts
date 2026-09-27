/**
 * Role Color Utilities
 *
 * Provides consistent color schemes for different user roles across the application.
 * Supports both light and dark modes.
 */

export type UserRole = 'customer' | 'technician' | 'admin' | 'corporate' | 'support';

interface RoleColorScheme {
  // Badge colors
  badge: string;
  badgeText: string;
  // Border colors for posts/messages
  border: string;
  // Background accents
  bgLight: string;
  bgDark: string;
  // Ring/highlight colors
  ring: string;
  // Text colors
  text: string;
  // Icon color
  icon: string;
}

/**
 * Color schemes for each role
 * Designed to be visually distinct and accessible
 */
const roleColorSchemes: Record<UserRole, RoleColorScheme> = {
  customer: {
    badge: 'bg-blue-900/30',
    badgeText: 'text-blue-300',
    border: 'border-blue-800',
    bgLight: 'bg-blue-950/20',
    bgDark: 'bg-blue-900/30',
    ring: 'ring-blue-500',
    text: 'text-blue-400',
    icon: 'text-blue-400',
  },
  technician: {
    badge: 'bg-green-900/30',
    badgeText: 'text-green-300',
    border: 'border-green-800',
    bgLight: 'bg-green-950/20',
    bgDark: 'bg-green-900/30',
    ring: 'ring-green-500',
    text: 'text-green-400',
    icon: 'text-green-400',
  },
  admin: {
    badge: 'bg-purple-900/30',
    badgeText: 'text-purple-300',
    border: 'border-purple-800',
    bgLight: 'bg-purple-950/20',
    bgDark: 'bg-purple-900/30',
    ring: 'ring-purple-500',
    text: 'text-purple-400',
    icon: 'text-purple-400',
  },
  corporate: {
    badge: 'bg-amber-900/30',
    badgeText: 'text-amber-300',
    border: 'border-amber-800',
    bgLight: 'bg-amber-950/20',
    bgDark: 'bg-amber-900/30',
    ring: 'ring-amber-500',
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
  support: {
    badge: 'bg-cyan-900/30',
    badgeText: 'text-cyan-300',
    border: 'border-cyan-800',
    bgLight: 'bg-cyan-950/20',
    bgDark: 'bg-cyan-900/30',
    ring: 'ring-cyan-500',
    text: 'text-cyan-400',
    icon: 'text-cyan-400',
  },
};

/**
 * Get color scheme for a specific role
 */
export const getRoleColors = (role: UserRole): RoleColorScheme => {
  return roleColorSchemes[role] || roleColorSchemes.customer;
};

/**
 * Get badge classes for a role
 */
export const getRoleBadgeClasses = (role: UserRole): string => {
  const colors = getRoleColors(role);
  return `${colors.badge} ${colors.badgeText} px-2.5 py-0.5 rounded-full text-xs font-medium`;
};

/**
 * Get border classes for a role (for posts, messages, etc.)
 */
export const getRoleBorderClasses = (role: UserRole): string => {
  const colors = getRoleColors(role);
  return `border-l-4 ${colors.border}`;
};

/**
 * Get background accent classes for a role
 */
export const getRoleBgClasses = (role: UserRole, variant: 'light' | 'dark' = 'light'): string => {
  const colors = getRoleColors(role);
  return variant === 'light' ? colors.bgLight : colors.bgDark;
};

/**
 * Get ring classes for a role (for focus states, highlights)
 */
export const getRoleRingClasses = (role: UserRole): string => {
  const colors = getRoleColors(role);
  return colors.ring;
};

/**
 * Get text color classes for a role
 */
export const getRoleTextClasses = (role: UserRole): string => {
  const colors = getRoleColors(role);
  return colors.text;
};

/**
 * Get icon color classes for a role
 */
export const getRoleIconClasses = (role: UserRole): string => {
  const colors = getRoleColors(role);
  return colors.icon;
};

/**
 * Format role name for display
 */
export const formatRoleName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    customer: 'Customer',
    technician: 'Technician',
    admin: 'Admin',
    corporate: 'Corporate',
    support: 'Support',
  };
  return roleNames[role] || role;
};

/**
 * Get role icon (emoji or symbol)
 */
export const getRoleIcon = (role: UserRole): string => {
  const icons: Record<UserRole, string> = {
    customer: '👤',
    technician: '🔧',
    admin: '👑',
    corporate: '🏢',
    support: '💬',
  };
  return icons[role] || '👤';
};

/**
 * Combined function to get all role styling classes at once
 */
export const getRoleStyles = (role: UserRole) => {
  const colors = getRoleColors(role);
  return {
    badge: getRoleBadgeClasses(role),
    border: getRoleBorderClasses(role),
    bgLight: colors.bgLight,
    bgDark: colors.bgDark,
    ring: colors.ring,
    text: colors.text,
    icon: colors.icon,
    name: formatRoleName(role),
    emoji: getRoleIcon(role),
  };
};
