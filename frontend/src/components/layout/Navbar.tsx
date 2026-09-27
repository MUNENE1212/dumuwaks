import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Bell, LogOut, Menu, Settings, X } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { fetchUnreadCount } from '@/store/slices/notificationSlice';
import { useBookingNotifications } from '@/hooks/useBookingNotifications';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { BrandLockup } from '../brand/BrandMark';

interface NavItem {
  to: string;
  label: string;
}

const GUEST_LINKS: NavItem[] = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/register?role=technician', label: 'For technicians' },
  { to: '/whatsapp-support', label: 'WhatsApp' },
  { to: '/faq', label: 'Help' },
];

function memberLinks(role?: string): NavItem[] {
  const links: NavItem[] = [{ to: '/dashboard', label: 'Dashboard' }];
  if (role === 'customer' || role === 'corporate') {
    links.push({ to: '/booking-flow', label: 'Book' });
    links.push({ to: '/find-technicians', label: 'Technicians' });
  }
  links.push({ to: '/bookings', label: 'Bookings' }, { to: '/messages', label: 'Messages' });
  if (role === 'admin') links.push({ to: '/admin', label: 'Admin' });
  if (role === 'support') links.push({ to: '/support-dashboard', label: 'Support desk' });
  if (role === 'admin' || role === 'support') links.push({ to: '/whatsapp-desk', label: 'WhatsApp' });
  return links;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'relative inline-flex h-16 items-center text-body-sm font-medium transition-colors',
    isActive
      ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-lumen'
      : 'text-ink-muted hover:text-ink'
  );

const Navbar: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { unreadCount } = useAppSelector((state) => state.notifications);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { unreadCount: bookingUnreadCount } = useBookingNotifications({ showToasts: true, playSound: false });
  const totalUnread = unreadCount + bookingUnreadCount;

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchUnreadCount());
    const interval = setInterval(() => dispatch(fetchUnreadCount()), 120_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, dispatch]);

  // Close the phone menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const links = isAuthenticated ? memberLinks(user?.role) : GUEST_LINKS;
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'DW';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface-100">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link to="/" aria-label="Dumuwaks home" className="shrink-0">
          <BrandLockup size={34} />
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center gap-7 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass} end={l.to === '/dashboard'}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen((o) => !o)}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-200 hover:text-ink"
                  aria-label={totalUnread > 0 ? `Notifications, ${totalUnread} unread` : 'Notifications'}
                >
                  <Bell className="h-5 w-5" />
                  {totalUnread > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lumen px-1 font-mono text-[10px] font-semibold text-on-lumen">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </button>
                <NotificationDropdown isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
              </div>
              <Link
                to="/settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-200 hover:text-ink"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <Link
                to={`/profile/${user?._id ?? ''}`}
                className="ml-1 flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 hover:bg-surface-200"
              >
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="" className="h-8 w-8 rounded-md object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-300 font-mono text-xs text-ink">
                    {initials}
                  </span>
                )}
                <span className="hidden text-left lg:block">
                  <span className="block text-body-sm font-medium leading-4 text-ink">{user?.firstName}</span>
                  <span className="eyebrow block leading-4">{user?.role}</span>
                </span>
              </Link>
              <button
                onClick={() => dispatch(logout())}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-200 hover:text-ink"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Book a technician
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-surface-200 md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-surface-100 md:hidden">
          <nav aria-label="Primary" className="mx-auto max-w-[1200px] px-4 py-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  clsx(
                    'flex h-12 items-center border-b border-line text-body font-medium',
                    isActive ? 'text-lumen-ink' : 'text-ink'
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <>
                <Link to="/settings" className="flex h-12 items-center border-b border-line text-body text-ink">
                  Settings
                </Link>
                <button
                  onClick={() => dispatch(logout())}
                  className="flex h-12 w-full items-center text-body text-fault-ink"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3 py-4">
                <Link to="/login" className="btn btn-outline">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Book
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
