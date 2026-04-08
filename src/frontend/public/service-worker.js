const CACHE_NAME = 'rose-dating-v1';
const RUNTIME_CACHE = 'rose-dating-runtime';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/generated/rose-dating-pwa-icon-transparent.dim_192x192.png',
  '/assets/generated/rose-dating-pwa-icon-large-transparent.dim_512x512.png',
  '/assets/generated/dating-app-logo-transparent.dim_200x200.png',
  '/assets/generated/avatar-placeholder.dim_200x200.png',
  '/assets/generated/rose-coin-icon-transparent.dim_64x64.png',
  '/assets/generated/rose-gift-icon-transparent.dim_32x32.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API calls and backend requests
  if (url.pathname.includes('/api/') || url.pathname.includes('?canisterId=')) {
    return;
  }

  // Network-first strategy for HTML
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Cache-first strategy for assets
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Placeholder for syncing messages when connection is restored
  console.log('Syncing messages...');
}

// Push notification support
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New notification from Rose Dating',
    icon: '/assets/generated/rose-dating-pwa-icon-transparent.dim_192x192.png',
    badge: '/assets/generated/rose-dating-pwa-icon-transparent.dim_192x192.png',
    vibrate: [200, 100, 200],
    tag: 'rose-dating-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Rose Dating', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
