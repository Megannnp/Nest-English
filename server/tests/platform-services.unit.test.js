import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { getMissingProductionEnv, validateProductionEnv } from '../config/validateEnv.js';
import { runVersionedMigrations } from '../db/migrations/runner.js';
import { getAIRequestMetrics, recordAIOperation } from '../services/aiProvider/metrics.js';
import {
  normalizeAIRequestPayload,
  normalizeWritingType,
  parseAIJsonPayload,
  tryRepairJsonText,
} from '../services/aiService.js';
import { getAuditMetrics } from '../services/auditMetrics.js';
import {
  getFeedbackGenerationMetrics,
  recordFeedbackGenerationOutcome,
} from '../services/feedback/metrics.js';
import {
  buildObservabilityMetricsSnapshot,
  buildObservabilitySnapshot,
  getDeploymentModeSnapshot,
  getInternalObservabilityConfig,
} from '../services/observabilityService.js';
import {
  getQuestionAnalysisProcessingMetrics,
  recordQuestionAnalysisMetric,
} from '../services/questionAnalysisMetrics.js';
import { buildAlertPayload } from '../utils/alertTemplates.js';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../utils/appError.js';
import { logAudit, logError } from '../utils/logger.js';

test('AppError subclasses expose stable status and error codes', () => {
  assert.equal(new ValidationError('bad').status, 400);
  assert.equal(new ValidationError('bad').code, 'VALIDATION_ERROR');
  assert.equal(new NotFoundError('missing').status, 404);
  assert.equal(new ConflictError('conflict').status, 409);

  const custom = new AppError('upstream failed', {
    status: 502,
    code: 'UPSTREAM_FAILED',
    expose: false,
  });
  assert.equal(custom.status, 502);
  assert.equal(custom.code, 'UPSTREAM_FAILED');
  assert.equal(custom.expose, false);
});

test('aiService facade keeps request normalization and JSON repair stable', () => {
  const payload = normalizeAIRequestPayload({
    messages: Array.from({ length: 20 }, (_, index) => ({ role: 'user', content: String(index) })),
    max_tokens: 999999,
    temperature: 9,
    persistWritingId: ' writing-1 ',
  });

  assert.equal(payload.messages.length, 12);
  assert.equal(payload.max_tokens, 8192);
  assert.equal(payload.temperature, 1.2);
  assert.equal(payload.persistWritingId, 'writing-1');
  assert.equal(payload.persistMode, 'grading');
  assert.equal(normalizeWritingType('UNKNOWN'), 'general');

  const repaired = tryRepairJsonText('```json\n{"ok": true,\n```');
  assert.deepEqual(JSON.parse(repaired), { ok: true });
  assert.deepEqual(parseAIJsonPayload('prefix {"score": 1} suffix'), { score: 1 });
});

test('runVersionedMigrations records only pending migrations', async () => {
  const appliedVersions = new Set(['001']);
  const inserts = [];
  const executed = [];
  const pool = {
    async query(sql, params = []) {
      if (sql.includes('SELECT version FROM schema_migrations')) {
        return [[...appliedVersions].map((version) => ({ version }))];
      }
      if (sql.includes('INSERT INTO schema_migrations')) {
        appliedVersions.add(params[0]);
        inserts.push(params[0]);
        return [{}];
      }
      return [[]];
    },
  };

  await runVersionedMigrations(pool, [
    { version: '001', name: 'already applied', async up() { executed.push('001'); } },
    { version: '002', name: 'new migration', async up() { executed.push('002'); } },
  ]);

  assert.deepEqual(executed, ['002']);
  assert.deepEqual(inserts, ['002']);
});

test('validateProductionEnv reports missing production secrets together', () => {
  const env = {
    NODE_ENV: 'production',
    DB_INIT_MODE: 'connect',
    MYSQL_PASSWORD: '',
    JWT_SECRET: '',
    REDIS_URL: 'redis://127.0.0.1:6379',
    SMTP_HOST: 'smtp.example.com',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM_EMAIL: 'noreply@example.com',
    AI_DEFAULT_MODEL: 'model',
    AI_API_KEY: 'key',
    MANUAL_PAYMENT_QR_URL: '',
  };

  assert.deepEqual(getMissingProductionEnv(env), ['MYSQL_PASSWORD', 'JWT_SECRET', 'MANUAL_PAYMENT_QR_URL']);
  assert.throws(() => validateProductionEnv(env), /MYSQL_PASSWORD, JWT_SECRET, MANUAL_PAYMENT_QR_URL/);
});

test('validateProductionEnv accepts complete production config and valid init mode', () => {
  const env = {
    NODE_ENV: 'production',
    DB_INIT_MODE: 'connect',
    INTERNAL_METRICS_ENABLED: '1',
    QUESTION_ANALYSIS_EMBEDDED_WORKER: '0',
    MYSQL_PASSWORD: 'password',
    JWT_SECRET: 'secret',
    REDIS_URL: 'redis://127.0.0.1:6379',
    SMTP_HOST: 'smtp.example.com',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM_EMAIL: 'noreply@example.com',
    AI_DEFAULT_MODEL: 'model',
    AI_API_KEY: 'key',
    MANUAL_PAYMENT_QR_URL: 'https://example.com/pay.png',
  };

  assert.deepEqual(validateProductionEnv(env), { ok: true, skipped: false, missing: [] });
});

test('validateProductionEnv rejects invalid internal metrics and worker flags', () => {
  const env = {
    NODE_ENV: 'production',
    DB_INIT_MODE: 'connect',
    INTERNAL_METRICS_ENABLED: 'yes',
    QUESTION_ANALYSIS_EMBEDDED_WORKER: '2',
    MYSQL_PASSWORD: 'password',
    JWT_SECRET: 'secret',
    REDIS_URL: 'redis://127.0.0.1:6379',
    SMTP_HOST: 'smtp.example.com',
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM_EMAIL: 'noreply@example.com',
    AI_DEFAULT_MODEL: 'model',
    AI_API_KEY: 'key',
    MANUAL_PAYMENT_QR_URL: 'https://example.com/pay.png',
  };

  assert.throws(() => validateProductionEnv(env), /INTERNAL_METRICS_ENABLED 只能是 0 或 1/);
});

test('feedback, ai and queue metrics expose stable observability summaries', () => {
  recordFeedbackGenerationOutcome('quick', 'queued', { inputChars: 120 });
  recordFeedbackGenerationOutcome('quick', 'succeeded', { durationMs: 320, inputChars: 120 });
  recordFeedbackGenerationOutcome('detailed', 'queued', { inputChars: 240 });
  recordFeedbackGenerationOutcome('detailed', 'failed', { durationMs: 860, inputChars: 240 });
  recordQuestionAnalysisMetric('queued', { retryCount: 0 });
  recordQuestionAnalysisMetric('retry_scheduled', { attempts: 2, durationMs: 500 });
  recordQuestionAnalysisMetric('dead_lettered', { attempts: 3, durationMs: 900 });
  recordAIOperation('grading', 'success', 180);
  recordAIOperation('grading', 'failure', 420);

  const feedbackMetrics = getFeedbackGenerationMetrics();
  const queueMetrics = getQuestionAnalysisProcessingMetrics();
  const aiMetrics = getAIRequestMetrics();

  assert.equal(feedbackMetrics.quick.total >= 1, true);
  assert.equal(feedbackMetrics.quick.success >= 1, true);
  assert.equal(feedbackMetrics.detailed.failed >= 1, true);
  assert.equal(queueMetrics.retried >= 1, true);
  assert.equal(queueMetrics.deadLettered >= 1, true);
  assert.equal(aiMetrics.grading.total >= 2, true);
  assert.equal(typeof aiMetrics.grading.failureRate, 'number');
});

test('observability snapshot exposes internal health and metrics shape', () => {
  const detail = buildObservabilitySnapshot();
  const metrics = buildObservabilityMetricsSnapshot();

  assert.equal(typeof detail.timestamp, 'number');
  assert.equal(typeof detail.ready, 'boolean');
  assert.equal(typeof detail.service.uptimeSec, 'number');
  assert.equal(typeof detail.database.config.initMode, 'string');
  assert.equal(typeof detail.deployment.databaseInitMode, 'string');
  assert.equal(typeof detail.deployment.workerMode, 'string');
  assert.ok(detail.ai);
  assert.ok(detail.feedback.generation);
  assert.ok(detail.questionAnalysis.queue);
  assert.ok(detail.audit);

  assert.equal(typeof metrics.timestamp, 'number');
  assert.ok(metrics.deployment);
  assert.ok(metrics.ai);
  assert.ok(metrics.feedback);
  assert.ok(metrics.questionAnalysis);
  assert.ok(metrics.audit);
});

test('internal observability config is explicit in production-style env', () => {
  const disabled = getInternalObservabilityConfig({
    NODE_ENV: 'production',
    INTERNAL_METRICS_ENABLED: '0',
  });
  const enabled = getInternalObservabilityConfig({
    NODE_ENV: 'production',
    INTERNAL_METRICS_ENABLED: '1',
  });
  const deployment = getDeploymentModeSnapshot({
    NODE_ENV: 'production',
    INTERNAL_METRICS_ENABLED: '1',
    QUESTION_ANALYSIS_EMBEDDED_WORKER: '0',
  });

  assert.equal(typeof disabled.enabled, 'boolean');
  assert.equal(typeof enabled.enabled, 'boolean');
  assert.equal(typeof deployment.workerMode, 'string');
  assert.equal(typeof deployment.internalMetrics.explicit, 'boolean');
});

test('audit metrics aggregate error and rate-limit style events', () => {
  logAudit('rate_limit_exceeded', {
    requestId: 'req-audit',
    path: '/api/ai/complete',
    userId: 'user-1',
    role: 'student',
  });
  logError('request_error', {
    requestId: 'req-error',
    path: '/api/writings',
    statusCode: 500,
  });

  const metrics = getAuditMetrics();
  assert.equal(metrics.byEvent.rate_limit_exceeded >= 1, true);
  assert.equal(metrics.byEvent.request_error >= 1, true);
  assert.equal(metrics.byLevel.audit >= 1, true);
  assert.equal(metrics.byLevel.error >= 1, true);
  assert.equal(metrics.recent.some((item) => item.requestId === 'req-audit'), true);
});

test('alert templates produce readable summaries for important events', () => {
  const requestError = buildAlertPayload({
    level: 'error',
    event: 'request_error',
    payload: {
      method: 'POST',
      path: '/api/writings',
      message: '数据库写入失败',
      requestId: 'req-1',
    },
    line: '{}',
  });
  const rateLimit = buildAlertPayload({
    level: 'audit',
    event: 'rate_limit_exceeded',
    payload: {
      scope: 'ai',
      method: 'POST',
      path: '/api/ai/complete',
      ip: '127.0.0.1',
    },
    line: '{}',
  });
  const databaseInit = buildAlertPayload({
    level: 'error',
    event: 'database_init_failed',
    payload: {
      initMode: 'migrate',
      message: 'connect ECONNREFUSED',
    },
    line: '{}',
  });
  const aiRetry = buildAlertPayload({
    level: 'warn',
    event: 'ai_retry_attempt',
    payload: {
      label: 'AI 非流式请求',
      attempt: 1,
      maxAttempts: 2,
      canRetry: true,
      message: '请求失败 [503]',
    },
    line: '{}',
  });

  assert.equal(requestError.title, 'NEST 请求异常');
  assert.match(requestError.summary, /POST \/api\/writings/);
  assert.equal(rateLimit.title, 'NEST 限流命中');
  assert.match(rateLimit.summary, /scope=ai/);
  assert.equal(databaseInit.title, 'NEST 数据库初始化失败');
  assert.match(databaseInit.summary, /initMode=migrate/);
  assert.equal(aiRetry.title, 'NEST AI 调用重试');
  assert.match(aiRetry.summary, /attempt=1 \/ 2/);
});
