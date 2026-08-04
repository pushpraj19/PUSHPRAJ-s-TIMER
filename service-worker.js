const CACHE_NAME = "focus16-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/timer.html",
  "/time_history.html",
  "/todo.html",
  "/study_menu.html",
  "/logo.png",
  "/manifest.webmanifest",
  "/pwa-register.js",
  "/supabase-config.js",
  "/supabase-db.js"
  // ❌ Removed vernier_calliper.html (fix later if needed)
];

// INSTALL
self.addEventListener("install", (event) => {
  console.log("🚀 Service Worker Installing...");

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of urlsToCache) {
        try {
          const response = await fetch(url, { redirect: "follow" });

          if (!response.ok) throw new Error("Bad response");

          await cache.put(url, response.clone());
          console.log("✅ Cached:", url);

        } catch (err) {
          console.warn("❌ Skipped caching:", url);
        }
      }
    })
  );

  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  console.log("⚡ Service Worker Activated");

  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            console.log("🗑️ Deleting old cache:", name);
            return caches.delete(name);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Only cache valid responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // 🔥 Offline fallback
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
    })
  );
});
