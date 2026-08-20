import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { createBatchGradingJobCreator } from '../services/batchGradingJobCreationService.js';

const JOB_STATUS = {
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

const ITEM_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled',
};

function createServiceWithDb(dbMock) {
  return createBatchGradingJobCreator(
    {
      jobStatus: JOB_STATUS,
      itemStatus: ITEM_STATUS,
      workerId: 'batch_grading_worker',
    },
    dbMock
  );
}

test('batch grading job creation rejects non-teacher users', async () => {
  const service = createServiceWithDb({});
  await assert.rejects(
    () => service({ teacher: { id: 'student-1', role: 'student' }, payload: { assignmentId: 'a1', items: [{ writingId: 'w1' }] } }),
    (err) => err?.statusCode === 403 || /只有教师/.test(err?.message || '')
  );
});

test('batch grading job creation requires at least one item', async () => {
  const service = createServiceWithDb({});
  await assert.rejects(
    () => service({ teacher: { id: 'teacher-1', role: 'teacher' }, payload: { assignmentId: 'a1', items: [] } }),
    (err) => /至少选择一篇/.test(err?.message || '')
  );
});

test('batch grading job creation caps item count at MAX_BATCH_ITEMS', async () => {
  const service = createServiceWithDb({});
  const items = Array.from({ length: 201 }, (_, i) => ({ writingId: `w${i}` }));
  await assert.rejects(
    () => service({ teacher: { id: 'teacher-1', role: 'teacher' }, payload: { assignmentId: 'a1', items } }),
    (err) => /最多 200 篇/.test(err?.message || '')
  );
});

test('batch grading job creation requires an assignment scope', async () => {
  const service = createServiceWithDb({});
  await assert.rejects(
    () => service({ teacher: { id: 'teacher-1', role: 'teacher' }, payload: { items: [{ writingId: 'w1' }] } }),
    (err) => /请先选择任务/.test(err?.message || '')
  );
});

test('batch grading job creation rejects items that are not teacher-accessible', async () => {
  const queryCalls = [];
  const dbMock = {
    pool: {
      query: async (sql, params = []) => {
        queryCalls.push({ sql, params });
        if (sql.includes('FROM writings')) {
          return [[{ id: 'w1', user_id: 'other-student', assignment_id: 'a1' }]];
        }
        if (sql.includes('FROM class_students')) {
          return [[]]; // teacher has no classes with this student
        }
        if (sql.includes('SELECT class_name FROM classes')) {
          return [[]];
        }
        if (sql.includes('FROM batch_grading_items bgi')) {
          return [[]];
        }
        return [[]];
      },
    },
  };
  const service = createServiceWithDb(dbMock);

  await assert.rejects(
    () => service({
      teacher: { id: 'teacher-1', role: 'teacher' },
      payload: { assignmentId: 'a1', items: [{ writingId: 'w1' }] },
    }),
    (err) => /无权限/.test(err?.message || '')
  );
});

test('batch grading job creation rejects nonexistent writing rows', async () => {
  const dbMock = {
    pool: {
      query: async (sql) => {
        if (sql.includes('FROM writings')) return [[]];
        if (sql.includes('FROM class_students')) return [[]];
        if (sql.includes('SELECT class_name FROM classes')) return [[]];
        if (sql.includes('FROM batch_grading_items bgi')) return [[]];
        return [[]];
      },
    },
  };
  const service = createServiceWithDb(dbMock);

  await assert.rejects(
    () => service({
      teacher: { id: 'teacher-1', role: 'teacher' },
      payload: { assignmentId: 'a1', items: [{ writingId: 'missing' }] },
    }),
    (err) => /不存在/.test(err?.message || '')
  );
});

test('batch grading job creation rejects conflicting active items', async () => {
  const dbMock = {
    pool: {
      query: async (sql) => {
        if (sql.includes('FROM writings')) {
          return [[{ id: 'w1', user_id: 's1', assignment_id: 'a1' }]];
        }
        if (sql.includes('FROM class_students')) {
          return [[{ student_id: 's1' }]];
        }
        if (sql.includes('SELECT class_name FROM classes')) {
          return [[]];
        }
        if (sql.includes('FROM batch_grading_items bgi')) {
          return [[{ writing_id: 'w1' }]];
        }
        return [[]];
      },
    },
  };
  const service = createServiceWithDb(dbMock);

  await assert.rejects(
    () => service({
      teacher: { id: 'teacher-1', role: 'teacher' },
      payload: { assignmentId: 'a1', items: [{ writingId: 'w1' }] },
    }),
    (err) => /已经在另一个批量批改任务中/.test(err?.message || '')
  );
});

test('batch grading job creation persists job + items in a transaction and returns ids', async () => {
  const statements = [];
  const commitCall = { called: false };
  const dbMock = {
    pool: {
      query: async (sql, params = []) => {
        if (sql.includes('FROM writings')) {
          return [[{ id: 'w1', user_id: 's1', assignment_id: 'a1', user_name: 'Alice' }]];
        }
        if (sql.includes('FROM class_students')) {
          return [[{ student_id: 's1' }]];
        }
        if (sql.includes('SELECT class_name FROM classes')) {
          return [[]];
        }
        if (sql.includes('FROM batch_grading_items bgi')) {
          return [[]];
        }
        if (sql.includes('INSERT INTO batch_grading_jobs')) {
          statements.push({ kind: 'job', params });
          return [{}];
        }
        if (sql.includes('INSERT INTO batch_grading_items')) {
          statements.push({ kind: 'items', params });
          return [{}];
        }
        return [[]];
      },
      getConnection: async () => ({
        beginTransaction: async () => {},
        query: async (sql, params = []) => {
          if (sql.includes('INSERT INTO batch_grading_jobs')) {
            statements.push({ kind: 'job', params });
            return [{}];
          }
          if (sql.includes('INSERT INTO batch_grading_items')) {
            statements.push({ kind: 'items', params });
            return [{}];
          }
          return [[]];
        },
        commit: async () => { commitCall.called = true; },
        rollback: async () => {},
        release: async () => {},
      }),
    },
  };
  const service = createServiceWithDb(dbMock);

  const result = await service({
    teacher: { id: 'teacher-1', role: 'teacher' },
    payload: { assignmentId: 'a1', classId: 'c1', items: [{ writingId: 'w1', studentName: 'Alice' }] },
  });

  assert.ok(result.id, 'should return a job id');
  assert.equal(result.totalCount, 1);
  assert.equal(result.scope.assignmentId, 'a1');
  assert.equal(commitCall.called, true, 'transaction should be committed');

  const jobStmt = statements.find((s) => s.kind === 'job');
  assert.ok(jobStmt, 'job insert should be called');
  assert.equal(jobStmt.params[4], 'pending');
  assert.equal(jobStmt.params[0], result.id);

  const itemsStmt = statements.find((s) => s.kind === 'items');
  assert.ok(itemsStmt, 'items insert should be called');
  assert.equal(itemsStmt.params[1], result.id);
  assert.equal(itemsStmt.params[2], 'w1');
  assert.equal(itemsStmt.params[5], 'pending');
});