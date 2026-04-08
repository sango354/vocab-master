const CACHE_NAME = "vocab-cache-v15";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./bank-config.js",
  "./mean-zh.js",
  "./db.js",
  "./app.js",
  "./rich-banks-release/toeic.json",
  "./rich-banks-release/school7000.json",
  "./rich-banks-release/dailyLife.json",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap"
];

function isCacheableRequest(request) {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    return true;
  }

  return url.origin === "https://fonts.googleapis.com";
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (!isCacheableRequest(request)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }

          throw new Error(`No cached response for ${request.url}`);
        })
      )
  );
});
