/**
 * Guest AI rate-limiting budget — Redis-backed for multi-instance deployments.
 *
 * Redis key per (scope, visitor-identity):
 *   ai:budget:{scope}:{ip}  — INCR counter with TTL = windowMs/1000
 *
 * When REDIS_URL is not set the module falls back to an in-process Map (same
 * behaviour as before) so that dev/test environments work without Redis.
 */
import { getSharedRedisClient } from '../services/redisClient.js';

const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_SCOPE_LIMITS = {
  analyze_tags: 12,
  grammar_analyze: 12,
  grammar_quiz: 6,
  grammar_practice: 1,
  recognize_text: 4,
  vocab_analyze: 12,
  speaking_asr: 30,
  reading_quiz: 6,
  phonetics_analyze: 12,
  phonetics_word_analyze: 12,
};

// ── In-memory fallback ───────────────────────────────────────────────────────

const guestBuckets = new Map();

const SKIP_LOCAL_DEV_GUEST_BUDGET =
  process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';

function readPositiveInteger(value, fallback) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return fallback;
  return num;
}

function normalizeScope(scope) {
  return String(scope || '').trim().toLowerCase();
}

function getScopeLimit(scope) {
  const normalizedScope = normalizeScope(scope);
  const envKey = `GUEST_AI_${normalizedScope.toUpperCase()}_MAX`;
  return readPositiveInteger(process.env[envKey], DEFAULT_SCOPE_LIMITS[normalizedScope] || 6);
}

function getWindowMs(scope) {
  const normalizedScope = normalizeScope(scope);
  const envKey = `GUEST_AI_${normalizedScope.toUpperCase()}_WINDOW_MS`;
  return readPositiveInteger(process.env[envKey], DEFAULT_WINDOW_MS);
}

function getGuestAIIdentity(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function isLocalDevRequest(req) {
  if (!SKIP_LOCAL_DEV_GUEST_BUDGET) return false;
  const identity = getGuestAIIdentity(req);
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].some((value) =>
    String(identity).includes(value)
  );
}

function consumeGuestAIBudgetMemory(req, scope, now = Date.now()) {
  const normalizedScope = normalizeScope(scope);
  const identity = getGuestAIIdentity(req);
  const limit = getScopeLimit(normalizedScope);
  const windowMs = getWindowMs(normalizedScope);
  const key = `${normalizedScope}:${identity}`;
  const current = guestBuckets.get(key);

  if (!current || current.resetAt <= now) {
    guestBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, limit, remaining: Math.max(0, limit - 1), retryAfterMs: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  guestBuckets.set(key, current);
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterMs: 0,
  };
}

// ── Redis path ────────────────────────────────────────────────────────────────

async function consumeGuestAIBudgetRedis(redis, req, scope) {
  const normalizedScope = normalizeScope(scope);
  const identity = getGuestAIIdentity(req);
  const limit = getScopeLimit(normalizedScope);
  const windowMs = getWindowMs(normalizedScope);
  const windowSecs = Math.ceil(windowMs / 1000);
  const key = `ai:budget:${normalizedScope}:${identity}`;

  // Lua script makes INCR + conditional EXPIRE atomic, eliminating the race
  // where the key could expire between INCR (returns 1) and EXPIRE, leaving
  // the counter without a TTL and causing permanent rate-limit.
  const luaIncrExpire = `
    local c = redis.call('INCR', KEYS[1])
    if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
    return c
  `;
  const count = await redis.eval(luaIncrExpire, {
    keys: [key],
    arguments: [String(windowSecs)],
  });

  // INCR returns the count *after* this request, whereas the in-memory path
  // compares the count *before* it. Use `>` so both paths grant exactly
  // `limit` requests per window instead of the Redis path granting limit-1.
  if (count > limit) {
    const ttl = await redis.ttl(key);
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterMs: Math.max(0, ttl * 1000),
    };
  }

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterMs: 0,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Consumes one unit of the guest AI budget for the given scope and request.
 * Returns a budget descriptor:  { allowed, limit, remaining, retryAfterMs }
 *
 * In dev/test (no REDIS_URL) this is synchronous-compatible via the in-memory
 * fallback; in production with Redis it is async.  Always await the result.
 *
 * `now` is accepted as a parameter for deterministic unit tests (memory path only).
 */
export async function consumeGuestAIBudget(req, scope, now = Date.now()) {
  const redis = await getSharedRedisClient();
  if (!redis) {
    return consumeGuestAIBudgetMemory(req, scope, now);
  }
  return consumeGuestAIBudgetRedis(redis, req, scope);
}

/**
 * Same rate-limit primitive as consumeGuestAIBudget, but keyed by an explicit
 * identity (e.g. an authenticated user id) instead of request IP. Used for
 * costly AI features — like realtime ASR — that require login and therefore
 * never hit the guest-only enforceGuestAIBudget middleware.
 */
export async function consumeAIBudgetForIdentity(identity, scope, now = Date.now()) {
  return consumeGuestAIBudget({ ip: identity }, scope, now);
}

export function enforceGuestAIBudget(scope) {
  return async (req, res, next) => {
    try {
      if (req.user?.id) return next();
      if (isLocalDevRequest(req)) return next();

      const budget = await consumeGuestAIBudget(req, scope);
      if (budget.allowed) return next();

      res.setHeader('Retry-After', String(Math.ceil(budget.retryAfterMs / 1000)));
      return res.status(429).json({
        code: 429,
        msg: '访客 AI 试用次数已用完，请登录后继续使用',
        detail: {
          scope,
          limit: budget.limit,
          retryAfterSeconds: Math.ceil(budget.retryAfterMs / 1000),
        },
      });
    } catch (error) {
      return next(error);
    }
  };
}

/** Only for unit tests — clears the in-memory fallback store. */
export function resetGuestAIBudgetForTests() {
  if (process.env.NODE_ENV !== 'test') return;
  guestBuckets.clear();
}
