import { assertAIBudgetAvailable } from './adminControlService.js';
import {
  buildBatchGradingJobListFilter,
  canContinueIncompleteBatchItems,
  canRetryFailedBatchItems,
  classifyBatchGradingFailure as classifyBatchGradingFailureFromDomain,
  mapBatchGradingJobDetail,
  mapBatchGradingJobList,
  normalizeBatchGradingJobListFilter as normalizeBatchGradingJobListFilterFromDomain,
  normalizeBatchGradingJobListLimit as normalizeBatchGradingJobListLimitFromDomain,
  normalizeOptionalBatchJobScope,
  parseBatchGradingJson,
  recordBatchGradingFailureMetric as recordBatchGradingFailureMetricFromDomain,
  resolveCancelBatchGradingJobStatus,
  resolvePauseBatchGradingJobStatus,
  resolveResumeBatchGradingJobStatus,
} from './batchGradingDomain.js';
import { createBatchGradingJobCreator } from './batchGradingJobCreationService.js';
import { recordBatchGradingMetric } from './batchGradingMetrics.js';
import {
  cancelPendingBatchGradingItems,
  hasRunningBatchGradingItems,
  listBatchGradingJobRowsForTeacher,
  loadBatchGradingItemRows,
  loadBatchGradingItemRowsByJobIds,
  loadBatchGradingJobRow,
  loadOwnedBatchGradingJobRow,
  refreshBatchGradingJobCounters,
  resetFailedBatchGradingItems,
  resetIncompleteBatchGradingItems,
  updateBatchGradingJobLifecycle,
  updateBatchGradingJobStatus,
} from './batchGradingRepository.js';
import { createBatchGradingRuntime } from './batchGradingRuntimeService.js';
import { runQuickFeedbackGeneration } from './feedback/quick/generation.js';
import { loadWritingById } from './feedback/repository.js';
import db from '../db/database.js';
import {
  ConflictError,
  NotFoundError,
} from '../utils/appError.js';
import { logError } from '../utils/logger.js';

export const BATCH_GRADING_JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSING: 'pausing',
  PAUSED: 'paused',
  CANCELING: 'canceling',
  CANCELED: 'canceled',
  COMPLETED: 'completed',
  PARTIAL_FAILED: 'partial_failed',
  FAILED: 'failed',
};

export const BATCH_GRADING_ITEM_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled',
};

export const BATCH_GRADING_ITEM_ERROR_CODE = {
  AI_BUDGET_EXCEEDED: 'ai_budget_exceeded',
  AI_TIMEOUT: 'ai_timeout',
  PROVIDER_ERROR: 'provider_error',
  VALIDATION_ERROR: 'validation_error',
  USER_CANCELED: 'user_canceled',
};

const LEGACY_CANCELLED_STATUS = 'cancelled';

const BATCH_GRADING_WORKER_ID = 'batch_grading_worker';
const BATCH_GRADING_POLL_INTERVAL_MS = 1500;
const BATCH_GRADING_RECOVERY_INTERVAL_MS = 30000;
const BATCH_GRADING_STALE_MS = 2 * 60 * 1000;
// AI grading calls take seconds each; processing items one at a time made a
// 50-item batch take 50x a single item's latency. Claim/process a bounded
// number of items concurrently instead — claims are DB-row-atomic so this is safe.
const BATCH_GRADING_ITEM_CONCURRENCY = 4;

async function loadBatchGradingJobDetail(jobId) {
  const row = await loadBatchGradingJobRow(jobId);
  if (!row) return null;
  const itemRows = await loadBatchGradingItemRows(jobId);
  return mapBatchGradingJobDetail(row, itemRows);
}

async function assertTeacherOwnsBatchJob(teacherId, jobId, message = '批量批改任务不存在或无权限访问') {
  const row = await loadOwnedBatchGradingJobRow(jobId, teacherId);

  if (!row) {
    throw new NotFoundError(message);
  }
  return row;
}

export function normalizeBatchGradingJobListLimit(value) {
  return normalizeBatchGradingJobListLimitFromDomain(value);
}

export function normalizeBatchGradingJobListFilter(value) {
  return normalizeBatchGradingJobListFilterFromDomain(value);
}

export async function listBatchGradingJobs({
  teacherId,
  limit = 10,
  filter = 'active',
  classId = '',
  assignmentId = '',
}) {
  const normalizedLimit = normalizeBatchGradingJobListLimit(limit);
  const filterSql = buildBatchGradingJobListFilter(filter, BATCH_GRADING_JOB_STATUS, LEGACY_CANCELLED_STATUS);
  const normalizedClassId = normalizeOptionalBatchJobScope(classId);
  const normalizedAssignmentId = normalizeOptionalBatchJobScope(assignmentId);
  const scopeClauses = [];
  const scopeParams = [];
  if (normalizedClassId) {
    scopeClauses.push('AND class_id = ?');
    scopeParams.push(normalizedClassId);
  }
  if (normalizedAssignmentId) {
    scopeClauses.push('AND assignment_id = ?');
    scopeParams.push(normalizedAssignmentId);
  }
  const rows = await listBatchGradingJobRowsForTeacher({
    teacherId,
    filterClause: filterSql.clause,
    filterParams: filterSql.params,
    scopeClauses,
    scopeParams,
    limit: normalizedLimit,
  });

  const itemRowsByJobId = await loadBatchGradingItemRowsByJobIds(rows.map((row) => row.id));
  return mapBatchGradingJobList(rows, itemRowsByJobId);
}

// ── 创建批量批改任务 ─────────────────────────────────────────────
// 创建作业的校验、数据加载、冲突检测与事务落库已拆分到
// batchGradingJobCreationService.js（createBatchGradingJobCreator）。
// 这里注入状态常量、创建后唤醒 worker 并返回完整任务详情，
// 保持公共 API 行为与旧实现一致。
const createdBatchGradingJob = createBatchGradingJobCreator({
  jobStatus: BATCH_GRADING_JOB_STATUS,
  itemStatus: BATCH_GRADING_ITEM_STATUS,
  workerId: BATCH_GRADING_WORKER_ID,
});

export async function createBatchGradingJob({ teacher, payload }) {
  const { id } = await createdBatchGradingJob({ teacher, payload });
  kickBatchGradingRuntimeWorker();
  return loadBatchGradingJobDetail(id);
}

export async function getBatchGradingJob({ teacherId, jobId }) {
  await assertTeacherOwnsBatchJob(teacherId, jobId);
  return loadBatchGradingJobDetail(jobId);
}

export async function pauseBatchGradingJob({ teacherId, jobId }) {
  const row = await assertTeacherOwnsBatchJob(teacherId, jobId);
  const hasRunning = await hasRunningBatchGradingItems(jobId, BATCH_GRADING_ITEM_STATUS.RUNNING);
  const nextStatus = resolvePauseBatchGradingJobStatus(row.status, Boolean(hasRunning), BATCH_GRADING_JOB_STATUS);
  if (!nextStatus) {
    return loadBatchGradingJobDetail(jobId);
  }
  await updateBatchGradingJobStatus(jobId, nextStatus, Date.now());
  return loadBatchGradingJobDetail(jobId);
}

export async function resumeBatchGradingJob({ teacherId, jobId }) {
  const row = await assertTeacherOwnsBatchJob(teacherId, jobId);
  const nextStatus = resolveResumeBatchGradingJobStatus(row.status, BATCH_GRADING_JOB_STATUS);
  if (!nextStatus) {
    return loadBatchGradingJobDetail(jobId);
  }
  await updateBatchGradingJobLifecycle(jobId, {
    status: nextStatus,
    updatedAt: Date.now(),
    finishedAt: null,
    errorMessage: null,
  });
  kickBatchGradingRuntimeWorker();
  return loadBatchGradingJobDetail(jobId);
}

export async function cancelBatchGradingJob({ teacherId, jobId }) {
  const row = await assertTeacherOwnsBatchJob(teacherId, jobId);
  const now = Date.now();
  const hasRunning = await hasRunningBatchGradingItems(jobId, BATCH_GRADING_ITEM_STATUS.RUNNING);
  const nextStatus = resolveCancelBatchGradingJobStatus(
    row.status,
    Boolean(hasRunning),
    BATCH_GRADING_JOB_STATUS,
    LEGACY_CANCELLED_STATUS
  );
  if (!nextStatus) {
    return loadBatchGradingJobDetail(jobId);
  }
  await updateBatchGradingJobLifecycle(jobId, {
    status: nextStatus,
    updatedAt: now,
    finishedAt: hasRunning ? null : now,
    errorMessage: null,
  });
  await cancelPendingBatchGradingItems(jobId, {
    canceledStatus: BATCH_GRADING_ITEM_STATUS.CANCELED,
    pendingStatus: BATCH_GRADING_ITEM_STATUS.PENDING,
    errorCode: BATCH_GRADING_ITEM_ERROR_CODE.USER_CANCELED,
    errorMessage: '用户已停止，未继续处理',
    now,
  });
  recordBatchGradingMetric('user_canceled', { jobId });
  await refreshBatchGradingJobCounters(jobId, BATCH_GRADING_ITEM_STATUS);
  return loadBatchGradingJobDetail(jobId);
}

export async function retryFailedBatchGradingItems({ teacherId, jobId }) {
  const row = await assertTeacherOwnsBatchJob(teacherId, jobId);
  if (!canRetryFailedBatchItems(row.status, BATCH_GRADING_JOB_STATUS)) {
    throw new ConflictError('批量批改仍在进行中，暂时不能重试失败项');
  }
  const now = Date.now();
  await resetFailedBatchGradingItems(
    jobId,
    BATCH_GRADING_ITEM_STATUS.FAILED,
    BATCH_GRADING_ITEM_STATUS.PENDING,
    now
  );
  await updateBatchGradingJobLifecycle(jobId, {
    status: BATCH_GRADING_JOB_STATUS.PENDING,
    updatedAt: now,
    finishedAt: null,
    errorMessage: null,
  });
  await refreshBatchGradingJobCounters(jobId, BATCH_GRADING_ITEM_STATUS);
  kickBatchGradingRuntimeWorker();
  return loadBatchGradingJobDetail(jobId);
}

export async function continueIncompleteBatchGradingItems({ teacherId, jobId }) {
  const row = await assertTeacherOwnsBatchJob(teacherId, jobId);
  if (!canContinueIncompleteBatchItems(row.status, BATCH_GRADING_JOB_STATUS)) {
    throw new ConflictError('批量批改仍在进行中，暂时不能继续未完成项');
  }
  const now = Date.now();
  await resetIncompleteBatchGradingItems(jobId, {
    pendingStatus: BATCH_GRADING_ITEM_STATUS.PENDING,
    runningStatus: BATCH_GRADING_ITEM_STATUS.RUNNING,
    canceledStatus: BATCH_GRADING_ITEM_STATUS.CANCELED,
    userCanceledCode: BATCH_GRADING_ITEM_ERROR_CODE.USER_CANCELED,
    now,
  });
  await updateBatchGradingJobLifecycle(jobId, {
    status: BATCH_GRADING_JOB_STATUS.PENDING,
    updatedAt: now,
    finishedAt: null,
    errorMessage: null,
  });
  await refreshBatchGradingJobCounters(jobId, BATCH_GRADING_ITEM_STATUS);
  kickBatchGradingRuntimeWorker();
  return loadBatchGradingJobDetail(jobId);
}

async function markBatchGradingItemSuccess(itemId, resultPayload) {
  const now = Date.now();
  await db.prepare(`
    UPDATE batch_grading_items
    SET status = ?, result = ?, error_code = '', error_message = NULL, updated_at = ?, finished_at = ?, last_heartbeat_at = ?
    WHERE id = ?
  `).run(
    BATCH_GRADING_ITEM_STATUS.SUCCEEDED,
    JSON.stringify(resultPayload || {}),
    now,
    now,
    now,
    itemId
  );
}

export function classifyBatchGradingFailure(error) {
  return classifyBatchGradingFailureFromDomain(error, BATCH_GRADING_ITEM_ERROR_CODE);
}

function recordBatchGradingFailureMetric(errorCode, payload = {}) {
  return recordBatchGradingFailureMetricFromDomain(errorCode, payload, {
    recordMetric: recordBatchGradingMetric,
    itemErrorCode: BATCH_GRADING_ITEM_ERROR_CODE,
  });
}

async function markBatchGradingItemFailed(itemId, errorMessage, errorCode = BATCH_GRADING_ITEM_ERROR_CODE.PROVIDER_ERROR) {
  const now = Date.now();
  await db.prepare(`
    UPDATE batch_grading_items
    SET status = ?, error_code = ?, error_message = ?, updated_at = ?, finished_at = ?, last_heartbeat_at = ?
    WHERE id = ?
  `).run(
    BATCH_GRADING_ITEM_STATUS.FAILED,
    errorCode,
    String(errorMessage || '批量批改失败').slice(0, 500),
    now,
    now,
    now,
    itemId
  );
}

const batchGradingRuntime = createBatchGradingRuntime({
  db,
  loadBatchGradingJobRow,
  loadWritingById,
  runQuickFeedbackGeneration,
  assertAIBudgetAvailable,
  parseJson: parseBatchGradingJson,
  classifyBatchGradingFailure,
  markBatchGradingItemFailed,
  markBatchGradingItemSuccess,
  refreshBatchGradingJobCounters: (jobId) => refreshBatchGradingJobCounters(jobId, BATCH_GRADING_ITEM_STATUS),
  recordBatchGradingFailureMetric,
  recordBatchGradingMetric,
  logError,
  constants: {
    jobStatus: BATCH_GRADING_JOB_STATUS,
    itemStatus: BATCH_GRADING_ITEM_STATUS,
    itemErrorCode: BATCH_GRADING_ITEM_ERROR_CODE,
    legacyCancelledStatus: LEGACY_CANCELLED_STATUS,
    workerId: BATCH_GRADING_WORKER_ID,
    pollIntervalMs: BATCH_GRADING_POLL_INTERVAL_MS,
    recoveryIntervalMs: BATCH_GRADING_RECOVERY_INTERVAL_MS,
    staleMs: BATCH_GRADING_STALE_MS,
    itemConcurrency: BATCH_GRADING_ITEM_CONCURRENCY,
  },
});

function kickBatchGradingRuntimeWorker() {
  batchGradingRuntime.kickBatchGradingWorker();
}

export function startBatchGradingWorkerLoop() {
  batchGradingRuntime.startBatchGradingWorkerLoop();
}

export function startBatchGradingRecoveryLoop() {
  batchGradingRuntime.startBatchGradingRecoveryLoop();
}

export function stopBatchGradingLoops() {
  batchGradingRuntime.stopBatchGradingLoops();
}