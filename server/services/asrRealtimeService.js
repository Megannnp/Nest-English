import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import WebSocket, { WebSocketServer } from 'ws';

import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from './adminControlService.js';
import {
  buildAsrStartPayload,
  createAudioPacket,
  createFullClientRequestPacket,
  parseServerPacket,
} from './asrProtocolService.js';
import { consumeAIBudgetForIdentity } from '../middleware/aiGuestBudget.js';
import { readCookie, TOKEN_COOKIE_NAME } from '../utils/authCookies.js';
import { logError, logInfo } from '../utils/logger.js';

const DEFAULT_ASR_ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async';
const DEFAULT_ASR_RESOURCE_ID = 'volc.bigasr.sauc.duration';
const DEFAULT_MAX_SESSION_MS = 2 * 60 * 1000;
const DEFAULT_MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_AUDIO_FRAME_BYTES = 64 * 1024;
const DEFAULT_MAX_ACTIVE_CONNECTIONS_PER_USER = 2;

const activeConnectionsByUser = new Map();

function parseOrigin(value) {
  try {
    return value ? new URL(value).origin : '';
  } catch {
    return '';
  }
}

function getAllowedAsrOrigins() {
  const configured = (process.env.ALLOWED_ORIGIN || 'https://nestenglish.com')
    .split(',')
    .map((origin) => parseOrigin(origin.trim()))
    .filter(Boolean);
  if (process.env.NODE_ENV !== 'production') {
    configured.push('http://localhost:5173', 'http://127.0.0.1:5173');
  }
  return new Set(configured);
}

export function isAllowedAsrOrigin(originHeader) {
  const origin = parseOrigin(originHeader);
  if (!origin) return false;
  return getAllowedAsrOrigins().has(origin);
}

function rejectUpgrade(socket, statusCode = 403, message = 'Forbidden') {
  try {
    socket.write(`HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`);
  } finally {
    socket.destroy();
  }
}

function positiveIntEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

function resolveAsrLimits() {
  return {
    maxSessionMs: positiveIntEnv('ASR_MAX_SESSION_MS', DEFAULT_MAX_SESSION_MS),
    maxAudioBytes: positiveIntEnv('ASR_MAX_AUDIO_BYTES', DEFAULT_MAX_AUDIO_BYTES),
    maxAudioFrameBytes: positiveIntEnv('ASR_MAX_AUDIO_FRAME_BYTES', DEFAULT_MAX_AUDIO_FRAME_BYTES),
    maxActiveConnectionsPerUser: positiveIntEnv('ASR_MAX_ACTIVE_CONNECTIONS_PER_USER', DEFAULT_MAX_ACTIVE_CONNECTIONS_PER_USER),
  };
}

function getUserKey(user) {
  return String(user.id || user.userId || user.accountCode || 'user');
}

export function reserveAsrConnection(userKey, maxActiveConnectionsPerUser = DEFAULT_MAX_ACTIVE_CONNECTIONS_PER_USER) {
  const current = activeConnectionsByUser.get(userKey) || 0;
  if (current >= maxActiveConnectionsPerUser) return false;
  activeConnectionsByUser.set(userKey, current + 1);
  return true;
}

export function releaseAsrConnection(userKey) {
  const current = activeConnectionsByUser.get(userKey) || 0;
  if (current <= 1) activeConnectionsByUser.delete(userKey);
  else activeConnectionsByUser.set(userKey, current - 1);
}

export function validateAsrAudioChunk({ chunkBytes, totalAudioBytes, limits }) {
  if (chunkBytes > limits.maxAudioFrameBytes) {
    return { ok: false, message: '单次语音数据过大，请重新开始录音。', closeCode: 1009 };
  }
  if (totalAudioBytes + chunkBytes > limits.maxAudioBytes) {
    return { ok: false, message: '本次语音输入已达到时长上限，请结束后重新开始。', closeCode: 1009 };
  }
  return { ok: true };
}

function isAsrConfigured() {
  return Boolean(process.env.VOLCENGINE_ASR_APP_KEY && process.env.VOLCENGINE_ASR_ACCESS_KEY);
}

function resolveAsrConfig() {
  return {
    endpoint: process.env.VOLCENGINE_ASR_ENDPOINT || DEFAULT_ASR_ENDPOINT,
    appKey: process.env.VOLCENGINE_ASR_APP_KEY || '',
    accessKey: process.env.VOLCENGINE_ASR_ACCESS_KEY || '',
    resourceId: process.env.VOLCENGINE_ASR_RESOURCE_ID || DEFAULT_ASR_RESOURCE_ID,
  };
}

function authenticateUpgradeRequest(req) {
  const cookieToken = readCookie(req, TOKEN_COOKIE_NAME);
  if (!cookieToken || !process.env.JWT_SECRET) return null;
  try {
    return jwt.verify(cookieToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

function safeSend(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function closeSocket(ws) {
  try {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) ws.close();
  } catch {
    // Ignore close races; callers are already cleaning up connection state.
  }
}

function normalizeResultPayload(packet) {
  const result = packet.payload?.result || {};
  const utterances = Array.isArray(result.utterances) ? result.utterances : [];
  const definiteUtterances = utterances.filter((item) => item?.definite);
  const latestUtterance = utterances[utterances.length - 1] || null;
  const latestDefinite = definiteUtterances[definiteUtterances.length - 1] || null;
  return {
    type: 'result',
    text: result.text || '',
    utteranceText: latestUtterance?.text || '',
    definiteText: latestDefinite?.text || '',
    definite: Boolean(latestDefinite?.definite || packet.final),
    final: Boolean(packet.final),
    sequence: packet.sequence,
  };
}

function sendOrQueuePacket({ upstream, upstreamOpen, pendingPackets, packet }) {
  if (upstreamOpen && upstream.readyState === WebSocket.OPEN) upstream.send(packet);
  else pendingPackets.push(packet);
}

function createStartPacket({ message, user }) {
  return createFullClientRequestPacket(buildAsrStartPayload({
    language: message.language || 'en-US',
    userId: user.id || user.userId || user.accountCode || 'user',
    enableNonstream: message.enableNonstream !== false,
  }));
}

function handleClientTextMessage({ data, user, upstream, upstreamOpen, pendingPackets }) {
  const message = JSON.parse(data.toString('utf8') || '{}');
  if (message.type === 'start') {
    sendOrQueuePacket({
      upstream,
      upstreamOpen,
      pendingPackets,
      packet: createStartPacket({ message, user }),
    });
    return { started: true };
  }
  if (message.type === 'finish') {
    sendOrQueuePacket({
      upstream,
      upstreamOpen,
      pendingPackets,
      packet: createAudioPacket(Buffer.alloc(0), { last: true }),
    });
  }
  return { started: false };
}

function handleClientAudioMessage({ data, started, clientWs, upstream, upstreamOpen, pendingPackets }) {
  if (!started) {
    safeSend(clientWs, { type: 'error', message: '语音识别尚未开始。' });
    return;
  }
  sendOrQueuePacket({
    upstream,
    upstreamOpen,
    pendingPackets,
    packet: createAudioPacket(Buffer.from(data), { last: false }),
  });
}

export async function handleAsrClient(clientWs, req) {
  if (!isAsrConfigured()) {
    safeSend(clientWs, { type: 'error', message: 'ASR 服务未配置，请检查 VOLCENGINE_ASR_* 环境变量。' });
    clientWs.close(1011, 'ASR not configured');
    return;
  }

  const user = authenticateUpgradeRequest(req);
  if (!user) {
    safeSend(clientWs, { type: 'error', message: '请先登录后使用语音识别。' });
    clientWs.close(1008, 'Unauthorized');
    return;
  }

  const userKey = getUserKey(user);
  const limits = resolveAsrLimits();
  if (!reserveAsrConnection(userKey, limits.maxActiveConnectionsPerUser)) {
    safeSend(clientWs, { type: 'error', message: '语音识别连接过多，请关闭其他录音后重试。' });
    clientWs.close(1008, 'Too many ASR connections');
    return;
  }

  // clientWs.on('message'/'close') must be registered before the awaited
  // budget check below — Node's EventEmitter never queues an event for a
  // listener added after it fires, so a client that sends its 'start' frame
  // (or disconnects) while the check is in flight would otherwise be silently
  // dropped, and a mid-check disconnect would leak the reservation above.
  // ready/earlyQueue buffer any such activity until setup finishes.
  let ready = false;
  let closedEarly = false;
  const earlyMessageQueue = [];
  let onClientMessage = () => {};

  clientWs.on('message', (data, isBinary) => {
    if (!ready) { earlyMessageQueue.push({ data, isBinary }); return; }
    onClientMessage(data, isBinary);
  });

  let released = false;
  const releaseConnection = () => {
    if (released) return;
    released = true;
    releaseAsrConnection(userKey);
  };
  clientWs.on('close', () => {
    if (!ready) { closedEarly = true; releaseConnection(); return; }
    clearTimeout(sessionTimer);
    releaseConnection();
    closeSocket(upstream);
  });

  try {
    await assertAIBudgetAvailable({ feature: 'speaking_asr', user });
    const budget = await consumeAIBudgetForIdentity(userKey, 'speaking_asr');
    if (!budget.allowed) {
      releaseConnection();
      safeSend(clientWs, { type: 'error', message: '本小时语音识别次数已达上限，请稍后再试。' });
      clientWs.close(1008, 'ASR budget exceeded');
      return;
    }
    await recordAIUsageEvent({ feature: 'speaking_asr', user, source: req.requestId });
  } catch (error) {
    logError('speaking_asr_budget_check_failed', { message: error.message, userKey });
    releaseConnection();
    safeSend(clientWs, { type: 'error', message: '语音识别预算检查失败，请稍后再试。' });
    clientWs.close(1011, 'ASR budget check failed');
    return;
  }

  if (closedEarly) return;

  const config = resolveAsrConfig();
  let upstreamOpen = false;
  let started = false;
  let totalAudioBytes = 0;
  const pendingPackets = [];
  const upstream = new WebSocket(config.endpoint, {
    headers: {
      'X-Api-App-Key': config.appKey,
      'X-Api-Access-Key': config.accessKey,
      'X-Api-Resource-Id': config.resourceId,
      'X-Api-Connect-Id': crypto.randomUUID(),
    },
  });
  const sessionTimer = setTimeout(() => {
    safeSend(clientWs, { type: 'error', message: '本次语音输入已达到时长上限，请结束后重新开始。' });
    closeSocket(clientWs);
    closeSocket(upstream);
  }, limits.maxSessionMs);

  upstream.on('open', () => {
    upstreamOpen = true;
    safeSend(clientWs, { type: 'ready' });
    while (pendingPackets.length && upstream.readyState === WebSocket.OPEN) {
      upstream.send(pendingPackets.shift());
    }
  });

  upstream.on('message', (data) => {
    try {
      const packet = parseServerPacket(data);
      if (packet.type === 'error') {
        safeSend(clientWs, { type: 'error', code: packet.code, message: packet.message });
      } else if (packet.type === 'result') {
        safeSend(clientWs, normalizeResultPayload(packet));
      }
    } catch (error) {
      logError('asr_packet_parse_failed', { message: error.message });
      safeSend(clientWs, { type: 'error', message: '语音识别结果解析失败。' });
    }
  });

  upstream.on('error', (error) => {
    logError('asr_upstream_error', { message: error.message });
    safeSend(clientWs, { type: 'error', message: 'ASR 服务连接失败，请稍后重试。' });
  });

  upstream.on('close', (code, reason) => {
    safeSend(clientWs, { type: 'closed', code, reason: reason?.toString?.() || '' });
    closeSocket(clientWs);
  });
  upstream.on('close', releaseConnection);

  onClientMessage = (data, isBinary) => {
    try {
      if (!isBinary) {
        if (data.length > 2048) {
          safeSend(clientWs, { type: 'error', message: '语音识别控制消息过大。' });
          clientWs.close(1009, 'ASR control message too large');
          return;
        }
        const result = handleClientTextMessage({ data, user, upstream, upstreamOpen, pendingPackets });
        if (result.started) started = true;
        return;
      }
      const limitCheck = validateAsrAudioChunk({ chunkBytes: data.length, totalAudioBytes, limits });
      if (!limitCheck.ok) {
        safeSend(clientWs, { type: 'error', message: limitCheck.message });
        clientWs.close(limitCheck.closeCode, limitCheck.message);
        return;
      }
      totalAudioBytes += data.length;
      handleClientAudioMessage({ data, started, clientWs, upstream, upstreamOpen, pendingPackets });
    } catch (error) {
      safeSend(clientWs, { type: 'error', message: error.message || '语音识别请求处理失败。' });
    }
  };

  ready = true;
  for (const { data, isBinary } of earlyMessageQueue) onClientMessage(data, isBinary);
}

export function attachAsrWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname !== '/api/asr/stream') return;
    if (!isAllowedAsrOrigin(req.headers.origin)) {
      logInfo('asr_websocket_origin_rejected', { origin: req.headers.origin || '' });
      rejectUpgrade(socket, 403, 'Forbidden');
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
  wss.on('connection', handleAsrClient);
  logInfo('asr_websocket_attached', { path: '/api/asr/stream' });
  return wss;
}
