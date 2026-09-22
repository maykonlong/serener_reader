const CACHE_NAME = 'serene-reader-v14';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './icons/icon.svg',
  './js/storage.js',
  './js/pagination.js',
  './js/epub_parser.js',
  './js/pdf_reader.js',
  './js/format_parsers.js',
  './js/url_reader.js',
  './js/reading_modes.js',
  './js/annotations.js',
  './js/sync_engine.js',
  './js/tts_engine.js',
  './js/ambient.js',
  './js/stats.js',
  './js/catalog.js',
  './js/i18n.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
