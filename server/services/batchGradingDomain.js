import { ValidationError } from '../utils/appError.js';

export function parseBatchGradingJson(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeBatchGradingResultArrays(result) {
  return {
    categories: Array.isArray(result?.categories) ? result.categories : [],
    weaknesses: Array.isArray(result?.weaknesses) ? result.weaknesses : [],
    mainProblems: Array.isArray(result?.mainProblems) ? result.mainProblems : [],
    improvements: Array.isArray(result?.improvements) ? result.improvements : [],
    nextActions: Array.isArray(result?.nextActions) ? result.nextActions : [],
  };
}

function normalizeBatchGradingResultMeta(result) {
  return {
    totalScore: result?.totalScore ?? null,
    tier: result?.tier || '',
    summary: result?.summary || '',
    highlights: result?.highlights && typeof result.highlights === 'object' ? result.highlights : {},
    writingType: result?.writingType || '',
  };
}

function normalizeBatchGradingItemTimestamps(row) {
  return {
    createdAt: Number(row.created_at || 0) || null,
    updatedAt: Number(row.updated_at || 0) || null,
    startedAt: Number(row.started_at || 0) || null,
    finishedAt: Number(row.finished_at || 0) || null,
    lastHeartbeatAt: Number(row.last_heartbeat_at || 0) || null,
  };
}

function normalizeBatchGradingItemBase(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    writingId: row.writing_id,
    studentName: row.student_name || '',
    sortOrder: Number(row.sort_order || 0),
    status: row.status,
    attempts: Number(row.attempts || 0),
    errorCode: row.error_code || '',
    errorMessage: row.error_message || '',
  };
}

function normalizeBatchGradingResult(row) {
  const result = parseBatchGradingJson(row.result, {});
  return {
    result,
    ...normalizeBatchGradingResultMeta(result),
    ...normalizeBatchGradingResultArrays(result),
  };
}

export function mapBatchGradingItemRow(row) {
  return {
    ...normalizeBatchGradingItemBase(row),
    ...normalizeBatchGradingResult(row),
    ...normalizeBatchGradingItemTimestamps(row),
  };
}

function normalizeBatchGradingJobCounts(row) {
  return {
    totalCount: Number(row.total_count || 0),
    processedCount: Number(row.processed_count || 0),
    successCount: Number(row.success_count || 0),
    failedCount: Number(row.failed_count || 0),
  };
}

function normalizeBatchGradingJobTimestamps(row) {
  return {
    createdAt: Number(row.created_at || 0) || null,
    updatedAt: Number(row.updated_at || 0) || null,
    startedAt: Number(row.started_at || 0) || null,
    finishedAt: Number(row.finished_at || 0) || null,
    lastHeartbeatAt: Number(row.last_heartbeat_at || 0) || null,
  };
}

export function mapBatchGradingJobRow(row, items = []) {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    classId: row.class_id || '',
    assignmentId: row.assignment_id || '',
    status: row.status,
    queueName: row.queue_name || '',
    payload: parseBatchGradingJson(row.payload, {}),
    errorMessage: row.error_message || '',
    ...normalizeBatchGradingJobCounts(row),
    ...normalizeBatchGradingJobTimestamps(row),
    items,
  };
}

export function mapBatchGradingJobDetail(row, itemRows = []) {
  if (!row) return null;
  return mapBatchGradingJobRow(row, itemRows.map(mapBatchGradingItemRow));
}

export function mapBatchGradingJobList(rows = [], itemRowsByJobId = {}) {
  return rows.map((row) => mapBatchGradingJobDetail(row, itemRowsByJobId[row.id] || []));
}

export function normalizeBatchGradingJobListLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 10;
  return Math.min(parsed, 30);
}

export function normalizeBatchGradingJobListFilter(value) {
  const normalized = String(value || 'active').trim().toLowerCase();
  if (['active', 'paused', 'completed', 'all'].includes(normalized)) {
    return normalized;
  }
  return 'active';
}

export function normalizeOptionalBatchJobScope(value) {
  const normalized = String(value || '').trim();
  return normalized || '';
}

export function buildBatchGradingJobListFilter(filter, jobStatus, legacyCancelledStatus) {
  const normalizedFilter = normalizeBatchGradingJobListFilter(filter);
  if (normalizedFilter === 'paused') {
    return {
      clause: 'AND status = ?',
      params: [jobStatus.PAUSED],
    };
  }
  if (normalizedFilter === 'completed') {
    return {
      clause: 'AND status IN (?, ?, ?, ?, ?)',
      params: [
        jobStatus.COMPLETED,
        jobStatus.PARTIAL_FAILED,
        jobStatus.FAILED,
        jobStatus.CANCELED,
        legacyCancelledStatus,
      ],
    };
  }
  if (normalizedFilter === 'all') {
    return { clause: '', params: [] };
  }
  return {
    clause: 'AND status IN (?, ?, ?, ?)',
    params: [
      jobStatus.PENDING,
      jobStatus.RUNNING,
      jobStatus.PAUSING,
      jobStatus.CANCELING,
    ],
  };
}

export function classifyBatchGradingFailure(error, itemErrorCode) {
  const message = String(error?.message || error || '').toLowerCase();
  const code = String(error?.code || error?.errorCode || '').toUpperCase();
  if (code === 'AI_BUDGET_EXCEEDED' || /预算|budget/.test(message)) {
    return itemErrorCode.AI_BUDGET_EXCEEDED;
  }
  if (/timeout|timed out|超时/.test(message)) {
    return itemErrorCode.AI_TIMEOUT;
  }
  if (code === 'VALIDATION_ERROR' || error instanceof ValidationError || /校验|validation|不匹配|不存在|缺少/.test(message)) {
    return itemErrorCode.VALIDATION_ERROR;
  }
  return itemErrorCode.PROVIDER_ERROR;
}

export function recordBatchGradingFailureMetric(errorCode, payload = {}, { recordMetric, itemErrorCode }) {
  if (errorCode === itemErrorCode.AI_BUDGET_EXCEEDED) {
    recordMetric('budget_exceeded', payload);
    return;
  }
  recordMetric('ai_failed', { ...payload, reason: errorCode });
}

function isBatchJobStatusIn(currentStatus, allowedStatuses = []) {
  return allowedStatuses.includes(currentStatus);
}

function isBatchJobActivelyTransitioning(currentStatus, jobStatus) {
  return isBatchJobStatusIn(currentStatus, [
    jobStatus.RUNNING,
    jobStatus.PAUSING,
    jobStatus.CANCELING,
  ]);
}

function canPauseBatchJob(currentStatus, jobStatus) {
  return isBatchJobStatusIn(currentStatus, [jobStatus.PENDING, jobStatus.RUNNING]);
}

function canResumeBatchJob(currentStatus, jobStatus) {
  return isBatchJobStatusIn(currentStatus, [jobStatus.PAUSED, jobStatus.PAUSING]);
}

function isFinalCanceledOrCompletedStatus(currentStatus, jobStatus, legacyCancelledStatus) {
  return isBatchJobStatusIn(currentStatus, [
    jobStatus.CANCELED,
    legacyCancelledStatus,
    jobStatus.COMPLETED,
  ]);
}

export function resolvePauseBatchGradingJobStatus(currentStatus, hasRunning, jobStatus) {
  if (!canPauseBatchJob(currentStatus, jobStatus)) {
    return null;
  }
  return currentStatus === jobStatus.RUNNING && hasRunning
    ? jobStatus.PAUSING
    : jobStatus.PAUSED;
}

export function resolveResumeBatchGradingJobStatus(currentStatus, jobStatus) {
  if (!canResumeBatchJob(currentStatus, jobStatus)) {
    return null;
  }
  return jobStatus.PENDING;
}

export function resolveCancelBatchGradingJobStatus(currentStatus, hasRunning, jobStatus, legacyCancelledStatus) {
  if (isFinalCanceledOrCompletedStatus(currentStatus, jobStatus, legacyCancelledStatus)) {
    return null;
  }
  return hasRunning ? jobStatus.CANCELING : jobStatus.CANCELED;
}

export function canRetryFailedBatchItems(currentStatus, jobStatus) {
  return !isBatchJobActivelyTransitioning(currentStatus, jobStatus);
}

export function canContinueIncompleteBatchItems(currentStatus, jobStatus) {
  return !isBatchJobActivelyTransitioning(currentStatus, jobStatus);
}
