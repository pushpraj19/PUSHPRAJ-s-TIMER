// ---- Service Worker: offline support ----
// Bump CACHE_NAME whenever you change any cached file, so old caches get cleared
// and users get the update instead of being stuck on a stale cached copy.
const CACHE_NAME = 'focus-app-v1';

// List every file the app needs to run with no network.
// Update this list if you rename/add pages or images.
const PRECACHE_URLS = [
    './',
    'index.html',
    'timer.html',
    'todo.html',
    'history.html',
    'assets/img/logo.png',
    'assets/img/bg-nature.jpg'
];

// ---- Install: cache the app shell ----
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

// ---- Activate: clean up old cache versions ----
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ---- Fetch: network-first, fall back to cache when offline ----
self.addEventListener('fetch', (event) => {
    // Only handle GET requests for our own origin (skip weather API calls etc,
    // those already fail gracefully in your existing try/catch blocks)
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Save a copy of the fresh response for offline use later
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => {
                // Offline (or request failed) — serve from cache
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    // Fallback: if it's a page navigation, serve index.html
                    if (event.request.mode === 'navigate') {
                        return caches.match('index.html');
                    }
                });
            })
    );
});
