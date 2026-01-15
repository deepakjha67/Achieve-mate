const CACHE_NAME = 'achieve-mate-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/style.css',
    '/app.js',
    '/icon-192.png',
    '/icon-512.png'
];

// 1. INSTALL: Cache Core Files
self.addEventListener('install', (event) => {
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all: app shell and content');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. ACTIVATE: Claim Clients (Self Activation)
self.addEventListener('activate', (event) => {
    // Become available to all pages immediately
    event.waitUntil(clients.claim());

    // Clean up old caches if necessary
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

// 3. FETCH: Offline Support
self.addEventListener('fetch', (event) => {
    // We only want to handle GET requests
    if (event.request.method !== 'GET') return;

    // Skip caching for Firebase/Google APIs to let the JS SDK handle its own persistence
    const url = new URL(event.request.url);
    if (url.origin.includes('firestore.googleapis.com') ||
        url.origin.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached response if found
            if (cachedResponse) {
                return cachedResponse;
            }

            // Otherwise, fetch from network
            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // Optional: Clone the response and push to cache for dynamic caching
                // Only if it's not an API call
                return networkResponse;
            }).catch(() => {
                console.log('[Service Worker] Fetch failed; returning offline page instead.', event.request.url);
            });
        })
    );
});