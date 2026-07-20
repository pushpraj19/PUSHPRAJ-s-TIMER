const CACHE_NAME = 'focus-timer-offline-v1';
const APP_SHELL = [
  '',
  'index.html',
  'timer.html',
  'time_history.html',
  'todo.html',
  'logo.png',
  'manifest.webmanifest',
  'pwa-register.js'
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
      return await fetch(event.request);
    } catch (error) {
      if (event.request.mode === 'navigate') return caches.match(FALLBACK_PAGE);
      throw error;
    }
  })());
});
