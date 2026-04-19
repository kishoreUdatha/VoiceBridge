/**
 * VoiceBridge Service Worker
 * Provides offline support and caching for PWA
 */

const CACHE_NAME = 'myleadx-v2';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );

  // Force waiting service worker to become active
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');

  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Vite dev server requests (HMR, client, etc.)
  if (
    url.pathname.includes('@vite') ||
    url.pathname.includes('@react-refresh') ||
    url.pathname.includes('node_modules') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.includes('__vite')
  ) {
    return;
  }

  // Skip API requests (let them fail for offline detection)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // For navigation requests, try network first, fallback to cache/offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // For other requests, try cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response and update cache in background
        event.waitUntil(
          fetch(request).then((response) => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {})
        );
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((response) => {
          // Cache successful responses for static assets
          if (response.status === 200 && isStaticAsset(url)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Return offline fallback for HTML requests
          if (request.headers.get('accept')?.includes('text/html')) {
            const offlinePage = await caches.match(OFFLINE_URL);
            return offlinePage || new Response('Offline', { status: 503, statusText: 'Offline' });
          }
          // Return a proper error response for other requests
          return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});

// Helper to check if URL is a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');

  let data = { title: 'VoiceBridge', body: 'New notification', icon: '/icons/icon-192x192.png' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: data.actions || [],
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window if none exist
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event:', event.tag);

  if (event.tag === 'sync-leads') {
    event.waitUntil(syncLeads());
  } else if (event.tag === 'sync-calls') {
    event.waitUntil(syncCalls());
  }
});

// Sync leads queued while offline
async function syncLeads() {
  try {
    const cache = await caches.open('voicebridge-offline-queue');
    const requests = await cache.keys();

    for (const request of requests) {
      if (request.url.includes('/api/leads')) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          const data = await cachedResponse.json();
          await fetch(request.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          await cache.delete(request);
        }
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync leads failed:', error);
  }
}

// Sync calls queued while offline
async function syncCalls() {
  try {
    const cache = await caches.open('voicebridge-offline-queue');
    const requests = await cache.keys();

    for (const request of requests) {
      if (request.url.includes('/api/call-logs')) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          const data = await cachedResponse.json();
          await fetch(request.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          await cache.delete(request);
        }
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync calls failed:', error);
  }
}
