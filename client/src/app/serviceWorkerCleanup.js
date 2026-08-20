const LEGACY_CACHE_PREFIX = "nest-";

async function deleteLegacyCaches() {
  if (!("caches" in window)) return;

  const keys = await window.caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith(LEGACY_CACHE_PREFIX))
      .map((key) => window.caches.delete(key))
  );
}

async function unregisterServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

export function cleanupLegacyServiceWorker() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;

  const runCleanup = () => {
    Promise.all([
      unregisterServiceWorkers(),
      deleteLegacyCaches(),
    ]).catch((error) => {
      console.warn("Legacy service worker cleanup failed:", error);
    });
  };

  if (document.readyState === "complete") {
    runCleanup();
    return;
  }

  window.addEventListener("load", runCleanup, { once: true });
}
