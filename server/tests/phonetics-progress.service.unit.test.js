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
  namedExports: { nanoid: () => 'phonetics-1' },
});
mock.module('../services/learningEventService.js', {
  namedExports: {
    recordLearningEvent: async () => {},
  },
});

const {
  getPhoneticsProgressStats,
  getPhoneticsProgressStatsByUserIds,
  savePhoneticsProgressRecord,
} = await import('../services/phoneticsProgressService.js');

test('savePhoneticsProgressRecord stores minimal phonetics fields', async () => {
  dbCalls.length = 0;
  insertedRow = null;

  const result = await savePhoneticsProgressRecord({
    userId: 'user-1',
    activityType: 'sentence-practice',
    score: 100,
    accuracy: 99.6,
    durationMs: 1200.4,
    metadata: { text: 'The students are studying.' },
  });

  assert.equal(result.id, 'phonetics-1');
  assert.equal(result.activityType, 'sentence-practice');
  assert.equal(result.score, 100);
  assert.equal(result.accuracy, 100);
  assert.equal(result.durationMs, 1200);
  assert.equal(insertedRow[0], 'phonetics-1');
  assert.equal(insertedRow[1], 'user-1');
  assert.equal(insertedRow[2], 'sentence-practice');
  assert.equal(insertedRow[3], 100);
  assert.equal(insertedRow[4], 100);
  assert.equal(insertedRow[5], 1200);
  assert.equal(insertedRow[6], JSON.stringify({ text: 'The students are studying.' }));
});

test('savePhoneticsProgressRecord accepts discourse practice records', async () => {
  dbCalls.length = 0;
  insertedRow = null;

  const result = await savePhoneticsProgressRecord({
    userId: 'user-1',
    activityType: 'discourse-practice',
    metadata: { sentenceCount: 3 },
  });

  assert.equal(result.activityType, 'discourse-practice');
  assert.equal(insertedRow[2], 'discourse-practice');
  assert.equal(insertedRow[6], JSON.stringify({ sentenceCount: 3 }));
});

test('savePhoneticsProgressRecord rejects unknown activity types', async () => {
  await assert.rejects(
    () => savePhoneticsProgressRecord({ userId: 'user-1', activityType: 'vocab', score: 80 }),
    /不支持的语音活动类型/,
  );
});

test('getPhoneticsProgressStats returns aggregates and recent records', async () => {
  dbCalls.length = 0;
  queuedGetResults = [{
    sessions: 5,
    average_score: 94.2,
    average_accuracy: 91.5,
    duration_ms: 5200,
    last_practiced_at: 1782800000000,
  }];
  queuedAllResults = [
    [{
      activity_type: 'sound-practice',
      sessions: 3,
      average_score: 100,
      average_accuracy: 100,
      last_practiced_at: 1782800000000,
    }],
    [{
      id: 'phonetics-1',
      activity_type: 'word-practice',
      score: 100,
      accuracy: 100,
      duration_ms: null,
      metadata_json: '{"word":"student"}',
      created_at: 1782800000000,
    }],
  ];

  const stats = await getPhoneticsProgressStats('user-1');

  assert.deepEqual(dbCalls[0].args, ['user-1']);
  assert.equal(stats.sessions, 5);
  assert.equal(stats.averageScore, 94);
  assert.equal(stats.averageAccuracy, 92);
  assert.equal(stats.durationMs, 5200);
  assert.equal(stats.byActivity[0].activityType, 'sound-practice');
  assert.equal(stats.recent[0].metadata.word, 'student');
});

test('getPhoneticsProgressStatsByUserIds returns real aggregates and zero rows for inactive students', async () => {
  dbCalls.length = 0;
  queuedAllResults = [[{
    user_id: 'user-1',
    sessions: 4,
    duration_ms: 8000,
    average_score: 88.4,
    average_accuracy: 91.6,
    last_practiced_at: 1782800000000,
  }]];

  const stats = await getPhoneticsProgressStatsByUserIds(['user-1', 'user-2', 'user-1', '']);

  assert.deepEqual(dbCalls[0].args, ['user-1', 'user-2']);
  assert.equal(stats['user-1'].sessions, 4);
  assert.equal(stats['user-1'].durationMs, 8000);
  assert.equal(stats['user-1'].averageScore, 88);
  assert.equal(stats['user-1'].averageAccuracy, 92);
  assert.equal(stats['user-1'].lastPracticedAt, 1782800000000);
  assert.deepEqual(stats['user-2'], {
    sessions: 0,
    durationMs: 0,
    averageScore: 0,
    averageAccuracy: 0,
    lastPracticedAt: null,
  });
});

test('getPhoneticsProgressStatsByUserIds returns empty object for no user ids', async () => {
  const stats = await getPhoneticsProgressStatsByUserIds([]);
  assert.deepEqual(stats, {});
});
