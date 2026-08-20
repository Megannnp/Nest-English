/**
 * Login-attempt rate limiter.
 *
 * Tracks failed attempts per (account, ip) pair AND per ip independently.
 * Redis is used when REDIS_URL is configured so that limits are shared across
 * multiple server instances/processes.  Falls back to an in-process Map for
 * dev/test environments.
 */
import { getSharedRedisClient } from './redisClient.js';

const DEFAULT_MAX_FAILED_ATTEMPTS = 10;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LOCK_MS = 60 * 1000;
const DEFAULT_IP_MAX_FAILED = 50; // per-IP limit regardless of account

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePositiveInt(value, fallback) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : fallback;
}

function getMaxFailedAttempts() {
  return parsePositiveInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS, DEFAULT_MAX_FAILED_ATTEMPTS);
}
function getWindowMs() {
  return parsePositiveInt(process.env.LOGIN_ATTEMPT_WINDOW_MS, DEFAULT_WINDOW_MS);
}
function getLockMs() {
  return parsePositiveInt(process.env.LOGIN_ATTEMPT_LOCK_MS, DEFAULT_LOCK_MS);
}
function getIpMaxFailed() {
  return parsePositiveInt(process.env.LOGIN_IP_MAX_FAILED_ATTEMPTS, DEFAULT_IP_MAX_FAILED);
}

function normalizeAccount(account) { return String(account || '').trim().toLowerCase(); }
function normalizeIp(ip)           { return String(ip || '').trim() || 'unknown-ip'; }
function buildAttemptKey(account, ip) {
  return `${normalizeAccount(account)}|${normalizeIp(ip)}`;
}
function toRetryAfterSeconds(ms) { return Math.max(1, Math.ceil(ms / 1000)); }

// ── Redis key scheme ──────────────────────────────────────────────────────────

const LUA_INCR_EXPIRE = `
  local c = redis.call('INCR', KEYS[1])
  if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return c
`;

function rCountKey(key) { return `login_fail:count:${key}`; }
function rLockKey(key)  { return `login_fail:lock:${key}`; }
function rIpCountKey(ip){ return `login_fail:ip:${normalizeIp(ip)}`; }
function rIpLockKey(ip) { return `login_fail:ip_lock:${normalizeIp(ip)}`; }

async function atomicIncrExpire(redis, key, windowSecs) {
  return redis.eval(LUA_INCR_EXPIRE, { keys: [key], arguments: [String(windowSecs)] });
}

// ── Redis implementations ─────────────────────────────────────────────────────

async function getLoginAttemptStatusRedis(redis, account, ip) {
  const key = buildAttemptKey(account, ip);
  const maxAttempts = getMaxFailedAttempts();

  const [lockTtl, ipLockTtl] = await Promise.all([
    redis.ttl(rLockKey(key)),
    redis.ttl(rIpLockKey(ip)),
  ]);

  if (lockTtl > 0) {
    return { allowed: false, attemptsLeft: 0, maxAttempts, retryAfterSeconds: lockTtl };
  }
  if (ipLockTtl > 0) {
    return { allowed: false, attemptsLeft: 0, maxAttempts, retryAfterSeconds: ipLockTtl };
  }

  const countStr = await redis.get(rCountKey(key));
  const count = Number(countStr || 0);
  return {
    allowed: count < maxAttempts,
    attemptsLeft: Math.max(0, maxAttempts - count),
    maxAttempts,
    retryAfterSeconds: 0,
  };
}

async function recordLoginFailureRedis(redis, account, ip) {
  const key = buildAttemptKey(account, ip);
  const maxAttempts = getMaxFailedAttempts();
  const ipMax = getIpMaxFailed();
  const lockSecs = Math.ceil(getLockMs() / 1000);
  const windowSecs = Math.ceil(getWindowMs() / 1000);

  // Bail early if already locked
  const [lockTtl, ipLockTtl] = await Promise.all([
    redis.ttl(rLockKey(key)),
    redis.ttl(rIpLockKey(ip)),
  ]);
  if (lockTtl > 0) {
    return { blocked: true, attemptsLeft: 0, maxAttempts, retryAfterSeconds: lockTtl };
  }
  if (ipLockTtl > 0) {
    return { blocked: true, attemptsLeft: 0, maxAttempts, retryAfterSeconds: ipLockTtl };
  }

  // Atomically increment both counters
  const [count, ipCount] = await Promise.all([
    atomicIncrExpire(redis, rCountKey(key), windowSecs),
    atomicIncrExpire(redis, rIpCountKey(ip), windowSecs),
  ]);

  if (Number(count) >= maxAttempts) {
    await redis.set(rLockKey(key), '1', { EX: lockSecs });
    return { blocked: true, attemptsLeft: 0, maxAttempts, retryAfterSeconds: lockSecs };
  }
  if (Number(ipCount) >= ipMax) {
    await redis.set(rIpLockKey(ip), '1', { EX: lockSecs });
    return { blocked: true, attemptsLeft: 0, maxAttempts, retryAfterSeconds: lockSecs };
  }

  return {
    blocked: false,
    attemptsLeft: Math.max(0, maxAttempts - Number(count)),
    maxAttempts,
    retryAfterSeconds: 0,
  };
}

async function clearLoginFailuresRedis(redis, account, ip) {
  const key = buildAttemptKey(account, ip);
  await redis.del([rCountKey(key), rLockKey(key)]);
}

// ── In-memory fallback (dev/test) ─────────────────────────────────────────────

const attemptsByKey = new Map();
const ipAttemptsByKey = new Map();

function clearExpiredWindow(entry, now) {
  if (!entry) return null;
  if (entry.lockUntil > now) return entry;
  if (entry.windowStart + getWindowMs() > now) return entry;
  return null;
}

function getLoginAttemptStatusMemory(account, ip, now) {
  const key = buildAttemptKey(account, ip);
  const maxAttempts = getMaxFailedAttempts();

  const rawEntry = attemptsByKey.get(key);
  const entry = clearExpiredWindow(rawEntry, now);
  if (!entry) {
    attemptsByKey.delete(key);
    return { allowed: true, attemptsLeft: maxAttempts, maxAttempts, retryAfterSeconds: 0 };
  }
  if (entry.lockUntil > now) {
    return { allowed: false, attemptsLeft: 0, maxAttempts, retryAfterSeconds: toRetryAfterSeconds(entry.lockUntil - now) };
  }

  // Per-IP check
  const ipKey = normalizeIp(ip);
  const rawIpEntry = ipAttemptsByKey.get(ipKey);
  const ipEntry = clearExpiredWindow(rawIpEntry, now);
  if (ipEntry?.lockUntil > now) {
    return { allowed: false, attemptsLeft: 0, maxAttempts, retryAfterSeconds: toRetryAfterSeconds(ipEntry.lockUntil - now) };
  }

  return {
    allowed: true,
    attemptsLeft: Math.max(0, maxAttempts - entry.failedCount),
    maxAttempts,
    retryAfterSeconds: 0,
  };
}

function recordLoginFailureMemory(account, ip, now) {
  const key = buildAttemptKey(account, ip);
  const maxAttempts = getMaxFailedAttempts();
  const ipMax = getIpMaxFailed();
  const lockMs = getLockMs();

  // account+ip
  const rawEntry = attemptsByKey.get(key);
  const entry = clearExpiredWindow(rawEntry, now) || { failedCount: 0, windowStart: now, lockUntil: 0 };
  if (entry.lockUntil > now) {
    return { blocked: true, attemptsLeft: 0, maxAttempts, retryAfterSeconds: toRetryAfterSeconds(entry.lockUntil - now) };
  }
  entry.failedCount += 1;
  if (entry.failedCount >= maxAttempts) {
    entry.failedCount = maxAttempts;
    entry.lockUntil = now + lockMs;
    attemptsByKey.set(key, entry);
    return { blocked: true, attemptsLeft: 0, maxAttempts, retryAfterSeconds: toRetryAfterSeconds(lockMs) };
  }
  attemptsByKey.set(key, entry);

  // per-IP
  const ipKey = normalizeIp(ip);
  const rawIp = ipAttemptsByKey.get(ipKey);
  const ipEntry = clearExpiredWindow(rawIp, now) || { failedCount: 0, windowStart: now, lockUntil: 0 };
  ipEntry.failedCount += 1;
  if (ipEntry.failedCount >= ipMax) {
    ipEntry.failedCount = ipMax;
    ipEntry.lockUntil = now + lockMs;
  }
  ipAttemptsByKey.set(ipKey, ipEntry);
  if (ipEntry.lockUntil > now) {
    return { blocked: true, attemptsLeft: 0, maxAttempts, retryAfterSeconds: toRetryAfterSeconds(lockMs) };
  }

  return {
    blocked: false,
    attemptsLeft: Math.max(0, maxAttempts - entry.failedCount),
    maxAttempts,
    retryAfterSeconds: 0,
  };
}

function clearLoginFailuresMemory(account, ip) {
  attemptsByKey.delete(buildAttemptKey(account, ip));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getLoginAttemptStatus(account, ip, now = Date.now()) {
  const redis = await getSharedRedisClient();
  if (redis) return getLoginAttemptStatusRedis(redis, account, ip);
  return getLoginAttemptStatusMemory(account, ip, now);
}

export async function recordLoginFailure(account, ip, now = Date.now()) {
  const redis = await getSharedRedisClient();
  if (redis) return recordLoginFailureRedis(redis, account, ip);
  return recordLoginFailureMemory(account, ip, now);
}

export async function clearLoginFailures(account, ip) {
  const redis = await getSharedRedisClient();
  if (redis) return clearLoginFailuresRedis(redis, account, ip);
  clearLoginFailuresMemory(account, ip);
}

export function __resetLoginAttemptStoreForTests() {
  attemptsByKey.clear();
  ipAttemptsByKey.clear();
}
