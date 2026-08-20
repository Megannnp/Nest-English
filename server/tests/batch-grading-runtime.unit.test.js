import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import { mapBatchGradingItemRow } from '../services/batchGradingDomain.js';
import {
  buildBatchGradingSuccessPayload,
  isCancelRequestedStatus,
  isPauseRequestedStatus,
  resolveFinalBatchGradingJobStatus,
} from '../services/batchGradingRuntimeDomain.js';
import {
  createBatchGradingRuntime,
} from '../services/batchGradingRuntimeService.js';
import { createQuestionAnalysisRecoveryService } from '../services/questionAnalysisRecoveryService.js';

test.after(async () => {
  try {
    await db.pool.end();
  } catch {
    // Tests may have already closed the pool.
  }
});

test('batch grading runtime domain builds stable success payload from feedback output', () => {
  assert.deepEqual(
    buildBatchGradingSuccessPayload({
      feedback: { totalScore: 14, summary: '结构完整' },
      writingId: 'writing-1',
    }),
    {
      totalScore: 14,
      tier: '',
      summary: '结构完整',
      categories: [],
      highlights: {},
      weaknesses: [],
      mainProblems: [],
      improvements: [],
      nextActions: [],
      writingType: '',
      writingId: 'writing-1',
    }
  );

  assert.deepEqual(
    buildBatchGradingSuccessPayload({ feedback: null, writingId: 'writing-2' }),
    {
      totalScore: null,
      tier: '',
      summary: '',
      categories: [],
      highlights: {},
      weaknesses: [],
      mainProblems: [],
      improvements: [],
      nextActions: [],
      writingType: '',
      writingId: 'writing-2',
    }
  );
});

test('batch grading domain maps persisted result fields onto top-level item payload for clients', () => {
  const item = mapBatchGradingItemRow({
    id: 'item-1',
    job_id: 'job-1',
    writing_id: 'writing-1',
    student_name: '学生甲',
    sort_order: 0,
    status: 'succeeded',
    attempts: 1,
    error_code: '',
    error_message: '',
    result: JSON.stringify({
      totalScore: 16,
      tier: '第五档（14 - 17分）',
      summary: '情节承接自然，但语言错误较多。',
      categories: [{ name: '内容', comment: '情节完整', grade: '良' }],
      highlights: { content: ['能围绕比赛推进情节'] },
      weaknesses: ['语言错误较多'],
      mainProblems: ['个别句子不通顺'],
      improvements: ['先修正常见时态问题'],
      nextActions: ['补强结尾收束'],
      writingType: 'continuation',
    }),
    created_at: 1,
    updated_at: 2,
    started_at: 3,
    finished_at: 4,
    last_heartbeat_at: 5,
  });

  assert.equal(item.totalScore, 16);
  assert.equal(item.tier, '第五档（14 - 17分）');
  assert.deepEqual(item.categories, [{ name: '内容', comment: '情节完整', grade: '良' }]);
  assert.deepEqual(item.highlights, { content: ['能围绕比赛推进情节'] });
  assert.deepEqual(item.weaknesses, ['语言错误较多']);
  assert.deepEqual(item.mainProblems, ['个别句子不通顺']);
  assert.deepEqual(item.improvements, ['先修正常见时态问题']);
  assert.deepEqual(item.nextActions, ['补强结尾收束']);
  assert.equal(item.writingType, 'continuation');
});

test('batch grading runtime domain recognizes pause and cancel requested statuses', () => {
  const jobStatus = {
    PAUSED: 'paused',
    PAUSING: 'pausing',
    CANCELED: 'canceled',
    CANCELING: 'canceling',
  };

  assert.equal(isPauseRequestedStatus('paused', jobStatus), true);
  assert.equal(isPauseRequestedStatus('running', jobStatus), false);
  assert.equal(isCancelRequestedStatus('canceling', jobStatus, 'cancelled'), true);
  assert.equal(isCancelRequestedStatus('cancelled', jobStatus, 'cancelled'), true);
  assert.equal(isCancelRequestedStatus('running', jobStatus, 'cancelled'), false);
});

test('batch grading runtime domain resolves final job status from counters and pending runtime state', () => {
  const jobStatus = {
    PENDING: 'pending',
    PAUSED: 'paused',
    PAUSING: 'pausing',
    CANCELED: 'canceled',
    CANCELING: 'canceling',
    FAILED: 'failed',
    PARTIAL_FAILED: 'partial_failed',
    COMPLETED: 'completed',
  };

  assert.equal(resolveFinalBatchGradingJobStatus({
    row: { status: 'running', failed_count: 0, success_count: 0 },
    hasPending: true,
    jobStatus,
    legacyCancelledStatus: 'cancelled',
  }), 'pending');

  assert.equal(resolveFinalBatchGradingJobStatus({
    row: { status: 'running', failed_count: 2, success_count: 0 },
    hasPending: false,
    hasRunning: false,
    hasCanceled: false,
    jobStatus,
    legacyCancelledStatus: 'cancelled',
  }), 'failed');

  assert.equal(resolveFinalBatchGradingJobStatus({
    row: { status: 'running', failed_count: 1, success_count: 3 },
    hasPending: false,
    hasRunning: false,
    hasCanceled: false,
    jobStatus,
    legacyCancelledStatus: 'cancelled',
  }), 'partial_failed');

  assert.equal(resolveFinalBatchGradingJobStatus({
    row: { status: 'pausing', failed_count: 0, success_count: 0 },
    fallbackStatus: '',
    hasPending: false,
    hasRunning: false,
    hasCanceled: false,
    jobStatus,
    legacyCancelledStatus: 'cancelled',
  }), 'paused');
});

test('batch grading runtime pauses jobs by resetting running items and finalizing paused status', async () => {
  const calls = [];
  let nextJobCandidate = { id: 'job-1', status: 'pausing' };
  const runtime = createBatchGradingRuntime({
    db: {
      prepare(sql) {
        return {
          get(...args) {
            calls.push({ kind: 'get', sql, args });
            return null;
          },
          run(...args) {
            calls.push({ kind: 'run', sql, args });
            return { changes: 1 };
          },
        };
      },
    },
    loadBatchGradingJobRow: async () => ({ id: 'job-1', status: 'pausing', failed_count: 0, success_count: 0 }),
    loadWritingById: async () => null,
    runQuickFeedbackGeneration: async () => ({ status: 'ready' }),
    assertAIBudgetAvailable: async () => {},
    parseJson: () => ({}),
    classifyBatchGradingFailure: () => 'unknown',
    markBatchGradingItemFailed: async () => {},
    markBatchGradingItemSuccess: async () => {},
    refreshBatchGradingJobCounters: async () => {
      calls.push({ kind: 'refresh' });
    },
    recordBatchGradingFailureMetric: () => {},
    recordBatchGradingMetric: () => {},
    logError: () => {},
    constants: {
      jobStatus: {
        PENDING: 'pending',
        RUNNING: 'running',
        PAUSED: 'paused',
        PAUSING: 'pausing',
        CANCELED: 'canceled',
        CANCELING: 'canceling',
        FAILED: 'failed',
        PARTIAL_FAILED: 'partial_failed',
        COMPLETED: 'completed',
      },
      itemStatus: {
        PENDING: 'pending',
        RUNNING: 'running',
        CANCELED: 'canceled',
      },
      itemErrorCode: {
        USER_CANCELED: 'user_canceled',
      },
      legacyCancelledStatus: 'cancelled',
      workerId: 'worker-1',
      pollIntervalMs: 1000,
      recoveryIntervalMs: 5000,
      staleMs: 10000,
    },
    repository: {
      selectNextBatchGradingJobCandidate: async () => {
        const candidate = nextJobCandidate;
        nextJobCandidate = null;
        return candidate;
      },
      touchTransitioningBatchGradingJob: async (...args) => {
        calls.push({ kind: 'touch', args });
      },
      resetRunningItemsForPausedJob: async (...args) => {
        calls.push({ kind: 'reset', args });
      },
      cancelActiveItemsForCanceledJob: async () => {
        calls.push({ kind: 'cancel' });
      },
      selectNextBatchGradingItemCandidate: async () => null,
      claimBatchGradingJobCandidate: async () => ({ changes: 1 }),
      claimBatchGradingItemCandidate: async () => ({ changes: 1 }),
      loadBatchGradingItemRow: async () => null,
    },
  });

  runtime.kickBatchGradingWorker();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(calls.some((entry) => entry.kind === 'reset'), true);
  const finalRun = calls.find((entry) => entry.kind === 'run' && String(entry.sql).includes('UPDATE batch_grading_jobs'));
  assert.equal(Boolean(finalRun), true);
  assert.equal(finalRun.args[0], 'paused');
});

test('batch grading runtime cancels jobs by canceling active items and finalizing canceled status', async () => {
  const calls = [];
  let nextJobCandidate = { id: 'job-2', status: 'canceling' };
  const runtime = createBatchGradingRuntime({
    db: {
      prepare(sql) {
        return {
          get(...args) {
            calls.push({ kind: 'get', sql, args });
            return null;
          },
          run(...args) {
            calls.push({ kind: 'run', sql, args });
            return { changes: 1 };
          },
        };
      },
    },
    loadBatchGradingJobRow: async () => ({ id: 'job-2', status: 'canceling', failed_count: 0, success_count: 0 }),
    loadWritingById: async () => null,
    runQuickFeedbackGeneration: async () => ({ status: 'ready' }),
    assertAIBudgetAvailable: async () => {},
    parseJson: () => ({}),
    classifyBatchGradingFailure: () => 'unknown',
    markBatchGradingItemFailed: async () => {},
    markBatchGradingItemSuccess: async () => {},
    refreshBatchGradingJobCounters: async () => {},
    recordBatchGradingFailureMetric: () => {},
    recordBatchGradingMetric: () => {},
    logError: () => {},
    constants: {
      jobStatus: {
        PENDING: 'pending',
        RUNNING: 'running',
        PAUSED: 'paused',
        PAUSING: 'pausing',
        CANCELED: 'canceled',
        CANCELING: 'canceling',
        FAILED: 'failed',
        PARTIAL_FAILED: 'partial_failed',
        COMPLETED: 'completed',
      },
      itemStatus: {
        PENDING: 'pending',
        RUNNING: 'running',
        CANCELED: 'canceled',
      },
      itemErrorCode: {
        USER_CANCELED: 'user_canceled',
      },
      legacyCancelledStatus: 'cancelled',
      workerId: 'worker-1',
      pollIntervalMs: 1000,
      recoveryIntervalMs: 5000,
      staleMs: 10000,
    },
    repository: {
      selectNextBatchGradingJobCandidate: async () => {
        const candidate = nextJobCandidate;
        nextJobCandidate = null;
        return candidate;
      },
      touchTransitioningBatchGradingJob: async () => {},
      resetRunningItemsForPausedJob: async () => {},
      cancelActiveItemsForCanceledJob: async (...args) => {
        calls.push({ kind: 'cancel', args });
      },
      selectNextBatchGradingItemCandidate: async () => null,
      claimBatchGradingJobCandidate: async () => ({ changes: 1 }),
      claimBatchGradingItemCandidate: async () => ({ changes: 1 }),
      loadBatchGradingItemRow: async () => null,
    },
  });

  runtime.kickBatchGradingWorker();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(calls.some((entry) => entry.kind === 'cancel'), true);
  const finalRun = calls.find((entry) => entry.kind === 'run' && String(entry.sql).includes('UPDATE batch_grading_jobs'));
  assert.equal(Boolean(finalRun), true);
  assert.equal(finalRun.args[0], 'canceled');
});

test('question analysis recovery only requeues stale idle jobs and logs recovered count', async () => {
  const queued = [];
  const enqueued = [];
  const logs = [];
  const recover = createQuestionAnalysisRecoveryService({
    database: {
      prepare() {
        return {
          all() {
            return [
              { id: 'writing-1', selected_type: 'speech', feedback: '{}' },
              { id: 'writing-2', selected_type: 'letter', feedback: '{}' },
            ];
          },
        };
      },
    },
    getQueueState: (writingId) => (writingId === 'writing-1' ? 'idle' : 'running'),
    markQueued: async (row, options) => {
      queued.push({ row, options });
    },
    enqueueRetry: (writingId) => {
      enqueued.push(writingId);
    },
    logger: (event, payload) => {
      logs.push({ event, payload });
    },
  });

  await recover({ staleBefore: 12345 });

  assert.equal(queued.length, 1);
  assert.equal(queued[0].row.id, 'writing-1');
  assert.equal(queued[0].options.incrementRetry, false);
  assert.deepEqual(enqueued, ['writing-1']);
  assert.deepEqual(logs, [{
    event: 'question_analysis_recovery_completed',
    payload: { recovered: 1 },
  }]);
});
