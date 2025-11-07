const CACHE_NAME = 'guia-comercial-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  // Es importante cachear los scripts principales. 
  // La URL exacta puede variar dependiendo del bundler, pero './index.js' es común.
  '/index.js', 
  // Agregamos íconos para la pantalla de inicio
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Evento de instalación: se abre el caché y se agregan los archivos base.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
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
// Estrategia: "Network falling back to cache". Intenta obtener el recurso de la red primero.
// Si falla (offline), lo busca en el caché.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      console.log(`Petición de red fallida para ${event.request.url}. Buscando en caché.`);
      return caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          // Si no está en caché y no hay red, la petición fallará.
          // Aquí podríamos devolver una página "offline" genérica si quisiéramos.
        });
    })
  );
});