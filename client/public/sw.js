// Legacy service worker removal.
// The app no longer uses a service worker because stale cached SPA shells can
// point to removed Vite chunks and leave lazy-loaded pages blank after deploys.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("nest-"))
        .map((key) => caches.delete(key))
    );
    await self.registration.unregister();
    await self.clients.claim();
  })());
});
