import { logInfo } from '../../utils/logger.js';

const QUICK_METRIC_HISTORY_LIMIT = 200;

function createFeedbackMetricBucket() {
  return {
    total: 0,
    success: 0,
    failed: 0,
    timeout: 0,
    invalidJson: 0,
    durations: [],
    inputChars: [],
  };
}

const quickFeedbackMetrics = createFeedbackMetricBucket();
const detailedFeedbackMetrics = createFeedbackMetricBucket();

const FEEDBACK_METRIC_BUCKETS = {
  quick: quickFeedbackMetrics,
  detailed: detailedFeedbackMetrics,
};

function getFeedbackMetricBucket(scope = 'quick') {
  return FEEDBACK_METRIC_BUCKETS[scope] || quickFeedbackMetrics;
}

function summarizeFeedbackMetricBucket(metric) {
  const successRate = metric.total > 0
    ? Number((metric.success / metric.total).toFixed(4))
    : null;
  const timeoutRate = metric.total > 0
    ? Number((metric.timeout / metric.total).toFixed(4))
    : null;
  const invalidJsonRate = metric.total > 0
    ? Number((metric.invalidJson / metric.total).toFixed(4))
    : null;

  return {
    total: metric.total,
    success: metric.success,
    failed: metric.failed,
    timeout: metric.timeout,
    invalidJson: metric.invalidJson,
    successRate,
    timeoutRate,
    invalidJsonRate,
    latencyMs: {
      p50: percentile(metric.durations, 0.5),
      p90: percentile(metric.durations, 0.9),
      p95: percentile(metric.durations, 0.95),
    },
    inputChars: {
      avg: metric.inputChars.length
        ? Math.round(metric.inputChars.reduce((sum, value) => sum + value, 0) / metric.inputChars.length)
        : null,
      p50: percentile(metric.inputChars, 0.5),
      p90: percentile(metric.inputChars, 0.9),
      p95: percentile(metric.inputChars, 0.95),
    },
  };
}

function pushMetricSample(list, value) {
  if (!Number.isFinite(value) || value < 0) return;
  list.push(value);
  if (list.length > QUICK_METRIC_HISTORY_LIMIT) {
    list.splice(0, list.length - QUICK_METRIC_HISTORY_LIMIT);
  }
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function logQuickFeedbackMetric(event, payload = {}) {
  logInfo('quick_feedback_metric', {
    event,
    at: Date.now(),
    ...payload,
  });
}

export function summarizeInputMetrics(userContent) {
  if (typeof userContent === 'string') {
    return { totalChars: userContent.length, hasImage: false };
  }
  if (!Array.isArray(userContent)) {
    return { totalChars: 0, hasImage: false };
  }
  const totalChars = userContent.reduce((sum, item) => {
    if (item?.type === 'text') return sum + String(item.text || '').length;
    if (item?.type === 'image_url') return sum + 256;
    return sum;
  }, 0);
  return {
    totalChars,
    hasImage: userContent.some((item) => item?.type === 'image_url'),
  };
}

export function recordFeedbackGenerationOutcome(scope, event, payload = {}) {
  const metric = getFeedbackMetricBucket(scope);
  metric.total += event === 'queued' ? 1 : 0;
  metric.success += event === 'succeeded' ? 1 : 0;
  metric.failed += event === 'failed' ? 1 : 0;
  metric.timeout += event === 'timeout' ? 1 : 0;
  metric.invalidJson += event === 'invalid_json' ? 1 : 0;
  pushMetricSample(metric.durations, Number(payload.durationMs || 0));
  pushMetricSample(metric.inputChars, Number(payload.inputChars || 0));
  logQuickFeedbackMetric(event, {
    scope,
    ...payload,
  });
}

export function recordQuickFeedbackOutcome(event, payload = {}) {
  recordFeedbackGenerationOutcome('quick', event, payload);
}

export function getQuickFeedbackMetrics() {
  return summarizeFeedbackMetricBucket(quickFeedbackMetrics);
}

export function getFeedbackGenerationMetrics() {
  return {
    quick: summarizeFeedbackMetricBucket(quickFeedbackMetrics),
    detailed: summarizeFeedbackMetricBucket(detailedFeedbackMetrics),
  };
}
