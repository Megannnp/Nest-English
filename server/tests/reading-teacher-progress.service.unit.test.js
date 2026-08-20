import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const dbCalls = [];
let queuedAllResults = [];

const dbMock = {
  prepare: (sql) => ({
    all: async (...args) => {
      dbCalls.push({ sql, args });
      return queuedAllResults.shift() || [];
    },
  }),
};

mock.module('../db/database.js', { defaultExport: dbMock });
mock.module('../services/learningEventService.js', {
  namedExports: {
    recordLearningEvent: async () => {},
  },
});

const { getReadingPracticeStatsByUserIds } = await import('../services/reading/practiceService.js');
const { getReadingAnalysisStatsByUserIds } = await import('../services/reading/analysisRecordService.js');

test('getReadingPracticeStatsByUserIds returns real aggregates and zero rows for inactive students', async () => {
  dbCalls.length = 0;
  queuedAllResults = [[{
    user_id: 'u1',
    sessions: 2,
    total_questions: 10,
    correct_questions: 7,
    passages: 3,
    wrong_count: 3,
    last_practiced_at: 1782800000000,
  }]];

  const stats = await getReadingPracticeStatsByUserIds(['u1', 'u2', 'u1', '']);

  assert.deepEqual(dbCalls[0].args, ['u1', 'u2']);
  assert.equal(stats.u1.sessions, 2);
  assert.equal(stats.u1.totalQuestions, 10);
  assert.equal(stats.u1.correctQuestions, 7);
  assert.equal(stats.u1.accuracy, 70);
  assert.equal(stats.u1.passages, 3);
  assert.equal(stats.u1.wrongQuestions, 3);
  assert.equal(stats.u1.lastPracticedAt, 1782800000000);
  assert.deepEqual(stats.u2, {
    sessions: 0,
    passages: 0,
    totalQuestions: 0,
    correctQuestions: 0,
    accuracy: 0,
    wrongQuestions: 0,
    lastPracticedAt: null,
  });
});

test('getReadingAnalysisStatsByUserIds returns success counts and zero rows for inactive students', async () => {
  dbCalls.length = 0;
  queuedAllResults = [[{
    user_id: 'u1',
    total: 4,
    last_analyzed_at: 1782800100000,
  }]];

  const stats = await getReadingAnalysisStatsByUserIds(['u1', 'u2']);

  assert.deepEqual(dbCalls[0].args, ['u1', 'u2']);
  assert.deepEqual(stats.u1, { total: 4, lastAnalyzedAt: 1782800100000 });
  assert.deepEqual(stats.u2, { total: 0, lastAnalyzedAt: null });
});
