/**
 * AI circuit breaker — Redis-backed for multi-instance deployments.
 *
 * Redis keys (per scope):
 *   ai:cb:{scope}:fc   — failure counter  (expires after cooldownMs)
 *   ai:cb:{scope}:open — circuit-open flag (expires after cooldownMs)
 *
 * When REDIS_URL is not set the module falls back to the original in-process
 * Map so that dev/test environments work without Redis.
 */
import { getSharedRedisClient } from '../redisClient.js';
import { classifyAIError } from './errors.js';

const DEFAULT_AI_CIRCUIT_SCOPE = 'general';
const AI_CIRCUIT_BREAKER_DEFAULTS = {
  cooldownMs: 30000,
  threshold: 3,
};

// ── In-memory fallback store ─────────────────────────────────────────────────

const AI_CIRCUIT_BREAKERS = new Map();

function getMemoryBreaker(scope) {
  const key = String(scope || DEFAULT_AI_CIRCUIT_SCOPE);
  if (!AI_CIRCUIT_BREAKERS.has(key)) {
    AI_CIRCUIT_BREAKERS.set(key, {
      failureCount: 0,
      openedAt: 0,
      ...AI_CIRCUIT_BREAKER_DEFAULTS,
    });
  }
  return AI_CIRCUIT_BREAKERS.get(key);
}

function isMemoryBreakerOpen(scope) {
  const breaker = getMemoryBreaker(scope);
  if (!breaker.openedAt) return false;
  if (Date.now() - breaker.openedAt >= breaker.cooldownMs) {
    breaker.failureCount = 0;
    breaker.openedAt = 0;
    return false;
  }
  return true;
}

// ── Redis helpers ────────────────────────────────────────────────────────────

function redisKey(scope, suffix) {
  return `ai:cb:${String(scope || DEFAULT_AI_CIRCUIT_SCOPE)}:${suffix}`;
}

const cooldownSecs = Math.ceil(AI_CIRCUIT_BREAKER_DEFAULTS.cooldownMs / 1000);

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns an in-memory snapshot of circuit-breaker state.
 * The Map is kept in sync by recordAISuccess / recordAIFailure (both paths
 * update it regardless of whether Redis is in use), so this is always fresh
 * and synchronous — safe to call from observabilityService without awaiting.
 */
export function getAICircuitMetrics() {
  const entries = {};
  for (const [scope, breaker] of AI_CIRCUIT_BREAKERS.entries()) {
    entries[scope] = {
      failureCount: breaker.failureCount,
      openedAt: breaker.openedAt || null,
      cooldownMs: AI_CIRCUIT_BREAKER_DEFAULTS.cooldownMs,
      threshold: AI_CIRCUIT_BREAKER_DEFAULTS.threshold,
      open: isMemoryBreakerOpen(scope),
    };
  }
  return entries;
}

export async function recordAISuccess(scope = DEFAULT_AI_CIRCUIT_SCOPE) {
  const memBreaker = getMemoryBreaker(scope);
  memBreaker.failureCount = 0;
  memBreaker.openedAt = 0;

  const redis = await getSharedRedisClient();
  if (!redis) return;

  await redis.del([redisKey(scope, 'fc'), redisKey(scope, 'open')]);
}

export async function recordAIFailure(error, scope = DEFAULT_AI_CIRCUIT_SCOPE) {
  const { code } = classifyAIError(error);
  const shouldTrip =
    code === 'AI_RATE_LIMIT' ||
    code === 'AI_TIMEOUT' ||
    code === 'AI_UPSTREAM_ERROR' ||
    code === 'AI_NETWORK_ERROR' ||
    code === 'AI_EMPTY_RESPONSE';

  if (!shouldTrip) return;

  const redis = await getSharedRedisClient();

  if (!redis) {
    // In-memory fallback
    const breaker = getMemoryBreaker(scope);
    breaker.failureCount += 1;
    if (breaker.failureCount >= breaker.threshold) {
      breaker.openedAt = Date.now();
    }
    return;
  }

  // Redis path — use INCR + conditional SETNX so multiple instances agree
  const fcKey = redisKey(scope, 'fc');
  const openKey = redisKey(scope, 'open');

  const newCount = await redis.incr(fcKey);
  await redis.expire(fcKey, cooldownSecs);

  // Update memory for local metrics (best-effort, no lock needed here)
  const memBreaker = getMemoryBreaker(scope);
  memBreaker.failureCount = newCount;

  if (newCount >= AI_CIRCUIT_BREAKER_DEFAULTS.threshold) {
    // NX: don't reset TTL if another instance already opened the circuit
    await redis.set(openKey, '1', { EX: cooldownSecs, NX: true });
    if (!memBreaker.openedAt) memBreaker.openedAt = Date.now();
  }
}

export async function ensureAICircuitAvailable(scope = DEFAULT_AI_CIRCUIT_SCOPE) {
  const redis = await getSharedRedisClient();

  if (!redis) {
    // In-memory fallback — synchronous check
    const breaker = getMemoryBreaker(scope);
    if (!isMemoryBreakerOpen(scope)) return;
    const retryAfterMs = Math.max(
      0,
      breaker.cooldownMs - (Date.now() - breaker.openedAt),
    );
    throw new Error(`AI 服务冷却中，请 ${Math.ceil(retryAfterMs / 1000)} 秒后重试`);
  }

  const [openExists, ttl] = await Promise.all([
    redis.exists(redisKey(scope, 'open')),
    redis.ttl(redisKey(scope, 'open')),
  ]);

  if (!openExists) return;

  const retryAfterSecs = Math.max(0, ttl);
  throw new Error(`AI 服务冷却中，请 ${retryAfterSecs} 秒后重试`);
}
