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


self.addEventListener('install', (event) => {
    
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all: app shell and content');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});


self.addEventListener('activate', (event) => {
   
    event.waitUntil(clients.claim());

    
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


self.addEventListener('fetch', (event) => {
    
    if (event.request.method !== 'GET') return;

   
    const url = new URL(event.request.url);
    if (url.origin.includes('firestore.googleapis.com') ||
        url.origin.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          
            if (cachedResponse) {
                return cachedResponse;
            }

            
            return fetch(event.request).then((networkResponse) => {
               
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                return networkResponse;
            }).catch(() => {
                console.log('[Service Worker] Fetch failed; returning offline page instead.', event.request.url);
            });
        })
    );
});