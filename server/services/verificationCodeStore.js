import { createClient } from 'redis';

import { AppError } from '../utils/appError.js';
import { logError, logWarn } from '../utils/logger.js';

const DEV = process.env.NODE_ENV !== 'production';
const TEST = process.env.NODE_ENV === 'test';
const REDIS_URL = process.env.REDIS_URL || '';
const memoryStore = new Map();

let redisClient = null;
let redisConnectPromise = null;
let warnedMemoryFallback = false;

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (now > Number(value?.expiresAt || 0)) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

cleanupTimer.unref?.();

function shouldUseMemoryFallback() {
  return !REDIS_URL && (DEV || TEST);
}

function assertRedisConfigured() {
  if (REDIS_URL) return;
  throw new AppError('未配置 REDIS_URL，验证码服务暂不可用', {
    status: 500,
    code: 'REDIS_CONFIG_ERROR',
  });
}

function warnMemoryFallbackOnce() {
  if (warnedMemoryFallback) return;
  warnedMemoryFallback = true;
  logWarn('verification_code_memory_fallback', {
    message: 'REDIS_URL 未配置，验证码服务当前退回内存模式，仅适用于开发/测试环境',
  });
}

async function getRedisClient() {
  assertRedisConfigured();

  if (redisClient?.isReady) return redisClient;
  if (redisConnectPromise) return redisConnectPromise;

  redisClient = createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 200, 3000),
    },
  });

  redisClient.on('error', (error) => {
    logError('verification_code_redis_error', { message: error.message });
  });

  redisConnectPromise = redisClient.connect()
    .then(() => redisClient)
    .finally(() => {
      redisConnectPromise = null;
    });

  return redisConnectPromise;
}

export async function saveVerificationCode(key, payload, ttlSeconds = 600) {
  if (shouldUseMemoryFallback()) {
    warnMemoryFallbackOnce();
    memoryStore.set(key, payload);
    return;
  }

  const client = await getRedisClient();
  await client.set(key, JSON.stringify(payload), { EX: ttlSeconds });
}

export async function getVerificationCode(key) {
  if (shouldUseMemoryFallback()) {
    warnMemoryFallbackOnce();
    return memoryStore.get(key) || null;
  }

  const client = await getRedisClient();
  const raw = await client.get(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function deleteVerificationCode(key) {
  if (shouldUseMemoryFallback()) {
    memoryStore.delete(key);
    return;
  }

  const client = await getRedisClient();
  await client.del(key);
}

export function buildVerificationCodeKey(type, account) {
  return `${type}:${type === 'email' ? String(account || '').toLowerCase() : String(account || '')}`;
}
