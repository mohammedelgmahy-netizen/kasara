// Network-only service worker: always fetch fresh from the server, never serve from cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(fetch(sameOrigin ? new Request(e.request, { cache: "no-store" }) : e.request).catch(() => fetch(e.request)));
});
