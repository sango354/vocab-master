const CACHE_NAME = 'vocab-cache-v8';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './bank-config.js',
  './db.js',
  './app.js',
  './rich-banks-release/toeic.json',
  './rich-banks-release/school7000.json',
  './rich-banks-release/dailyLife.json',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
