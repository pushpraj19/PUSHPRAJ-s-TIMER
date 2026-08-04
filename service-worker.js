const CACHE_NAME = 'focus-v3';

const APP_SHELL = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/timer.html',
  '/time_history.html',
  '/todo.html',
  '/logo.png',
  '/study_menu.html',
  '/vernier_calliper.html',
  '/manifest.webmanifest',
  '/pwa-register.js',
  '/supabase-config.js',
  '/supabase-db.js'
];

const FALLBACK_PAGE = '/index.html';


// 🔹 INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
          console.log('✅ Cached:', url);
        } catch (err) {
          console.error('❌ Failed to cache:', url);
        }
      }
    })
  );
  self.skipWaiting();
});


// 🔹 ACTIVATE (clean old caches)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});


// 🔹 FETCH (offline support)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(FALLBACK_PAGE);
        }
      });
    })
  );
});
