const DEFAULT_AI_METRIC_SCOPE = 'general';
// In-process store: metrics reset on restart and are not shared across instances.
// To support multi-instance deployments, migrate to a shared store (e.g. Redis).
const AI_OPERATION_METRICS = new Map();

function getOperationMetric(scope = DEFAULT_AI_METRIC_SCOPE) {
  const key = String(scope || DEFAULT_AI_METRIC_SCOPE);
  if (!AI_OPERATION_METRICS.has(key)) {
    AI_OPERATION_METRICS.set(key, {
      total: 0,
      success: 0,
      failure: 0,
      durations: [],
    });
  }
  return AI_OPERATION_METRICS.get(key);
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

export function recordAIOperation(scope, outcome, durationMs = 0) {
  const metric = getOperationMetric(scope);
  metric.total += 1;
  if (outcome === 'success') metric.success += 1;
  if (outcome === 'failure') metric.failure += 1;
  if (Number.isFinite(durationMs) && durationMs >= 0) {
    metric.durations.push(durationMs);
    if (metric.durations.length > 1000) {
      metric.durations.splice(0, metric.durations.length - 1000);
    }
  }
}

export function getAIRequestMetrics() {
  const entries = {};
  for (const [scope, metric] of AI_OPERATION_METRICS.entries()) {
    entries[scope] = {
      total: metric.total,
      success: metric.success,
      failure: metric.failure,
      successRate: metric.total ? Number((metric.success / metric.total).toFixed(4)) : null,
      failureRate: metric.total ? Number((metric.failure / metric.total).toFixed(4)) : null,
      latencyMs: {
        p50: percentile(metric.durations, 0.5),
        p90: percentile(metric.durations, 0.9),
        p95: percentile(metric.durations, 0.95),
      },
    };
  }
  return entries;
}
