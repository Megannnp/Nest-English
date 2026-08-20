import { getAICircuitMetrics, getAIRequestMetrics } from './aiProviderService.js';
import { getAuditMetrics } from './auditMetrics.js';
import { getFeedbackGenerationMetrics } from './feedbackService.js';
import { getQuestionAnalysisObservabilityMetrics } from './questionAnalysisQueueService.js';
import { getDatabaseHealth, getDatabaseInitMode, isDatabaseReady } from '../db/database.js';

function isDevEnv(env = process.env) {
  return env.NODE_ENV !== 'production';
}

export function getInternalObservabilityConfig(env = process.env) {
  const explicitEnabled = String(env.INTERNAL_METRICS_ENABLED || '').trim() === '1';
  const dev = isDevEnv(env);
  return {
    enabled: dev ? true : explicitEnabled,
    explicit: explicitEnabled,
    mode: dev ? 'dev_default' : (explicitEnabled ? 'explicit_enabled' : 'disabled'),
  };
}

export function isInternalObservabilityEnabled(env = process.env) {
  return getInternalObservabilityConfig(env).enabled;
}

export function getDeploymentModeSnapshot(env = process.env) {
  const dev = isDevEnv(env);
  const embeddedWorkerEnabled = env.QUESTION_ANALYSIS_EMBEDDED_WORKER === '1'
    || (env.QUESTION_ANALYSIS_EMBEDDED_WORKER == null && dev);
  return {
    databaseInitMode: getDatabaseInitMode(),
    workerMode: embeddedWorkerEnabled ? 'embedded' : 'external',
    embeddedWorkerEnabled,
    internalMetrics: getInternalObservabilityConfig(env),
  };
}

export function buildObservabilitySnapshot() {
  return {
    timestamp: Date.now(),
    ready: isDatabaseReady(),
    service: {
      env: process.env.NODE_ENV || 'development',
      uptimeSec: Math.round(process.uptime()),
      nodeVersion: process.version,
      pid: process.pid,
    },
    deployment: getDeploymentModeSnapshot(),
    database: getDatabaseHealth(),
    ai: {
      provider: process.env.AI_PROVIDER || 'volcengine',
      model: process.env.AI_DEFAULT_MODEL || '',
      streamSupport: true,
      circuits: getAICircuitMetrics(),
      requests: getAIRequestMetrics(),
    },
    feedback: {
      generation: getFeedbackGenerationMetrics(),
    },
    questionAnalysis: getQuestionAnalysisObservabilityMetrics(),
    audit: getAuditMetrics(),
  };
}

export function buildObservabilityMetricsSnapshot() {
  const snapshot = buildObservabilitySnapshot();
  return {
    timestamp: snapshot.timestamp,
    ready: snapshot.ready,
    deployment: snapshot.deployment,
    ai: snapshot.ai,
    feedback: snapshot.feedback,
    questionAnalysis: snapshot.questionAnalysis,
    audit: snapshot.audit,
  };
}
