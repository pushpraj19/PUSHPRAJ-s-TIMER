const CACHE_NAME = 'focus-timer-account-profile-v1';
const APP_SHELL = [
  '',
  'index.html',
  'timer.html',
  'time_history.html',
  'todo.html',
  'profile.html',
  'logo.png',
  'manifest.webmanifest',
  'pwa-register.js',
  'supabase-config.js',
  'account-sync.js',
  'profile.js'
].map(path => new URL(path, self.registration.scope).href);
const FALLBACK_PAGE = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);
      if (new URL(event.request.url).origin === 'https://cdn.jsdelivr.net') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      if (event.request.mode === 'navigate') return caches.match(FALLBACK_PAGE);
      throw error;
    }
  })());
});
