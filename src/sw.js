/// <reference lib="webworker" />

/**
 * Service Worker for TypeScript Snippets
 * @type {ServiceWorkerGlobalScope & typeof globalThis}
 */
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

// Service Worker Version
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `ts-snippets-${CACHE_VERSION}`;

// Cache strategies
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
};

// Define strategies for different resource types
const RESOURCE_STRATEGIES = {
    // HTML - Network first for fresh content
    html: CACHE_STRATEGIES.NETWORK_FIRST,

    // CSS/JS - Stale while revalidate for balance
    styles: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    scripts: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,

    // Images - Cache first for performance
    images: CACHE_STRATEGIES.CACHE_FIRST,
};

// ==========================================================================
// Installation
// ==========================================================================

self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    // Skip waiting to activate immediately
    event.waitUntil(
        self.skipWaiting().then(() => {
            console.log('[SW] Installation complete');
        })
    );
});

// ==========================================================================
// Activation
// ==========================================================================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return sw.clients.claim();
            })
    );
});

// ==========================================================================
// Fetch - Request Interception
// ==========================================================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Determine strategy based on resource type
    const strategy = getStrategyForRequest(request);

    event.respondWith(
        handleRequest(request, strategy)
    );
});

// ==========================================================================
// Cache Strategies
// ==========================================================================

async function handleRequest(request, strategy) {
    switch (strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
            return cacheFirst(request);

        case CACHE_STRATEGIES.NETWORK_FIRST:
            return networkFirst(request);

        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
            return staleWhileRevalidate(request);

        default:
            return fetch(request);
    }
}

// Cache First - Best for static assets
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache first failed:', error);
        return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
        });
    }
}

// Network First - Best for dynamic content
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', error);

        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html' },
        });
    }
}

// Stale While Revalidate - Best balance for most resources
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // Fetch in background to update cache
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch((error) => {
            console.log('[SW] Background fetch failed:', error);
        });

    // Return cached version immediately, or wait for network if no cache
    return cachedResponse || fetchPromise;
}

// ==========================================================================
// Helper Functions
// ==========================================================================

function getStrategyForRequest(request) {
    const url = new URL(request.url);
    const extension = url.pathname.split('.').pop();

    // HTML files
    if (request.headers.get('accept')?.includes('text/html') || extension === 'html') {
        return RESOURCE_STRATEGIES.html;
    }

    // CSS files
    if (extension === 'css') {
        return RESOURCE_STRATEGIES.styles;
    }

    // JavaScript files
    if (extension === 'js') {
        return RESOURCE_STRATEGIES.scripts;
    }

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        return RESOURCE_STRATEGIES.images;
    }

    // Default to network first
    return CACHE_STRATEGIES.NETWORK_FIRST;
}

// ==========================================================================
// Messages - Communication with main thread
// ==========================================================================

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_URLS') {
        const urlsToCache = event.data.urls;

        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => {
                event.ports[0].postMessage({ success: true });
            })
            .catch((error) => {
                console.error('[SW] Cache URLs failed:', error);
                event.ports[0].postMessage({ success: false, error: error.message });
            });
    }
});

// ==========================================================================
// Background Sync (Optional - for future enhancement)
// ==========================================================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-snippets') {
        event.waitUntil(
            // Could sync user's saved snippets or preferences
            syncData()
        );
    }
});

async function syncData() {
    console.log('[SW] Background sync triggered');
    // Implement sync logic here if needed
}

// ==========================================================================
// Push Notifications (Optional - for future enhancement)
// ==========================================================================

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};

    const options = {
        body: data.body || 'New TypeScript snippet available!',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
        },
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'TS Snippets', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        sw.clients.openWindow(event.notification.data.url)
    );
});