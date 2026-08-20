import fs from 'node:fs';
import path from 'node:path';

import { buildAlertPayload } from './alertTemplates.js';
import { recordAuditMetric } from '../services/auditMetrics.js';

const LOG_TO_FILE = process.env.LOG_TO_FILE === '1';
const LOG_WEBHOOK_ENABLED = process.env.LOG_WEBHOOK_ENABLED === '1';
const LOG_WEBHOOK_URL = String(process.env.LOG_WEBHOOK_URL || '').trim();
const LOG_WEBHOOK_MIN_LEVEL = String(process.env.LOG_WEBHOOK_MIN_LEVEL || 'error').trim().toLowerCase();
const LOG_DIR = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : path.resolve(process.cwd(), 'logs');
const LEVEL_PRIORITY = {
  info: 1,
  warn: 2,
  audit: 2,
  error: 3,
};

function serializeLog(level, event, payload = {}) {
  return JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

function resolveLogFilePath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `server-${date}.log`);
}

function writeFileLog(line) {
  if (!LOG_TO_FILE) return;
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(resolveLogFilePath(), `${line}\n`, 'utf8');
  } catch { /* intentional */ }
}

function shouldSendWebhook(level) {
  if (!LOG_WEBHOOK_ENABLED || !LOG_WEBHOOK_URL) return false;
  return (LEVEL_PRIORITY[level] || 0) >= (LEVEL_PRIORITY[LOG_WEBHOOK_MIN_LEVEL] || LEVEL_PRIORITY.error);
}

function writeWebhookLog(level, event, payload, line) {
  if (!shouldSendWebhook(level)) return;
  const body = buildAlertPayload({
    level,
    event,
    payload,
    line,
  });
  queueMicrotask(() => {
    void fetch(LOG_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  });
}

function emitLog(level, event, payload, consoleMethod) {
  const line = serializeLog(level, event, payload);
  consoleMethod(line);
  writeFileLog(line);
  writeWebhookLog(level, event, payload, line);
  if (level === 'error' || level === 'audit') {
    recordAuditMetric({ level, event, payload });
  }
}

export function logInfo(event, payload) {
  emitLog('info', event, payload, console.info);
}

export function logWarn(event, payload) {
  emitLog('warn', event, payload, console.warn);
}

export function logError(event, payload) {
  emitLog('error', event, payload, console.error);
}

export function logAudit(event, payload) {
  emitLog('audit', event, payload, console.info);
}
