const CACHE = 'alkimia-production-20260904d';
const CORE = ['/', '/index.html', '/styles.css', '/app.js', '/runtime.js', '/story.js', '/manifest.webmanifest', '/icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    try {
      const response = await fetch(e.request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(e.request, response.clone());
      }
      return response;
    } catch {
      return (await caches.match(e.request)) || Response.error();
    }
  })());
});
