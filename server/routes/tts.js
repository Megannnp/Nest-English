import crypto from 'crypto';
import { Router } from 'express';
import fs from 'fs';

import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';
import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from '../services/adminControlService.js';
import { consumeEntitlement, refundEntitlement } from '../services/pointsService.js';
import { buildTtsPublicAudioUrl, isTtsPublicAudioReferenced } from '../services/ttsPublicAudioRepository.js';
import {
  getAudioFilePath,
  getPublicAudioFilePath,
  isTTSConfigured,
  publishPublicAudio,
  synthesizeSpeech,
} from '../services/ttsService.js';
import { logError } from '../utils/logger.js';

const router = Router();
const TTS_AUDIO_URL_TTL_MS = 10 * 60 * 1000;

function getAudioSigningSecret() {
  return process.env.JWT_SECRET || process.env.VOLCENGINE_TTS_TOKEN || '';
}

function signAudioAccess(key, expiresAt) {
  const secret = getAudioSigningSecret();
  if (!secret) return '';
  return crypto
    .createHmac('sha256', secret)
    .update(`${key}:${expiresAt}`)
    .digest('hex');
}

export function buildSignedAudioUrl(key) {
  const expiresAt = Date.now() + TTS_AUDIO_URL_TTL_MS;
  const signature = signAudioAccess(key, expiresAt);
  if (!signature) return `/api/tts/audio/${key}`;
  return `/api/tts/audio/${key}?exp=${expiresAt}&sig=${signature}`;
}

function buildPublicAudioUrl(key) {
  return buildTtsPublicAudioUrl(key);
}

function hasValidSignedAudioAccess(req, key) {
  const expiresAt = Number(req.query?.exp);
  const signature = String(req.query?.sig || '');
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) return false;

  const expected = signAudioAccess(key, expiresAt);
  if (!expected || expected.length !== signature.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function consumeTtsEntitlement(req, text) {
  if (!req.user?.id) return null;

  const sourceId = req.requestId || `tts:${Date.now()}`;
  const unit = 'sentence_reading';
  const baseConsumption = { userId: req.user.id, unit, amount: 1, sourceType: 'tts', sourceId };
  const result = await consumeEntitlement({
    userId: req.user.id,
    unit,
    amount: 1,
    reason: 'feature_usage',
    sourceType: 'tts',
    sourceId,
    metadata: { feature: 'sentence_reading', textLength: text.trim().length },
  });
  return { ...baseConsumption, ...result };
}

async function refundTtsEntitlement(consumption) {
  if (!consumption?.consumed) return;

  try {
    await refundEntitlement({ ...consumption, metadata: { failedFeature: 'sentence_reading' } });
  } catch (refundError) {
    logError('entitlement_refund_failed', {
      message: refundError.message,
      userId: consumption.userId,
      unit: consumption.unit,
      sourceType: consumption.sourceType,
      sourceId: consumption.sourceId,
    });
  }
}

async function recordTtsUsage(user, source) {
  try {
    await recordAIUsageEvent({ feature: 'tts', user, source });
  } catch (err) {
    logError('tts_usage_record_failed', err, { userId: user?.id, source });
  }
}

// POST /api/tts  →  { url: "/api/tts/audio/:key" }
router.post('/', requireAuth, async (req, res, next) => {
  let entitlementConsumption = null;
  try {
    const { text, speed = 1.0, voice } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ code: 400, msg: 'text 不能为空' });
    }

    if (text.length > 500) {
      return res.status(400).json({ code: 400, msg: 'text 超出长度限制（最多 500 字符）' });
    }

    if (!isTTSConfigured()) {
      return res.status(503).json({ code: 503, msg: 'TTS 服务未配置' });
    }

    await assertAIBudgetAvailable({ feature: 'tts', user: req.user });
    entitlementConsumption = await consumeTtsEntitlement(req, text);

    const key = await synthesizeSpeech(text.trim(), { voice, speed: Number(speed) || 1.0 });
    await recordTtsUsage(req.user, req.requestId);
    return res.json({ code: 200, msg: 'ok', url: buildSignedAudioUrl(key) });
  } catch (err) {
    await refundTtsEntitlement(entitlementConsumption);
    return next(err);
  }
});

router.post('/admin/generate', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { englishText = '', chineseText = '', ipaText = '', speed = 1.0 } = req.body || {};
    const parts = [
      ['english', '英文音频', englishText],
      ['chinese', '中文音频', chineseText],
      ['ipa', '音标音频', ipaText],
    ]
      .map(([type, label, text]) => ({ type, label, text: String(text || '').trim() }))
      .filter((item) => item.text);

    if (!parts.length) {
      return res.status(400).json({ code: 400, msg: '请输入要生成的文本' });
    }
    if (parts.some((item) => item.text.length > 2000)) {
      return res.status(400).json({ code: 400, msg: '单段文本超出长度限制（最多 2000 字符）' });
    }
    if (!isTTSConfigured()) {
      return res.status(503).json({ code: 503, msg: 'TTS 服务未配置' });
    }

    for (let index = 0; index < parts.length; index += 1) {
      await assertAIBudgetAvailable({ feature: 'tts', user: req.user });
    }

    const items = [];
    for (const item of parts) {
      const key = await synthesizeSpeech(item.text, { speed: Number(speed) || 1.0 });
      await recordTtsUsage(req.user, req.requestId);
      const publicId = publishPublicAudio(key);
      items.push({ ...item, key: publicId, url: buildPublicAudioUrl(publicId), previewUrl: buildSignedAudioUrl(key) });
    }

    return res.json({ code: 200, msg: 'ok', data: { items } });
  } catch (err) {
    return next(err);
  }
});

router.get('/public/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!/^[0-9a-f]{32}$/.test(key) && !/^[0-9a-f]{64}$/.test(key)) {
      return res.status(400).json({ code: 400, msg: '无效的音频 key' });
    }
    if (/^[0-9a-f]{32}$/.test(key)) {
      return serveAudioFile(req, res, next, getPublicAudioFilePath(key));
    }
    if (await isTtsPublicAudioReferenced(key)) {
      return serveAudioFile(req, res, next, getAudioFilePath(key));
    }
    return res.status(404).json({ code: 404, msg: '音频文件不存在，请重新请求' });
  } catch (err) {
    return next(err);
  }
});

// GET /api/tts/audio/:key  →  signed or authenticated mp3 file
router.get('/audio/:key', (req, res, next) => {
  try {
    const { key } = req.params;

    // Sanitize: only allow hex strings (sha256 = 64 chars)
    if (!/^[0-9a-f]{64}$/.test(key)) {
      return res.status(400).json({ code: 400, msg: '无效的音频 key' });
    }

    if (!hasValidSignedAudioAccess(req, key)) {
      return res.status(401).json({ code: 401, msg: '音频链接已失效，请重新请求' });
    }

    return serveAudioFile(req, res, next, getAudioFilePath(key));
  } catch (err) {
    return next(err);
  }
});

function serveAudioFile(_req, res, next, filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ code: 404, msg: '音频文件不存在，请重新请求' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=600');
    return res.sendFile(filePath);
  } catch (err) {
    return next(err);
  }
}

export default router;
