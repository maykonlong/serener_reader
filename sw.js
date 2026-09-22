const CACHE_NAME = 'serene-reader-v15';
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
      // Cachear cada asset individualmente para não falhar tudo se um falhar
      return Promise.allSettled(
        ASSETS.map((asset) => cache.add(asset).catch(() => {}))
      );
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
  // Ignorar requisições que não sejam GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Para navegação (HTML) e CDN: sempre tentar a rede primeiro (network-first),
  // para garantir que o usuário receba a versão mais recente do app.
  const isNavigation = event.request.mode === 'navigate';
  const isExternal = url.origin !== self.location.origin;

  if (isNavigation || isExternal) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Atualizar o cache em segundo plano
          if (isNavigation && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Para assets locais: cache-first
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
