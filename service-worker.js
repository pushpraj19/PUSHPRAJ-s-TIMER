const CACHE_NAME = 'focus16-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/timer.html',
  '/time_history.html',
  '/todo.html',
  '/study_menu.html',
  '/logo.png',
  '/manifest.webmanifest',
  '/pwa-register.js',
  '/supabase-config.js',
  '/supabase-db.js'
  // ❌ removed vernier_calliper.html (fix later)
];

// INSTALL (safe caching)
self.addEventListener('install', event => {
  console.log('🚀 Installing SW...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of APP_SHELL) {
        try {
          const res = await fetch(url, { redirect: 'follow' });

          if (!res.ok) throw new Error('Bad response');

          await cache.put(url, res.clone());
          console.log('✅ Cached:', url);

        } catch (err) {
          console.warn('❌ Skipped:', url);
        }
      }
    })
  );

  self.skipWaiting();
});

// ACTIVATE
self.addEventListener('activate', event => {
  console.log('⚡ Activating SW...');

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Deleting:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(res => {
          if (!res || res.status !== 200 || res.type !== 'basic') {
            return res;
          }

          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });

          return res;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
