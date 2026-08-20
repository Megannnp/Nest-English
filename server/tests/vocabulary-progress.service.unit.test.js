import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const dbCalls = [];
let queuedGetResults = [];
let queuedAllResults = [];
let insertedRow = null;

const dbMock = {
  prepare: (sql) => ({
    run: async (...args) => {
      dbCalls.push({ sql, args });
      insertedRow = args;
      return { changes: 1 };
    },
    get: async (...args) => {
      dbCalls.push({ sql, args });
      return queuedGetResults.shift() || null;
    },
    all: async (...args) => {
      dbCalls.push({ sql, args });
      return queuedAllResults.shift() || [];
    },
  }),
};

mock.module('../db/database.js', { defaultExport: dbMock });
mock.module('../utils/nanoid.js', {
  namedExports: { nanoid: () => 'vocab-1' },
});
mock.module('../services/learningEventService.js', {
  namedExports: {
    recordLearningEvent: async () => {},
  },
});

const {
  getVocabularyClassStats,
  getVocabularyProgressStats,
  saveVocabularyProgressRecord,
} = await import('../services/vocabularyProgressService.js');

test('saveVocabularyProgressRecord stores minimal vocabulary fields', async () => {
  dbCalls.length = 0;
  insertedRow = null;

  const result = await saveVocabularyProgressRecord({
    userId: 'user-1',
    activityType: 'flashcard',
    score: 100,
    accuracy: 100,
    durationMs: 900.8,
    metadata: { word: 'analyze' },
  });

  assert.equal(result.id, 'vocab-1');
  assert.equal(result.activityType, 'flashcard');
  assert.equal(result.score, 100);
  assert.equal(result.accuracy, 100);
  assert.equal(result.durationMs, 901);
  assert.equal(insertedRow[0], 'vocab-1');
  assert.equal(insertedRow[1], 'user-1');
  assert.equal(insertedRow[2], 'flashcard');
  assert.equal(insertedRow[3], 100);
  assert.equal(insertedRow[4], 100);
  assert.equal(insertedRow[5], 901);
  assert.equal(insertedRow[6], JSON.stringify({ word: 'analyze' }));
});

test('saveVocabularyProgressRecord rejects unknown activity types', async () => {
  await assert.rejects(
    () => saveVocabularyProgressRecord({ userId: 'user-1', activityType: 'phonetics', score: 80 }),
    /不支持的词汇活动类型/,
  );
});

test('getVocabularyProgressStats returns aggregates and recent records', async () => {
  dbCalls.length = 0;
  queuedGetResults = [{
    sessions: 4,
    average_score: 92.5,
    average_accuracy: 88.4,
    duration_ms: 3000,
    last_practiced_at: 1782800000000,
  }];
  queuedAllResults = [
    [{
      activity_type: 'flashcard',
      sessions: 2,
      average_score: 85,
      average_accuracy: 85,
      last_practiced_at: 1782800000000,
    }],
    [{
      id: 'vocab-1',
      activity_type: 'quiz',
      score: 100,
      accuracy: 100,
      duration_ms: null,
      metadata_json: '{"word":"advocate"}',
      created_at: 1782800000000,
    }],
  ];

  const stats = await getVocabularyProgressStats('user-1');

  assert.deepEqual(dbCalls[0].args, ['user-1']);
  assert.equal(stats.sessions, 4);
  assert.equal(stats.averageScore, 93);
  assert.equal(stats.averageAccuracy, 88);
  assert.equal(stats.durationMs, 3000);
  assert.equal(stats.byActivity[0].activityType, 'flashcard');
  assert.equal(stats.recent[0].metadata.word, 'advocate');
});

test('getVocabularyClassStats returns empty map for no user ids', async () => {
  const stats = await getVocabularyClassStats([]);
  assert.deepEqual(stats, {});
});

test('getVocabularyClassStats aggregates per-student rows keyed by user id', async () => {
  dbCalls.length = 0;
  queuedAllResults = [[
    { user_id: 'user-1', sessions: 3, average_score: 90, average_accuracy: 88.6, last_practiced_at: 1782800000000 },
    { user_id: 'user-2', sessions: 1, average_score: null, average_accuracy: null, last_practiced_at: 1782700000000 },
  ]];

  const stats = await getVocabularyClassStats(['user-1', 'user-2']);

  assert.deepEqual(dbCalls[0].args, ['user-1', 'user-2']);
  assert.equal(stats['user-1'].sessions, 3);
  assert.equal(stats['user-1'].averageScore, 90);
  assert.equal(stats['user-1'].averageAccuracy, 89);
  assert.equal(stats['user-2'].averageScore, 0);
  assert.equal(stats['user-2'].averageAccuracy, 0);
  assert.equal(stats['user-3'], undefined);
});
