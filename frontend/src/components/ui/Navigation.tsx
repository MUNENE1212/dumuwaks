import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, Search, Calendar, MessageSquare, User } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

const defaultNavItems: NavItem[] = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Search', path: '/search', icon: Search },
  { label: 'Bookings', path: '/bookings', icon: Calendar },
  { label: 'Messages', path: '/messages', icon: MessageSquare },
  { label: 'Profile', path: '/profile', icon: User },
];

/**
 * Bottom navigation component for mobile (PWA critical)
 *
 * @example
 * ```tsx
 * <BottomNavigation items={navItems} />
 * ```
 */
export const BottomNavigation: React.FC<{ items?: NavItem[] }> = ({
  items = defaultNavItems,
}) => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-fixed bg-surface-100 border-t border-line lg:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 safe-bottom">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 min-w-0 transition-all duration-200',
                'active:scale-95',
                isActive
                  ? 'text-primary-400'
                  : 'text-ink-muted hover:text-ink-muted'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="w-6 h-6 mb-1" />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-error-500 text-ink text-[10px] font-bold rounded-full">
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium truncate max-w-[100%]">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

BottomNavigation.displayName = 'BottomNavigation';

/**
 * Top navigation component for desktop
 *
 * @example
 * ```tsx
 * <TopNavigation
 *   logo={<Logo />}
 *   items={navItems}
 *   userMenu={<UserMenu />}
 * />
 * ```
 */
export const TopNavigation: React.FC<{
  logo?: React.ReactNode;
  items?: NavItem[];
  userMenu?: React.ReactNode;
}> = ({ logo, items, userMenu }) => {
  const location = useLocation();

  return (
    <nav
      className="sticky top-0 z-sticky bg-surface-100/80 border-b border-line hidden lg:block"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">{logo}</div>

          {/* Navigation Links */}
          {items && (
            <div className="flex items-center space-x-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200',
                      'min-h-[48px]',
                      isActive
                        ? 'text-primary-500 bg-primary-950/20'
                        : 'text-ink-muted hover:text-ink hover:bg-surface-200'
                    )}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {item.label}
                    {item.badge && (
                      <span className="ml-2 min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-error-500 text-ink text-xs font-bold rounded-full">
                        {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}

          {/* User Menu */}
          <div className="flex-shrink-0">{userMenu}</div>
        </div>
      </div>
    </nav>
  );
};

TopNavigation.displayName = 'TopNavigation';
