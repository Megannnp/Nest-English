import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import {
  cancelActiveItemsForCanceledJob,
  claimBatchGradingItemCandidate,
  claimBatchGradingJobCandidate,
  loadBatchGradingItemRow,
  resetRunningItemsForPausedJob,
  selectNextBatchGradingItemCandidate,
  selectNextBatchGradingJobCandidate,
  touchTransitioningBatchGradingJob,
} from '../services/batchGradingRuntimeRepository.js';

test('batch grading runtime repository selects and claims job candidates with stable params', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    get: (...args) => {
      calls.push({ kind: 'get', sql, args });
      return { id: 'job-1', status: 'pending' };
    },
    run: (...args) => {
      calls.push({ kind: 'run', sql, args });
      return { changes: 1 };
    },
  });

  try {
    const candidate = await selectNextBatchGradingJobCandidate(db, {
      pendingStatus: 'pending',
      runningStatus: 'running',
      pausingStatus: 'pausing',
      cancelingStatus: 'canceling',
      staleBefore: 100,
    });
    assert.equal(candidate.id, 'job-1');

    await touchTransitioningBatchGradingJob(db, {
      jobId: 'job-1',
      status: 'pausing',
      now: 200,
    });

    await claimBatchGradingJobCandidate(db, {
      jobId: 'job-1',
      runningStatus: 'running',
      workerId: 'worker-1',
      now: 300,
      pendingStatus: 'pending',
      staleRunningStatus: 'running',
      staleBefore: 100,
    });

    assert.deepEqual(calls[0].args, ['pending', 'running', 100, 'pausing', 'canceling']);
    assert.deepEqual(calls[1].args, [200, 200, 'job-1', 'pausing']);
    assert.deepEqual(calls[2].args, ['running', 'worker-1', 300, 300, 300, 'job-1', 'pending', 'running', 100]);
  } finally {
    db.prepare = originalPrepare;
  }
});

test('batch grading runtime repository selects, claims, loads and batch-updates items with stable params', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    get: (...args) => {
      calls.push({ kind: 'get', sql, args });
      if (String(sql).includes('WHERE id = ? LIMIT 1')) {
        return { id: 'item-1', status: 'running' };
      }
      return { id: 'item-1', status: 'pending' };
    },
    run: (...args) => {
      calls.push({ kind: 'run', sql, args });
      return { changes: 1 };
    },
  });

  try {
    await selectNextBatchGradingItemCandidate(db, {
      jobId: 'job-1',
      pendingStatus: 'pending',
      runningStatus: 'running',
      staleBefore: 100,
    });
    await claimBatchGradingItemCandidate(db, {
      itemId: 'item-1',
      runningStatus: 'running',
      attempts: 2,
      now: 200,
      pendingStatus: 'pending',
      staleRunningStatus: 'running',
      staleBefore: 100,
    });
    const loaded = await loadBatchGradingItemRow(db, 'item-1');
    assert.equal(loaded.id, 'item-1');

    await resetRunningItemsForPausedJob(db, {
      jobId: 'job-1',
      pendingStatus: 'pending',
      now: 300,
      runningStatus: 'running',
    });
    await cancelActiveItemsForCanceledJob(db, {
      jobId: 'job-1',
      canceledStatus: 'canceled',
      now: 400,
      userCanceledCode: 'user_canceled',
      errorMessage: '用户已停止，未继续处理',
      pendingStatus: 'pending',
      runningStatus: 'running',
    });

    assert.deepEqual(calls[0].args, ['job-1', 'pending', 'running', 100]);
    assert.deepEqual(calls[1].args, ['running', 2, 200, 200, 200, 'item-1', 'pending', 'running', 100]);
    assert.deepEqual(calls[2].args, ['item-1']);
    assert.deepEqual(calls[3].args, ['pending', 300, 'job-1', 'running']);
    assert.deepEqual(calls[4].args, ['canceled', 400, 400, 'user_canceled', '用户已停止，未继续处理', 'job-1', 'pending', 'running']);
  } finally {
    db.prepare = originalPrepare;
  }
});
