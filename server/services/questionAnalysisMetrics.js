function createQueueMetricState() {
  return {
    queued: 0,
    started: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
    deadLettered: 0,
    retryAttempts: [],
    durations: [],
  };
}

const QUESTION_ANALYSIS_METRICS = createQueueMetricState();
const HISTORY_LIMIT = 200;

function pushSample(list, value) {
  if (!Number.isFinite(value) || value < 0) return;
  list.push(value);
  if (list.length > HISTORY_LIMIT) {
    list.splice(0, list.length - HISTORY_LIMIT);
  }
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

export function recordQuestionAnalysisMetric(event, payload = {}) {
  QUESTION_ANALYSIS_METRICS.queued += event === 'queued' ? 1 : 0;
  QUESTION_ANALYSIS_METRICS.started += event === 'started' ? 1 : 0;
  QUESTION_ANALYSIS_METRICS.succeeded += event === 'succeeded' ? 1 : 0;
  QUESTION_ANALYSIS_METRICS.failed += event === 'failed' ? 1 : 0;
  QUESTION_ANALYSIS_METRICS.retried += event === 'retry_scheduled' ? 1 : 0;
  QUESTION_ANALYSIS_METRICS.deadLettered += event === 'dead_lettered' ? 1 : 0;
  pushSample(QUESTION_ANALYSIS_METRICS.retryAttempts, Number(payload.retryCount || payload.attempts || 0));
  pushSample(QUESTION_ANALYSIS_METRICS.durations, Number(payload.durationMs || 0));
}

export function getQuestionAnalysisProcessingMetrics() {
  const totalFinished = QUESTION_ANALYSIS_METRICS.succeeded + QUESTION_ANALYSIS_METRICS.failed + QUESTION_ANALYSIS_METRICS.deadLettered;
  return {
    queued: QUESTION_ANALYSIS_METRICS.queued,
    started: QUESTION_ANALYSIS_METRICS.started,
    succeeded: QUESTION_ANALYSIS_METRICS.succeeded,
    failed: QUESTION_ANALYSIS_METRICS.failed,
    retried: QUESTION_ANALYSIS_METRICS.retried,
    deadLettered: QUESTION_ANALYSIS_METRICS.deadLettered,
    successRate: totalFinished ? Number((QUESTION_ANALYSIS_METRICS.succeeded / totalFinished).toFixed(4)) : null,
    retryRate: QUESTION_ANALYSIS_METRICS.queued ? Number((QUESTION_ANALYSIS_METRICS.retried / QUESTION_ANALYSIS_METRICS.queued).toFixed(4)) : null,
    retryAttempts: {
      p50: percentile(QUESTION_ANALYSIS_METRICS.retryAttempts, 0.5),
      p90: percentile(QUESTION_ANALYSIS_METRICS.retryAttempts, 0.9),
      max: QUESTION_ANALYSIS_METRICS.retryAttempts.length ? Math.max(...QUESTION_ANALYSIS_METRICS.retryAttempts) : null,
    },
    latencyMs: {
      p50: percentile(QUESTION_ANALYSIS_METRICS.durations, 0.5),
      p90: percentile(QUESTION_ANALYSIS_METRICS.durations, 0.9),
      p95: percentile(QUESTION_ANALYSIS_METRICS.durations, 0.95),
    },
  };
}
