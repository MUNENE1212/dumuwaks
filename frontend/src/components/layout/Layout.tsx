import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNavigation from './BottomNavigation';
import WhatsAppButton from '../common/WhatsAppButton';

// Pages that own their full-bleed layout (sections run edge to edge).
const FULL_BLEED = new Set(['/', '/whatsapp-support']);

const Layout: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();

  const isFullBleed = FULL_BLEED.has(location.pathname) && !(location.pathname === '/' && isAuthenticated);

  return (
    <div className="min-h-screen bg-surface-100 flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] btn btn-primary"
      >
        Skip to content
      </a>
      <Navbar />
      <main
        id="main"
        className={`flex-1 ${
          isFullBleed ? '' : 'mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:py-10'
        } ${isAuthenticated ? 'pb-24 md:pb-10' : ''}`}
      >
        <Outlet />
      </main>
      <div className={isAuthenticated ? "pb-16 md:pb-0" : ""}>
        <Footer />
      </div>
      {isAuthenticated && <BottomNavigation />}
      {!isAuthenticated && <WhatsAppButton />}
    </div>
  );
};

export default Layout;
