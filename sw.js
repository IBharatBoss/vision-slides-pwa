/**
 * Vision Slides — High-Performance Offline Service Worker
 * Ensures 100% offline functionality, instant cache-first asset loading,
 * and zero-lag presentation playback on all devices.
 */

const STATIC_CACHE = 'vision-slides-v1.1';
const DYNAMIC_CACHE = 'vision-slides-dynamic-v1.1';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './src/main.js',
    './src/core/canvasEngine.js',
    './src/core/db.js',
    './src/core/state.js',
    './src/components/topBar.js',
    './src/components/ribbonToolbar.js',
    './src/components/slideReel.js',
    './src/components/presenterMode.js',
    './src/components/propertyInspector.js',
    './src/components/floatingToolbar.js',
    './src/services/exporter.js',
    './src/templates/slideTemplates.js'
];

// Install: Cache all critical core files immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[ServiceWorker] Pre-cache partial fail (some dynamic files might be loaded on demand):', err);
            });
        })
    );
});

// Activate: Prune stale caches & claim clients instantly
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Smart Strategy
// 1. Navigation (HTML): Network first with instant cache fallback
// 2. Static Assets & External CDNs (Fabric, Fonts, Icons): Cache First with background refresh
self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // HTML Navigation requests
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match('./index.html') || caches.match(request);
                })
        );
        return;
    }

    // Static Assets & External CDNs (CDN Scripts, Google Fonts, Material Icons, Images)
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version immediately for lightning speed (0ms latency!)
                // Background update for non-CDN local files
                if (url.origin === self.location.origin) {
                    fetch(request).then((freshResponse) => {
                        if (freshResponse && freshResponse.status === 200) {
                            caches.open(STATIC_CACHE).then((cache) => cache.put(request, freshResponse));
                        }
                    }).catch(() => {});
                }
                return cachedResponse;
            }

            // If not in cache, fetch from network and store in dynamic cache
            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }

                // Cache external CDNs and fonts
                const isCDN = url.hostname.includes('cdnjs.cloudflare.com') ||
                              url.hostname.includes('fonts.googleapis.com') ||
                              url.hostname.includes('fonts.gstatic.com');

                if (isCDN || url.origin === self.location.origin) {
                    const responseClone = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }

                return networkResponse;
            }).catch(() => {
                // Offline fallback for images or fonts
                if (request.headers.get('accept')?.includes('image/')) {
                    return caches.match('./icons/icon-192.png');
                }
            });
        })
    );
});
