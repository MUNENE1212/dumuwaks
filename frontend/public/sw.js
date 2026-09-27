/**
 * Dumu Waks PWA Service Worker
 * Rich Dark Design System - Progressive Web App
 *
 * Features:
 * - Precaching of static assets
 * - API caching strategies (NetworkFirst, StaleWhileRevalidate)
 * - Image caching with long expiration
 * - Font caching for Google Fonts
 */

// Workbox will be loaded from CDN or injected during build
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute, NavigationRoute } = workbox.routing;
const { NetworkFirst, StaleWhileRevalidate, CacheFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

// Skip waiting and claim clients immediately
self.skipWaiting();
workbox.core.clientsClaim();

// Configuration - API base URL (adjust for production/staging)
// Same origin as the app (https://dumuwaks.co.ke/api/v1); nginx proxies /api to the backend.
const API_BASE_URL = `${self.location.origin}/api/v1`;

// Cache names with versioning
const CACHE_VERSION = 'v1';
const CACHES = {
  bookings: `bookings-api-${CACHE_VERSION}`,
  technicians: `technicians-api-${CACHE_VERSION}`,
  posts: `posts-api-${CACHE_VERSION}`,
  messages: `messages-api-${CACHE_VERSION}`,
  api: `api-cache-${CACHE_VERSION}`,
  images: `images-cache-${CACHE_VERSION}`,
  googleFonts: `google-fonts-cache-${CACHE_VERSION}`,
  gstaticFonts: `gstatic-fonts-cache-${CACHE_VERSION}`,
};

// Precache static assets (will be populated by build process)
precacheAndRoute([
  { url: '/index.html', revision: null },
  { url: '/favicon.ico', revision: null },
]);

// Clean up old caches
cleanupOutdatedCaches();

// Navigation Route - Serve index.html for navigation requests
registerRoute(
  new NavigationRoute(
    workbox.precaching.createHandlerBoundToURL('/index.html'),
    {
      // Allow all navigation requests
      allowlist: [/^\/$/],
    }
  )
);

// ============================================
// API CACHING STRATEGIES
// ============================================

// Bookings API - NetworkFirst (critical data, needs to be fresh)
registerRoute(
  new RegExp(`^${API_BASE_URL}/bookings.*`, 'i'),
  new NetworkFirst({
    cacheName: CACHES.bookings,
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  'GET'
);

// Technicians API - StaleWhileRevalidate (semi-static, can show cached)
registerRoute(
  new RegExp(`^${API_BASE_URL}/technicians.*`, 'i'),
  new StaleWhileRevalidate({
    cacheName: CACHES.technicians,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 2 * 60 * 60, // 2 hours
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  'GET'
);

// Posts API - StaleWhileRevalidate (content that updates frequently)
registerRoute(
  new RegExp(`^${API_BASE_URL}/posts.*`, 'i'),
  new StaleWhileRevalidate({
    cacheName: CACHES.posts,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 60, // 30 minutes
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  'GET'
);

// Messages API - NetworkFirst (real-time messaging needs fresh data)
registerRoute(
  new RegExp(`^${API_BASE_URL}/messages.*`, 'i'),
  new NetworkFirst({
    cacheName: CACHES.messages,
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  'GET'
);

// Generic API Cache - NetworkFirst fallback for other API calls
registerRoute(
  new RegExp(`^${API_BASE_URL}.*`, 'i'),
  new NetworkFirst({
    cacheName: CACHES.api,
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  'GET'
);

// ============================================
// STATIC ASSET CACHING
// ============================================

// Images - CacheFirst (static assets, long-lived)
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
  new CacheFirst({
    cacheName: CACHES.images,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  'GET'
);

// Google Fonts Stylesheets - CacheFirst
registerRoute(
  /^https:\/\/fonts\.googleapis\.com/i,
  new CacheFirst({
    cacheName: CACHES.googleFonts,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  'GET'
);

// Google Fonts Files - CacheFirst
registerRoute(
  /^https:\/\/fonts\.gstatic\.com/i,
  new CacheFirst({
    cacheName: CACHES.gstaticFonts,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  'GET'
);

// ============================================
// SERVICE WORKER LIFECYCLE EVENTS
// ============================================

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline functionality (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    console.log('[Service Worker] Syncing bookings...');
    // Future: Implement background sync for offline bookings
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicons/android-chrome-192x192.png',
      badge: '/favicons/favicon-96x96.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Dumu Waks', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      const url = event.notification.data.url;
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
