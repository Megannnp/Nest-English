import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let queuedGetResults = [];
const runCalls = [];
const learningEvents = [];
const completedAssignments = [];

const dbMock = {
  prepare: (sql) => ({
    get: async (...args) => {
      return queuedGetResults.shift()?.(String(sql), args) || null;
    },
    run: async (...args) => {
      runCalls.push({ sql: String(sql), args });
    },
  }),
};

mock.module('../db/database.js', { defaultExport: dbMock });
mock.module('../utils/nanoid.js', {
  namedExports: { nanoid: () => 'reading-progress-1' },
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

const { getReadingAnalysisRecord } = await import('../services/reading/analysisRecordService.js');
const { upsertReadingCourseProgress } = await import('../services/reading/courseProgressService.js');
const { saveReadingPracticeRecord } = await import('../services/reading/practiceService.js');

test('getReadingAnalysisRecord returns only the requested user record with full result', async () => {
  queuedGetResults = [(_sql, args) => {
    assert.deepEqual(args, ['analysis-1', 'u1']);
    return {
      id: 'analysis-1',
      passage_text: 'Passage',
      questions_text: 'Questions',
      result_json: '{"mainIdea":"Idea","mindMap":{"center":"Core"}}',
      created_at: 1782800000000,
    };
  }];

  const record = await getReadingAnalysisRecord({ userId: 'u1', analysisId: 'analysis-1' });

  assert.equal(record.id, 'analysis-1');
  assert.equal(record.passage, 'Passage');
  assert.equal(record.questions, 'Questions');
  assert.equal(record.result.mainIdea, 'Idea');
  assert.equal(record.createdAt, 1782800000000);
});

test('upsertReadingCourseProgress rejects invalid quiz counts before writing', async () => {
  queuedGetResults = [];
  runCalls.length = 0;

  await assert.rejects(
    upsertReadingCourseProgress({
      userId: 'u1',
      nodeId: 'main-idea',
      status: 'completed',
      quizCorrect: 1.5,
      quizTotal: 3,
    }),
    /小测题数不合法/,
  );

  await assert.rejects(
    upsertReadingCourseProgress({
      userId: 'u1',
      nodeId: 'main-idea',
      status: 'completed',
      quizCorrect: 4,
      quizTotal: 3,
    }),
    /答对题数不能大于总题数/,
  );

  assert.equal(runCalls.length, 0);
});

test('upsertReadingCourseProgress persists quiz score on completion', async () => {
  queuedGetResults = [() => null];
  runCalls.length = 0;
  learningEvents.length = 0;
  completedAssignments.length = 0;

  const result = await upsertReadingCourseProgress({
    userId: 'u1',
    nodeId: 'main-idea',
    status: 'completed',
    quizCorrect: 2,
    quizTotal: 3,
  });

  assert.match(runCalls[0].sql, /INSERT INTO reading_course_progress/);
  assert.equal(runCalls[0].args[3], 'completed');
  assert.equal(runCalls[0].args[4], 2);
  assert.equal(runCalls[0].args[5], 3);
  assert.equal(result.quizCorrect, 2);
  assert.equal(result.quizTotal, 3);
  assert.deepEqual(learningEvents[0], {
    userId: 'u1',
    module: 'reading',
    eventType: 'course_complete',
    score: 67,
    metadata: { nodeId: 'main-idea' },
  });
  assert.equal(completedAssignments[0].studentId, 'u1');
  assert.deepEqual(completedAssignments[0].moduleTypes, ['reading-courses']);
});

test('upsertReadingCourseProgress does not duplicate completion side effects', async () => {
  queuedGetResults = [() => ({
    id: 'progress-1',
    status: 'completed',
    completed_at: 1782800000000,
  })];
  runCalls.length = 0;
  learningEvents.length = 0;
  completedAssignments.length = 0;

  await upsertReadingCourseProgress({
    userId: 'u1',
    nodeId: 'main-idea',
    status: 'completed',
    quizCorrect: 2,
    quizTotal: 3,
  });

  assert.equal(learningEvents.length, 0);
  assert.equal(completedAssignments.length, 0);
});

test('saveReadingPracticeRecord accepts wrong-question review mode', async () => {
  runCalls.length = 0;

  const result = await saveReadingPracticeRecord({
    userId: 'u1',
    mode: 'review',
    questionType: '错题复练',
    prepExamId: 'gaokao',
    systemId: 'system-senior',
    passageIds: ['gk2024_a'],
    correctCount: 1,
    totalCount: 1,
    answers: [{ passageId: 'gk2024_a', questionIndex: 1, questionType: '主旨题', selected: 'B', answer: 'B', correct: true }],
    wrongItems: [],
  });

  assert.match(runCalls[0].sql, /INSERT INTO reading_practice_records/);
  assert.equal(runCalls[0].args[2], 'review');
  assert.equal(runCalls[0].args[4], '错题复练');
  assert.equal(result.score, 100);
  assert.equal(learningEvents.at(-1).metadata.prepExamId, 'gaokao');
  assert.equal(learningEvents.at(-1).metadata.systemId, 'system-senior');
});

test('saveReadingPracticeRecord accepts paper mode', async () => {
  runCalls.length = 0;

  const result = await saveReadingPracticeRecord({
    userId: 'u1',
    mode: 'paper',
    genre: '说明文',
    passageIds: ['gk2024_a'],
    correctCount: 3,
    totalCount: 5,
    answers: [],
    wrongItems: [],
  });

  assert.match(runCalls[0].sql, /INSERT INTO reading_practice_records/);
  assert.equal(runCalls[0].args[2], 'paper');
  assert.equal(runCalls[0].args[3], '说明文');
  assert.equal(result.score, 60);
});
