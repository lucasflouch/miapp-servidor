const CACHE_NAME = 'guia-comercial-cache-v4';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.js',
];

// Evento de instalación: se abre el caché y se agregan los archivos base.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto y listo para cachear archivos base.');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Evento de activación: se limpia el caché antiguo si existe una nueva versión.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento fetch: intercepta las peticiones de red.
// Estrategia: "Network First, then Cache". Intenta obtener el recurso de la red primero.
// Si falla (offline), lo busca en el caché.
self.addEventListener('fetch', event => {
  // Ignorar las peticiones a la API para que siempre vayan a la red.
  if (event.request.url.includes('/api/')) {
    return; // No hacer nada, dejar que el navegador la maneje.
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si la respuesta de la red es exitosa, la guardamos en caché y la devolvemos.
        return caches.open(CACHE_NAME).then(cache => {
          // Clonamos la respuesta porque es un stream y solo se puede consumir una vez.
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Si la red falla, intentamos servir desde el caché.
        console.log(`Petición de red fallida para ${event.request.url}. Buscando en caché.`);
        return caches.match(event.request);
      })
  );
});