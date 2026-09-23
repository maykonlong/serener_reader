const CACHE_NAME = 'serene-reader-v22';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/tailwind.css',
  './css/fonts.css',
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
  './manifest.json',
  './asset-manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      let assets = CORE_ASSETS;
      try {
        const response = await fetch('./asset-manifest.json', { cache: 'no-store' });
        const manifest = await response.json();
        if (Array.isArray(manifest.assets)) assets = [...new Set([...CORE_ASSETS, ...manifest.assets])];
      } catch (error) {
        console.warn('Manifesto offline indisponível; usando núcleo do app.', error);
      }
      await Promise.allSettled(assets.map((asset) => cache.add(asset)));
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

  const isNavigation = event.request.mode === 'navigate';
  const isExternal = url.origin !== self.location.origin;

  // APIs e catálogos são recursos opcionais online. Nunca responder HTML no lugar de JSON.
  if (isExternal) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Navegação: busca a versão publicada primeiro e usa o shell salvo sem conexão.
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', response.clone()));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Para assets locais: cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      });
    })
  );
});
