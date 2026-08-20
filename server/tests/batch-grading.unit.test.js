import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import {
  buildBatchGradingJobListFilter,
  canContinueIncompleteBatchItems,
  canRetryFailedBatchItems,
  mapBatchGradingJobDetail,
  mapBatchGradingJobList,
  mapBatchGradingItemRow,
  mapBatchGradingJobRow,
  resolveCancelBatchGradingJobStatus,
  resolvePauseBatchGradingJobStatus,
  resolveResumeBatchGradingJobStatus,
} from '../services/batchGradingDomain.js';
import {
  getBatchGradingMetrics,
  recordBatchGradingMetric,
} from '../services/batchGradingMetrics.js';
import {
  cancelPendingBatchGradingItems,
  hasRunningBatchGradingItems,
  listBatchGradingJobRowsForTeacher,
  refreshBatchGradingJobCounters,
  resetFailedBatchGradingItems,
  resetIncompleteBatchGradingItems,
  updateBatchGradingJobLifecycle,
  updateBatchGradingJobStatus,
} from '../services/batchGradingRepository.js';
import {
  BATCH_GRADING_ITEM_ERROR_CODE,
  classifyBatchGradingFailure,
  listBatchGradingJobs,
  normalizeBatchGradingJobListFilter,
  normalizeBatchGradingJobListLimit,
} from '../services/batchGradingService.js';
import { AppError, ValidationError } from '../utils/appError.js';

test.after(async () => {
  try {
    await db.pool.end();
  } catch {
    return undefined;
  }
});

test('batch grading list limit is bounded for teacher task recovery entry', () => {
  assert.equal(normalizeBatchGradingJobListLimit(undefined), 10);
  assert.equal(normalizeBatchGradingJobListLimit('bad'), 10);
  assert.equal(normalizeBatchGradingJobListLimit(0), 10);
  assert.equal(normalizeBatchGradingJobListLimit(5), 5);
  assert.equal(normalizeBatchGradingJobListLimit(100), 30);
});

test('batch grading list filter is normalized for service-side filtering', () => {
  assert.equal(normalizeBatchGradingJobListFilter(), 'active');
  assert.equal(normalizeBatchGradingJobListFilter('paused'), 'paused');
  assert.equal(normalizeBatchGradingJobListFilter('completed'), 'completed');
  assert.equal(normalizeBatchGradingJobListFilter('all'), 'all');
  assert.equal(normalizeBatchGradingJobListFilter('weird'), 'active');
});

test('batch grading failure classifier keeps stable user-facing buckets', () => {
  assert.equal(
    classifyBatchGradingFailure(new AppError('额度不足', { status: 429, code: 'AI_BUDGET_EXCEEDED' })),
    BATCH_GRADING_ITEM_ERROR_CODE.AI_BUDGET_EXCEEDED
  );
  assert.equal(
    classifyBatchGradingFailure(new Error('Provider request timeout')),
    BATCH_GRADING_ITEM_ERROR_CODE.AI_TIMEOUT
  );
  assert.equal(
    classifyBatchGradingFailure(new ValidationError('作文与当前任务不匹配')),
    BATCH_GRADING_ITEM_ERROR_CODE.VALIDATION_ERROR
  );
  assert.equal(
    classifyBatchGradingFailure(new Error('model returned malformed result')),
    BATCH_GRADING_ITEM_ERROR_CODE.PROVIDER_ERROR
  );
});

test('batch grading metrics distinguish cancel, budget and recovery outcomes', () => {
  recordBatchGradingMetric('user_canceled', { jobId: 'job-1' });
  recordBatchGradingMetric('budget_exceeded', { jobId: 'job-1', reason: 'ai_budget_exceeded' });
  recordBatchGradingMetric('ai_failed', { jobId: 'job-1', reason: 'provider_error', durationMs: 1200 });
  recordBatchGradingMetric('recovery_succeeded', { jobId: 'job-1' });
  recordBatchGradingMetric('recovery_failed', { jobId: 'job-2', reason: 'job_claim_conflict' });

  const metrics = getBatchGradingMetrics();
  assert.equal(metrics.userCanceled >= 1, true);
  assert.equal(metrics.budgetExceeded >= 1, true);
  assert.equal(metrics.aiFailed >= 1, true);
  assert.equal(metrics.recoverySucceeded >= 1, true);
  assert.equal(metrics.recoveryFailed >= 1, true);
  assert.equal(metrics.failureReasons.provider_error >= 1, true);
  assert.equal(metrics.failureReasons.ai_budget_exceeded >= 1, true);
  assert.equal(typeof metrics.latencyMs.p50, 'number');
});

test('batch grading job list loads items in one batched query instead of per-job lookups', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    all: (...args) => {
      calls.push({ sql, args });
      if (sql.includes('FROM batch_grading_jobs')) {
        return [
          {
            id: 'job-1',
            teacher_id: 'teacher-1',
            status: 'running',
            total_count: 2,
            processed_count: 1,
            success_count: 1,
            failed_count: 0,
            created_at: 1,
            updated_at: 2,
          },
          {
            id: 'job-2',
            teacher_id: 'teacher-1',
            status: 'paused',
            total_count: 1,
            processed_count: 0,
            success_count: 0,
            failed_count: 0,
            created_at: 3,
            updated_at: 4,
          },
        ];
      }
      if (sql.includes('FROM batch_grading_items')) {
        return [
          {
            id: 'item-1',
            job_id: 'job-1',
            writing_id: 'writing-1',
            student_name: 'Alice',
            sort_order: 1,
            status: 'succeeded',
            attempts: 1,
            result: JSON.stringify({ totalScore: 88, summary: 'done' }),
            created_at: 10,
            updated_at: 11,
          },
          {
            id: 'item-2',
            job_id: 'job-2',
            writing_id: 'writing-2',
            student_name: 'Bob',
            sort_order: 1,
            status: 'pending',
            attempts: 0,
            result: null,
            created_at: 12,
            updated_at: 13,
          },
        ];
      }
      throw new Error(`Unexpected all query: ${sql}`);
    },
  });

  try {
    const jobs = await listBatchGradingJobs({
      teacherId: 'teacher-1',
      limit: 10,
      filter: 'all',
    });

    assert.equal(jobs.length, 2);
    assert.equal(jobs[0].items.length, 1);
    assert.equal(jobs[0].items[0].id, 'item-1');
    assert.equal(jobs[1].items.length, 1);
    assert.equal(jobs[1].items[0].id, 'item-2');

    const itemQueries = calls.filter((call) => call.sql.includes('FROM batch_grading_items'));
    assert.equal(itemQueries.length, 1);
    assert.deepEqual(itemQueries[0].args, ['job-1', 'job-2']);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('batch grading repository keeps filter and scope params ahead of limit', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    all: (...args) => {
      calls.push({ sql, args });
      return [];
    },
  });

  try {
    await listBatchGradingJobRowsForTeacher({
      teacherId: 'teacher-1',
      filterClause: 'AND status IN (?, ?)',
      filterParams: ['running', 'pending'],
      scopeClauses: ['AND class_id = ?', 'AND assignment_id = ?'],
      scopeParams: ['class-1', 'assignment-1'],
      limit: 20,
    });

    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /WHERE teacher_id = \?/);
    assert.deepEqual(calls[0].args, [
      'teacher-1',
      'running',
      'pending',
      'class-1',
      'assignment-1',
      20,
    ]);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('batch grading repository refreshes persisted counters from item aggregation', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    get: (...args) => {
      calls.push({ kind: 'get', sql, args });
      return {
        total_count: 5,
        processed_count: 4,
        success_count: 3,
        failed_count: 1,
      };
    },
    run: (...args) => {
      calls.push({ kind: 'run', sql, args });
      return { changes: 1 };
    },
  });

  try {
    await refreshBatchGradingJobCounters('job-1', {
      SUCCEEDED: 'succeeded',
      FAILED: 'failed',
      CANCELED: 'canceled',
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].kind, 'get');
    assert.deepEqual(calls[0].args, ['succeeded', 'failed', 'canceled', 'succeeded', 'failed', 'job-1']);
    assert.equal(calls[1].kind, 'run');
    assert.equal(calls[1].args[0], 5);
    assert.equal(calls[1].args[1], 4);
    assert.equal(calls[1].args[2], 3);
    assert.equal(calls[1].args[3], 1);
    assert.equal(calls[1].args[5], 'job-1');
  } finally {
    db.prepare = originalPrepare;
  }
});

test('batch grading repository exposes running-item probe and lifecycle updates', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    get: (...args) => {
      calls.push({ kind: 'get', sql, args });
      return { 1: 1 };
    },
    run: (...args) => {
      calls.push({ kind: 'run', sql, args });
      return { changes: 1 };
    },
  });

  try {
    const running = await hasRunningBatchGradingItems('job-1', 'running');
    assert.deepEqual(running, { 1: 1 });

    await updateBatchGradingJobStatus('job-1', 'paused', 100);
    await updateBatchGradingJobLifecycle('job-1', {
      status: 'pending',
      updatedAt: 200,
      finishedAt: null,
      errorMessage: null,
    });

    assert.deepEqual(calls[0].args, ['job-1', 'running']);
    assert.deepEqual(calls[1].args, ['paused', 100, 'job-1']);
    assert.deepEqual(calls[2].args, ['pending', 200, null, null, 'job-1']);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('batch grading repository updates pending, failed and incomplete item batches with stable params', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    run: (...args) => {
      calls.push({ sql, args });
      return { changes: 1 };
    },
  });

  try {
    await cancelPendingBatchGradingItems('job-1', {
      canceledStatus: 'canceled',
      pendingStatus: 'pending',
      errorCode: 'user_canceled',
      errorMessage: '用户已停止，未继续处理',
      now: 123,
    });
    await resetFailedBatchGradingItems('job-1', 'failed', 'pending', 456);
    await resetIncompleteBatchGradingItems('job-1', {
      pendingStatus: 'pending',
      runningStatus: 'running',
      canceledStatus: 'canceled',
      userCanceledCode: 'user_canceled',
      now: 789,
    });

    assert.deepEqual(calls[0].args, ['canceled', 123, 123, 'user_canceled', '用户已停止，未继续处理', 'job-1', 'pending']);
    assert.deepEqual(calls[1].args, ['pending', 456, 'job-1', 'failed']);
    assert.deepEqual(calls[2].args, ['pending', 789, 'job-1', 'pending', 'running', 'canceled', 'user_canceled']);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('batch grading domain maps job and item rows into stable client shape', () => {
  const item = mapBatchGradingItemRow({
    id: 'item-1',
    job_id: 'job-1',
    writing_id: 'writing-1',
    student_name: 'Alice',
    sort_order: '2',
    status: 'succeeded',
    attempts: '3',
    result: JSON.stringify({ totalScore: 91, summary: 'good' }),
    created_at: '10',
    updated_at: '11',
    started_at: '12',
    finished_at: '13',
    last_heartbeat_at: '14',
  });
  const job = mapBatchGradingJobRow({
    id: 'job-1',
    teacher_id: 'teacher-1',
    class_id: 'class-1',
    assignment_id: 'assignment-1',
    status: 'running',
    queue_name: 'worker',
    payload: JSON.stringify({ source: 'teacher_batch' }),
    total_count: '5',
    processed_count: '3',
    success_count: '2',
    failed_count: '1',
    created_at: '1',
    updated_at: '2',
    started_at: '3',
    finished_at: '4',
    last_heartbeat_at: '5',
  }, [item]);

  assert.equal(item.totalScore, 91);
  assert.equal(item.summary, 'good');
  assert.equal(item.sortOrder, 2);
  assert.equal(job.teacherId, 'teacher-1');
  assert.equal(job.payload.source, 'teacher_batch');
  assert.equal(job.totalCount, 5);
  assert.equal(job.items[0].id, 'item-1');
});

test('batch grading domain maps detail and list payloads from raw repository rows', () => {
  const row = {
    id: 'job-1',
    teacher_id: 'teacher-1',
    status: 'paused',
    total_count: 1,
    processed_count: 0,
    success_count: 0,
    failed_count: 0,
    payload: JSON.stringify({ source: 'teacher_batch' }),
    created_at: 1,
    updated_at: 2,
  };
  const itemRows = [{
    id: 'item-1',
    job_id: 'job-1',
    writing_id: 'writing-1',
    student_name: 'Alice',
    sort_order: 0,
    status: 'pending',
    attempts: 0,
    result: null,
    created_at: 3,
    updated_at: 4,
  }];

  const detail = mapBatchGradingJobDetail(row, itemRows);
  const list = mapBatchGradingJobList([row], { 'job-1': itemRows });

  assert.equal(detail.id, 'job-1');
  assert.equal(detail.items[0].id, 'item-1');
  assert.equal(list.length, 1);
  assert.equal(list[0].items[0].studentName, 'Alice');
});

test('batch grading domain builds stable job list filters for completed and active views', () => {
  const completed = buildBatchGradingJobListFilter('completed', {
    PENDING: 'pending',
    RUNNING: 'running',
    PAUSING: 'pausing',
    CANCELING: 'canceling',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    PARTIAL_FAILED: 'partial_failed',
    FAILED: 'failed',
    CANCELED: 'canceled',
  }, 'cancelled');
  assert.match(completed.clause, /status IN/);
  assert.deepEqual(completed.params, ['completed', 'partial_failed', 'failed', 'canceled', 'cancelled']);

  const active = buildBatchGradingJobListFilter('active', {
    PENDING: 'pending',
    RUNNING: 'running',
    PAUSING: 'pausing',
    CANCELING: 'canceling',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    PARTIAL_FAILED: 'partial_failed',
    FAILED: 'failed',
    CANCELED: 'canceled',
  }, 'cancelled');
  assert.deepEqual(active.params, ['pending', 'running', 'pausing', 'canceling']);
});

test('batch grading domain resolves pause and cancel transitions from current runtime state', () => {
  const jobStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    PAUSING: 'pausing',
    PAUSED: 'paused',
    CANCELING: 'canceling',
    CANCELED: 'canceled',
    COMPLETED: 'completed',
  };

  assert.equal(resolvePauseBatchGradingJobStatus('running', true, jobStatus), 'pausing');
  assert.equal(resolvePauseBatchGradingJobStatus('pending', false, jobStatus), 'paused');
  assert.equal(resolvePauseBatchGradingJobStatus('completed', false, jobStatus), null);
  assert.equal(resolveResumeBatchGradingJobStatus('paused', jobStatus), 'pending');
  assert.equal(resolveResumeBatchGradingJobStatus('running', jobStatus), null);

  assert.equal(resolveCancelBatchGradingJobStatus('running', true, jobStatus, 'cancelled'), 'canceling');
  assert.equal(resolveCancelBatchGradingJobStatus('paused', false, jobStatus, 'cancelled'), 'canceled');
  assert.equal(resolveCancelBatchGradingJobStatus('completed', false, jobStatus, 'cancelled'), null);
  assert.equal(resolveCancelBatchGradingJobStatus('cancelled', false, jobStatus, 'cancelled'), null);
});

test('batch grading domain blocks retry and continue while job is actively transitioning', () => {
  const jobStatus = {
    RUNNING: 'running',
    PAUSING: 'pausing',
    CANCELING: 'canceling',
  };

  assert.equal(canRetryFailedBatchItems('running', jobStatus), false);
  assert.equal(canRetryFailedBatchItems('paused', jobStatus), true);
  assert.equal(canContinueIncompleteBatchItems('canceling', jobStatus), false);
  assert.equal(canContinueIncompleteBatchItems('failed', jobStatus), true);
});
