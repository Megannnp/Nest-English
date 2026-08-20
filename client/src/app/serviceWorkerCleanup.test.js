import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupLegacyServiceWorker } from "./serviceWorkerCleanup.js";

async function flushCleanup() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("cleanupLegacyServiceWorker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.caches;
    delete navigator.serviceWorker;
  });

  it("unregisters service workers and deletes only legacy nest caches", async () => {
    const unregisterOne = vi.fn().mockResolvedValue(true);
    const unregisterTwo = vi.fn().mockResolvedValue(true);
    const deleteCache = vi.fn().mockResolvedValue(true);

    Object.defineProperty(document, "readyState", {
      value: "complete",
      configurable: true,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistrations: vi.fn().mockResolvedValue([
          { unregister: unregisterOne },
          { unregister: unregisterTwo },
        ]),
      },
      configurable: true,
    });
    Object.defineProperty(window, "caches", {
      value: {
        keys: vi.fn().mockResolvedValue(["nest-old", "other-cache", "nest-assets"]),
        delete: deleteCache,
      },
      configurable: true,
    });

    cleanupLegacyServiceWorker();
    await flushCleanup();

    expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalledTimes(1);
    expect(unregisterOne).toHaveBeenCalledTimes(1);
    expect(unregisterTwo).toHaveBeenCalledTimes(1);
    expect(window.caches.keys).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith("nest-old");
    expect(deleteCache).toHaveBeenCalledWith("nest-assets");
    expect(deleteCache).not.toHaveBeenCalledWith("other-cache");
  });

  it("skips unsupported browser capabilities without throwing", async () => {
    Object.defineProperty(document, "readyState", {
      value: "complete",
      configurable: true,
    });

    expect(() => cleanupLegacyServiceWorker()).not.toThrow();
    await flushCleanup();
  });
});
