import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let queuedGetResults = [];
const runCalls = [];
const learningEvents = [];
const completedAssignments = [];
const contentRow = {
  reading_categories: [],
  writing_categories: [],
  reading_synonyms: [],
  writing_synonyms: [],
  course_tree: [{ id: 'common-prefixes', title: '常见前缀', content: 'prefixes' }],
  updated_at: 1782800000000,
  updated_by: 'admin-1',
};

const dbMock = {
  prepare: (sql) => ({
    get: async () => (String(sql).includes('FROM vocab_content') ? contentRow : queuedGetResults.shift() || null),
    run: async (...args) => {
      runCalls.push({ sql: String(sql), args });
    },
  }),
};

mock.module('../db/database.js', { defaultExport: dbMock });
mock.module('../utils/nanoid.js', {
  namedExports: { nanoid: () => 'vocab-course-progress-1' },
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

const { upsertCourseProgress } = await import('../services/vocab/courseProgressService.js');

test('upsertCourseProgress rejects impossible quiz scores before writing', async () => {
  queuedGetResults = [];
  runCalls.length = 0;

  await assert.rejects(
    upsertCourseProgress({
      userId: 'u1',
      nodeId: 'common-prefixes',
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
      nodeId: 'common-prefixes',
      status: 'completed',
      quizCorrect: -1,
      quizTotal: 3,
    }),
    /答对题数不合法/,
  );

  assert.equal(runCalls.length, 0);
});

test('upsertCourseProgress does not downgrade completed progress to viewed', async () => {
  queuedGetResults = [];
  runCalls.length = 0;

  await upsertCourseProgress({
    userId: 'u1',
    nodeId: 'common-prefixes',
    status: 'viewed',
    quizCorrect: 0,
    quizTotal: 0,
  });

  assert.match(runCalls[0].sql, /ON DUPLICATE KEY UPDATE/);
  assert.match(runCalls[0].sql, /completed_at IS NOT NULL AND VALUES\(status\) = 'viewed'/);
  assert.equal(runCalls[0].args[1], 'u1');
  assert.equal(runCalls[0].args[2], 'common-prefixes');
  assert.equal(runCalls[0].args[3], 'viewed');
});

test('upsertCourseProgress inserts a new row for a first-time node view', async () => {
  queuedGetResults = [null];
  runCalls.length = 0;

  await upsertCourseProgress({
    userId: 'u1',
    nodeId: 'common-prefixes',
    status: 'viewed',
    quizCorrect: 0,
    quizTotal: 0,
  });

  assert.match(runCalls[0].sql, /INSERT INTO vocabulary_course_progress/);
  assert.equal(runCalls[0].args[0], 'vocab-course-progress-1');
  assert.equal(runCalls[0].args[1], 'u1');
  assert.equal(runCalls[0].args[2], 'common-prefixes');
  assert.equal(runCalls[0].args[3], 'viewed');
});

test('upsertCourseProgress records a learning event and completes course assignments', async () => {
  queuedGetResults = [];
  runCalls.length = 0;
  learningEvents.length = 0;
  completedAssignments.length = 0;

  await upsertCourseProgress({
    userId: 'u1',
    nodeId: 'common-prefixes',
    status: 'completed',
    quizCorrect: 1,
    quizTotal: 2,
  });

  assert.deepEqual(learningEvents[0], {
    userId: 'u1',
    module: 'vocabulary',
    eventType: 'course_complete',
    score: 50,
    metadata: { nodeId: 'common-prefixes' },
  });
  assert.equal(completedAssignments[0].studentId, 'u1');
  assert.deepEqual(completedAssignments[0].moduleTypes, ['vocab-courses']);
});

test('upsertCourseProgress does not duplicate completion side effects', async () => {
  queuedGetResults = [{
    id: 'progress-1',
    status: 'completed',
    completed_at: 1782800000000,
  }];
  runCalls.length = 0;
  learningEvents.length = 0;
  completedAssignments.length = 0;

  await upsertCourseProgress({
    userId: 'u1',
    nodeId: 'common-prefixes',
    status: 'completed',
    quizCorrect: 1,
    quizTotal: 2,
  });

  assert.equal(learningEvents.length, 0);
  assert.equal(completedAssignments.length, 0);
});

test('upsertCourseProgress rejects unknown course node ids before writing', async () => {
  queuedGetResults = [];
  runCalls.length = 0;

  await assert.rejects(
    upsertCourseProgress({
      userId: 'u1',
      nodeId: 'deleted-node',
      status: 'completed',
      quizCorrect: 0,
      quizTotal: 0,
    }),
    /课程节点不存在/,
  );

  assert.equal(runCalls.length, 0);
});
