import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Wrench, Calendar, MessageCircle, User } from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  path: string;
  icon: typeof Home;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/booking-flow', icon: Wrench, label: 'Book' },
  { path: '/bookings', icon: Calendar, label: 'Bookings' },
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/settings', icon: User, label: 'Account' },
];

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="border-t border-line bg-surface-100 safe-area-inset-bottom">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  'relative flex flex-1 flex-col items-center justify-center h-full min-w-[48px] min-h-[48px] transition-colors duration-200',
                  isActive ? 'text-lumen-ink' : 'text-ink-muted'
                )}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavActive"
                    className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-lumen"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}

                <Icon
                  className={clsx(
                    'relative z-10 h-5 w-5 transition-colors duration-200',
                    isActive ? 'text-lumen-ink' : 'text-ink-muted'
                  )}
                />
                <span
                  className={clsx(
                    'relative z-10 mt-0.5 text-[10px] font-medium transition-colors duration-200',
                    isActive ? 'text-lumen-ink' : 'text-ink-muted'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};

export default BottomNavigation;
