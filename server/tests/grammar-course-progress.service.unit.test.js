import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let queuedGetResults = [];
const runCalls = [];
const learningEvents = [];
const completedAssignments = [];

const dbMock = {
  prepare: (sql) => ({
    get: async () => queuedGetResults.shift() || null,
    run: async (...args) => {
      runCalls.push({ sql: String(sql), args });
    },
  }),
};

mock.module('../db/database.js', { defaultExport: dbMock });
mock.module('../utils/nanoid.js', {
  namedExports: { nanoid: () => 'course-progress-1' },
});
mock.module('../services/learningEventService.js', {
  namedExports: {
    recordLearningEvent: async (payload) => {
      learningEvents.push(payload);
    },
  },
});
mock.module('../services/moduleAssignmentService.js', {
  namedExports: {
    completeOpenModuleAssignmentsForStudent: async (payload) => {
      completedAssignments.push(payload);
      return [];
    },
  },
});

const { upsertCourseProgress } = await import('../services/grammar/courseProgressService.js');

test('upsertCourseProgress rejects impossible quiz scores before writing', async () => {
  queuedGetResults = [];
  runCalls.length = 0;

  await assert.rejects(
    upsertCourseProgress({
      userId: 'u1',
      nodeId: 'by-trunk',
      status: 'completed',
      quizCorrect: 4,
      quizTotal: 3,
    }),
    /答对题数不能大于总题数/,
  );

  assert.equal(runCalls.length, 0);
});

test('upsertCourseProgress rejects invalid quiz counts before writing', async () => {
  queuedGetResults = [];
  runCalls.length = 0;

  await assert.rejects(
    upsertCourseProgress({
      userId: 'u1',
      nodeId: 'by-trunk',
      status: 'completed',
      quizCorrect: -1,
      quizTotal: 3,
    }),
    /答对题数不合法/,
  );

  await assert.rejects(
    upsertCourseProgress({
      userId: 'u1',
      nodeId: 'by-trunk',
      status: 'completed',
      quizCorrect: 1,
      quizTotal: 2.5,
    }),
    /总题数不合法/,
  );

  assert.equal(runCalls.length, 0);
});

test('upsertCourseProgress does not downgrade completed progress to viewed', async () => {
  queuedGetResults = [{
    id: 'progress-1',
    status: 'completed',
    completed_at: 1782800000000,
    quiz_correct: 2,
    quiz_total: 3,
  }];
  runCalls.length = 0;

  await upsertCourseProgress({
    userId: 'u1',
    nodeId: 'by-trunk',
    status: 'viewed',
    quizCorrect: 0,
    quizTotal: 0,
  });

  assert.match(runCalls[0].sql, /UPDATE grammar_course_progress/);
  assert.equal(runCalls[0].args[0], 'completed');
  assert.equal(runCalls[0].args[1], 2);
  assert.equal(runCalls[0].args[2], 3);
  assert.equal(runCalls[0].args[4], 1782800000000);
});

test('upsertCourseProgress preserves completed status even when completed_at is missing', async () => {
  queuedGetResults = [{
    id: 'progress-1',
    status: 'completed',
    completed_at: null,
    quiz_correct: 2,
    quiz_total: 3,
  }];
  runCalls.length = 0;

  await upsertCourseProgress({
    userId: 'u1',
    nodeId: 'by-trunk',
    status: 'viewed',
    quizCorrect: 0,
    quizTotal: 0,
  });

  assert.match(runCalls[0].sql, /UPDATE grammar_course_progress/);
  assert.equal(runCalls[0].args[0], 'completed');
  assert.equal(runCalls[0].args[1], 2);
  assert.equal(runCalls[0].args[2], 3);
  assert.ok(Number(runCalls[0].args[4]) > 0);
});

test('upsertCourseProgress transitions viewed progress to completed', async () => {
  queuedGetResults = [{
    id: 'progress-1',
    status: 'viewed',
    completed_at: null,
    quiz_correct: 0,
    quiz_total: 0,
  }];
  runCalls.length = 0;
  learningEvents.length = 0;
  completedAssignments.length = 0;

  await upsertCourseProgress({
    userId: 'u1',
    nodeId: 'by-trunk',
    status: 'completed',
    quizCorrect: 3,
    quizTotal: 3,
  });

  assert.equal(runCalls[0].args[0], 'completed');
  assert.equal(runCalls[0].args[1], 3);
  assert.equal(runCalls[0].args[2], 3);
  assert.ok(Number(runCalls[0].args[4]) > 0);
  assert.deepEqual(learningEvents[0], {
    userId: 'u1',
    module: 'grammar',
    eventType: 'course_complete',
    score: 100,
    metadata: { nodeId: 'by-trunk' },
  });
  assert.equal(completedAssignments[0].studentId, 'u1');
  assert.deepEqual(completedAssignments[0].moduleTypes, ['grammar-courses']);
});

test('upsertCourseProgress does not duplicate completion side effects', async () => {
  queuedGetResults = [{
    id: 'progress-1',
    status: 'completed',
    completed_at: 1782800000000,
    quiz_correct: 3,
    quiz_total: 3,
  }];
  runCalls.length = 0;
  learningEvents.length = 0;
  completedAssignments.length = 0;

  await upsertCourseProgress({
    userId: 'u1',
    nodeId: 'by-trunk',
    status: 'completed',
    quizCorrect: 3,
    quizTotal: 3,
  });

  assert.equal(learningEvents.length, 0);
  assert.equal(completedAssignments.length, 0);
});
