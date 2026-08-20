/**
 * Shared Redis client singleton.
 *
 * Used by the AI circuit breaker, guest AI budget, and any other service that
 * needs a cross-instance store.  Falls back to `null` when REDIS_URL is not
 * configured so that dev/test environments work without Redis.
 *
 * Callers must handle a `null` client and implement their own in-memory
 * fallback for that case.
 */
import { createClient } from 'redis';

import { logError, logWarn } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || '';
let client = null;
let connectPromise = null;
let warnedOnce = false;

function warnNoRedisOnce() {
  if (warnedOnce) return;
  warnedOnce = true;
  logWarn('shared_redis_no_url', {
    message: 'REDIS_URL 未配置，跨实例共享功能（circuit breaker、guest budget）退回内存模式',
  });
}

/**
 * Returns the shared Redis client, connecting lazily on first call.
 * Returns `null` when REDIS_URL is not set (dev/test memory-fallback mode).
 */
export async function getSharedRedisClient() {
  if (!REDIS_URL) {
    warnNoRedisOnce();
    return null;
  }

  if (client?.isReady) return client;
  if (connectPromise) return connectPromise;

  client = createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
    },
  });

  client.on('error', (err) => {
    logError('shared_redis_error', { message: err.message });
  });

  connectPromise = client
    .connect()
    .then(() => client)
    .catch((err) => {
      logError('shared_redis_connect_failed', { message: err.message });
      client = null;
      return null;
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
}

/** Gracefully closes the shared client (called on process shutdown). */
export async function closeSharedRedisClient() {
  if (client?.isReady) {
    try {
      await client.quit();
    } catch { /* intentional */ }
  }
  client = null;
}
