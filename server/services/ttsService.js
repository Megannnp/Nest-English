import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { isTtsPublicAudioReferenced } from './ttsPublicAudioRepository.js';
import { logError } from '../utils/logger.js';

const DEFAULT_PRIVATE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_PUBLIC_UNREFERENCED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TTS_DATA_DIR = process.env.TTS_DATA_DIR
  ? path.resolve(process.env.TTS_DATA_DIR)
  : path.join(__dirname, '../data');
const CACHE_DIR = path.join(TTS_DATA_DIR, 'tts-cache');
const PUBLIC_CACHE_DIR = path.join(TTS_DATA_DIR, 'tts-public');
const PUBLIC_INDEX_PATH = path.join(PUBLIC_CACHE_DIR, 'index.json');
const TTS_ENDPOINT = 'https://openspeech.bytedance.com/api/v1/tts';
const CACHE_MAX_AGE_MS = nonNegativeMsEnv('TTS_CACHE_MAX_AGE_MS', DEFAULT_PRIVATE_CACHE_MAX_AGE_MS);
const PUBLIC_UNREFERENCED_MAX_AGE_MS = nonNegativeMsEnv('TTS_PUBLIC_UNREFERENCED_MAX_AGE_MS', DEFAULT_PUBLIC_UNREFERENCED_MAX_AGE_MS);
const inFlightGenerations = new Map();
let lastCacheCleanupAt = 0;
let lastPublicCleanupAt = 0;

function nonNegativeMsEnv(name, fallback) {
  if (process.env[name] == null || process.env[name] === '') return fallback;
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

// Speed mapping: keep the existing Web Speech rate values (0.6–1.0),
// map them onto Volcengine's speed_ratio range (0.5–2.0).
// The semantics are the same (1.0 = normal speed) so we pass through directly.
function clampSpeed(rate) {
  const n = Number(rate) || 1.0;
  return Math.min(Math.max(n, 0.5), 2.0);
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function ensurePublicCacheDir() {
  if (!fs.existsSync(PUBLIC_CACHE_DIR)) {
    fs.mkdirSync(PUBLIC_CACHE_DIR, { recursive: true });
  }
}

function cacheKey(text, voice, speed) {
  return crypto
    .createHash('sha256')
    .update(`${text}|${voice}|${speed}`)
    .digest('hex');
}

function cachePath(key) {
  return path.join(CACHE_DIR, `${key}.mp3`);
}

function publicCachePath(publicId) {
  return path.join(PUBLIC_CACHE_DIR, `${publicId}.mp3`);
}

function readPublicIndex() {
  try {
    return JSON.parse(fs.readFileSync(PUBLIC_INDEX_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writePublicIndex(index) {
  ensurePublicCacheDir();
  fs.writeFileSync(PUBLIC_INDEX_PATH, JSON.stringify(index, null, 2));
}

function isCached(key) {
  return fs.existsSync(cachePath(key));
}

function touchCachedFile(key) {
  try {
    const now = new Date();
    fs.utimesSync(cachePath(key), now, now);
  } catch (err) {
    logError('tts_cache_touch_error', err, { key });
  }
}

async function cleanupOldPrivateCacheFiles() {
  if (!CACHE_MAX_AGE_MS) return;
  const now = Date.now();
  if (now - lastCacheCleanupAt < 60 * 60 * 1000) return;
  lastCacheCleanupAt = now;

  try {
    for (const entry of fs.readdirSync(CACHE_DIR, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.mp3')) continue;
      const filePath = path.join(CACHE_DIR, entry.name);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > CACHE_MAX_AGE_MS) {
        const key = entry.name.slice(0, -4);
        if (/^[0-9a-f]{64}$/.test(key) && await isTtsPublicAudioReferenced(key)) continue;
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    logError('tts_cache_cleanup_error', err);
  }
}

async function cleanupUnreferencedPublicAudioFiles() {
  if (!PUBLIC_UNREFERENCED_MAX_AGE_MS || !fs.existsSync(PUBLIC_CACHE_DIR)) return;
  const now = Date.now();
  if (now - lastPublicCleanupAt < 60 * 60 * 1000) return;
  lastPublicCleanupAt = now;

  try {
    for (const entry of fs.readdirSync(PUBLIC_CACHE_DIR, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.mp3')) continue;
      const filePath = path.join(PUBLIC_CACHE_DIR, entry.name);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs <= PUBLIC_UNREFERENCED_MAX_AGE_MS) continue;

      const key = entry.name.slice(0, -4);
      if (/^[0-9a-f]{32}$/.test(key) && await isTtsPublicAudioReferenced(key)) continue;
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    logError('tts_public_cleanup_error', err);
  }
}

export function normalizeSpeechText(text) {
  return String(text || '')
    .replace(/<break\s+time=["']?(\d+(?:\.\d+)?)(ms|s)["']?\s*\/?>/gi, (_match, amount, unit) =>
      pauseText(Number(amount), unit)
    )
    .replace(/\[pause(?::\s*(\d+(?:\.\d+)?)(ms|s)?)?\]/gi, (_match, amount = 1, unit = 's') =>
      pauseText(Number(amount), unit)
    );
}

function pauseText(amount, unit = 's') {
  const seconds = unit.toLowerCase() === 'ms' ? amount / 1000 : amount;
  if (seconds >= 1.5) return '.\n\n';
  if (seconds >= 0.7) return '. ';
  return ', ';
}

async function callVolcengineTTS(text, voice, speed) {
  const apiKey  = process.env.VOLCENGINE_TTS_TOKEN;
  const appId   = process.env.VOLCENGINE_TTS_APPID || '';
  const cluster = process.env.VOLCENGINE_TTS_CLUSTER || 'volcano_tts';

  if (!apiKey) {
    throw new Error('未配置 VOLCENGINE_TTS_TOKEN');
  }

  const payload = {
    app: { appid: appId, token: apiKey, cluster },
    user: { uid: 'nest_tts' },
    audio: {
      voice_type:   voice,
      encoding:     'mp3',
      speed_ratio:  clampSpeed(speed),
      volume_ratio: 1.0,
      pitch_ratio:  1.0,
    },
    request: {
      reqid:     crypto.randomUUID(),
      text,
      text_type: 'plain',
      operation: 'query',
    },
  };

  const res = await fetch(TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer;${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Volcengine TTS HTTP ${res.status}: ${body}`);
  }

  const json = await res.json();

  // Volcengine TTS success code is 3000
  if (json.code !== 3000) {
    throw new Error(`Volcengine TTS 错误 ${json.code}: ${json.message || '未知错误'}`);
  }

  if (!json.data?.audio) {
    throw new Error('Volcengine TTS 返回数据缺少 audio 字段');
  }

  return Buffer.from(json.data.audio, 'base64');
}

/**
 * Generate (or fetch from cache) TTS audio for the given text.
 * Returns the cache key so the caller can build a URL to serve the file.
 *
 * @param {string} text
 * @param {object} opts
 * @param {string} opts.voice  - Volcengine voice_type (env default if omitted)
 * @param {number} opts.speed  - speed_ratio 0.5–2.0 (1.0 = normal)
 * @returns {Promise<string>}   cache key (hex hash)
 */
export async function synthesizeSpeech(text, { voice, speed = 1.0 } = {}) {
  const resolvedVoice = voice || process.env.VOLCENGINE_TTS_VOICE || 'BV406_streaming';
  const resolvedSpeed = clampSpeed(speed);
  const normalizedText = normalizeSpeechText(text);

  ensureCacheDir();
  await cleanupOldPrivateCacheFiles();
  await cleanupUnreferencedPublicAudioFiles();

  const key = cacheKey(normalizedText, resolvedVoice, resolvedSpeed);

  if (isCached(key)) {
    touchCachedFile(key);
    return key;
  }

  if (!inFlightGenerations.has(key)) {
    inFlightGenerations.set(key, (async () => {
      try {
        if (!isCached(key)) {
          const audio = await callVolcengineTTS(normalizedText, resolvedVoice, resolvedSpeed);
          fs.writeFileSync(cachePath(key), audio);
        }
      } catch (err) {
        logError('tts_synthesis_error', err, { text: normalizedText.slice(0, 80), voice: resolvedVoice, speed: resolvedSpeed });
        throw err;
      } finally {
        inFlightGenerations.delete(key);
      }
    })());
  }

  await inFlightGenerations.get(key);
  if (isCached(key)) touchCachedFile(key);
  return key;
}

/**
 * Absolute filesystem path for a cached audio file.
 */
export function getAudioFilePath(key) {
  return cachePath(key);
}

export function publishPublicAudio(key) {
  if (!/^[0-9a-f]{64}$/.test(String(key || ''))) {
    throw new Error('无效的音频 key');
  }
  const sourcePath = cachePath(key);
  if (!fs.existsSync(sourcePath)) {
    throw new Error('音频文件不存在，请重新生成');
  }
  ensurePublicCacheDir();
  const index = readPublicIndex();
  const existingPublicId = index[key];
  if (/^[0-9a-f]{32}$/.test(existingPublicId) && fs.existsSync(publicCachePath(existingPublicId))) {
    return existingPublicId;
  }

  const publicId = crypto.randomBytes(16).toString('hex');
  fs.copyFileSync(sourcePath, publicCachePath(publicId));
  index[key] = publicId;
  writePublicIndex(index);
  return publicId;
}

export function getPublicAudioFilePath(publicId) {
  return publicCachePath(publicId);
}

export function isTTSConfigured() {
  return !!(process.env.VOLCENGINE_TTS_APPID && process.env.VOLCENGINE_TTS_TOKEN);
}
