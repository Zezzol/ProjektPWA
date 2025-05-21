const CACHE_NAME = 'projekt-pwa-cache-v1';
const urlsToCache = [
  '/index.html',
  '/dashboard.html',
  '/register.html',
  '/css/bootstrap.min.css',
  '/chartscript.js',
  '/script.js',
  '/db.js',
  '/chart.js',
  '/js/bootstrap.bundle.min.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

//dodaje pliki do cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

//usuwa stare cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
});

//strategia najpierw sieć, potem cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return; // Skip caching for non-GET requests
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

