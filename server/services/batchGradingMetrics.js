const HISTORY_LIMIT = 200;

function createBatchGradingMetricState() {
  return {
    userCanceled: 0,
    aiFailed: 0,
    budgetExceeded: 0,
    recoverySucceeded: 0,
    recoveryFailed: 0,
    failureReasons: {},
    durations: [],
  };
}

const BATCH_GRADING_METRICS = createBatchGradingMetricState();

function pushSample(list, value) {
  if (!Number.isFinite(value) || value < 0) return;
  list.push(value);
  if (list.length > HISTORY_LIMIT) {
    list.splice(0, list.length - HISTORY_LIMIT);
  }
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function normalizeReason(reason) {
  return String(reason || 'unknown').slice(0, 80);
}

export function recordBatchGradingMetric(event, payload = {}) {
  BATCH_GRADING_METRICS.userCanceled += event === 'user_canceled' ? 1 : 0;
  BATCH_GRADING_METRICS.aiFailed += event === 'ai_failed' ? 1 : 0;
  BATCH_GRADING_METRICS.budgetExceeded += event === 'budget_exceeded' ? 1 : 0;
  BATCH_GRADING_METRICS.recoverySucceeded += event === 'recovery_succeeded' ? 1 : 0;
  BATCH_GRADING_METRICS.recoveryFailed += event === 'recovery_failed' ? 1 : 0;
  pushSample(BATCH_GRADING_METRICS.durations, Number(payload.durationMs || 0));
  if (payload.reason || payload.errorCode) {
    const reason = normalizeReason(payload.reason || payload.errorCode);
    BATCH_GRADING_METRICS.failureReasons[reason] = Number(BATCH_GRADING_METRICS.failureReasons[reason] || 0) + 1;
  }
}

export function getBatchGradingMetrics() {
  return {
    userCanceled: BATCH_GRADING_METRICS.userCanceled,
    aiFailed: BATCH_GRADING_METRICS.aiFailed,
    budgetExceeded: BATCH_GRADING_METRICS.budgetExceeded,
    recoverySucceeded: BATCH_GRADING_METRICS.recoverySucceeded,
    recoveryFailed: BATCH_GRADING_METRICS.recoveryFailed,
    latencyMs: {
      avg: BATCH_GRADING_METRICS.durations.length
        ? Math.round(BATCH_GRADING_METRICS.durations.reduce((sum, value) => sum + value, 0) / BATCH_GRADING_METRICS.durations.length)
        : null,
      p50: percentile(BATCH_GRADING_METRICS.durations, 0.5),
      p90: percentile(BATCH_GRADING_METRICS.durations, 0.9),
      p95: percentile(BATCH_GRADING_METRICS.durations, 0.95),
    },
    failureReasons: { ...BATCH_GRADING_METRICS.failureReasons },
  };
}
