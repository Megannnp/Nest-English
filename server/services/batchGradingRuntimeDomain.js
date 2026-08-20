function toFeedbackArray(value) {
  return Array.isArray(value) ? value : [];
}

function toFeedbackObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function resolveFeedbackWritingType(feedback = {}) {
  return feedback?.writingType || feedback?.type || '';
}

export function buildBatchGradingSuccessPayload({ feedback = {}, writingId }) {
  return {
    totalScore: feedback?.totalScore ?? null,
    tier: feedback?.tier ?? '',
    summary: feedback?.summary || '',
    categories: toFeedbackArray(feedback?.categories),
    highlights: toFeedbackObject(feedback?.highlights),
    weaknesses: toFeedbackArray(feedback?.weaknesses),
    mainProblems: toFeedbackArray(feedback?.mainProblems),
    improvements: toFeedbackArray(feedback?.improvements),
    nextActions: toFeedbackArray(feedback?.nextActions),
    writingType: resolveFeedbackWritingType(feedback),
    writingId,
  };
}

export function isPauseRequestedStatus(status, jobStatus) {
  return [jobStatus.PAUSED, jobStatus.PAUSING].includes(status);
}

export function isCancelRequestedStatus(status, jobStatus, legacyCancelledStatus) {
  return [jobStatus.CANCELED, jobStatus.CANCELING, legacyCancelledStatus].includes(status);
}

function hasActiveBatchGradingItems({ hasPending = false, hasRunning = false }) {
  return hasPending || hasRunning;
}

function getBatchGradingFailureCount(row) {
  return Number(row?.failed_count || 0);
}

function getBatchGradingSuccessCount(row) {
  return Number(row?.success_count || 0);
}

function isFullyFailedBatchGradingJob(row) {
  return getBatchGradingFailureCount(row) > 0 && getBatchGradingSuccessCount(row) === 0;
}

function isPartialFailedBatchGradingJob(row, hasCanceled) {
  return getBatchGradingFailureCount(row) > 0 || hasCanceled;
}

export function resolveFinalBatchGradingJobStatus({
  row,
  fallbackStatus = '',
  hasPending = false,
  hasRunning = false,
  hasCanceled = false,
  jobStatus,
  legacyCancelledStatus,
}) {
  if (!row) return fallbackStatus || '';
  if (fallbackStatus) return fallbackStatus;
  if (isPauseRequestedStatus(row.status, jobStatus)) {
    return jobStatus.PAUSED;
  }
  if (isCancelRequestedStatus(row.status, jobStatus, legacyCancelledStatus)) {
    return jobStatus.CANCELED;
  }
  if (hasActiveBatchGradingItems({ hasPending, hasRunning })) {
    return jobStatus.PENDING;
  }
  if (isFullyFailedBatchGradingJob(row)) {
    return jobStatus.FAILED;
  }
  if (isPartialFailedBatchGradingJob(row, hasCanceled)) {
    return jobStatus.PARTIAL_FAILED;
  }
  return jobStatus.COMPLETED;
}
