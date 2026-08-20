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
  namedExports: { nanoid: () => 'listen-1' },
});
mock.module('../services/learningEventService.js', {
  namedExports: {
    recordLearningEvent: async () => {},
  },
});

const {
  getListeningClassProgress,
  getListeningProgressStats,
  saveListeningProgressRecord,
} = await import('../services/listeningProgressService.js');

test('saveListeningProgressRecord stores minimal listening fields and ignores the reported score', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'practice',
    score: 120,
    accuracy: 88.6,
    durationMs: 1500.4,
    metadata: { topic: '校园生活' },
  });

  assert.equal(result.id, 'listen-1');
  assert.equal(result.activityType, 'practice');
  // Nothing in the request proves an answer, so the reported score is discarded.
  assert.equal(result.score, 0);
  assert.equal(result.accuracy, 0);
  assert.equal(result.durationMs, 1500);
  assert.equal(insertedRow[0], 'listen-1');
  assert.equal(insertedRow[1], 'user-1');
  assert.equal(insertedRow[2], 'practice');
  assert.equal(insertedRow[3], 0);
  assert.equal(insertedRow[4], 0);
  assert.equal(insertedRow[5], 1500);
  assert.equal(insertedRow[6], JSON.stringify({ topic: '校园生活' }));
});

test('saveListeningProgressRecord accepts practice dictation records', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'practice-dictation',
    score: 0,
    accuracy: 0,
    durationMs: 2500,
  });

  assert.equal(result.activityType, 'practice-dictation');
  assert.equal(insertedRow[2], 'practice-dictation');
  assert.equal(insertedRow[5], 2500);
});

test('saveListeningProgressRecord overrides a forged score using the submitted answer', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'basics-word',
    score: 100,
    accuracy: 100,
    metadata: { word: 'environment', input: 'wrongword' },
  });

  assert.equal(result.score, 0);
  assert.equal(result.accuracy, 0);
  assert.equal(insertedRow[3], 0);
  assert.equal(insertedRow[4], 0);
});

test('saveListeningProgressRecord recomputes practice score from answers and answerKey', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'practice',
    score: 100,
    accuracy: 100,
    metadata: { answers: [0, 1, 2], answerKey: [0, 1, 3] },
  });

  assert.equal(result.score, 67);
  assert.equal(result.accuracy, 67);
});

test('saveListeningProgressRecord scores practice from the scenario source, ignoring a forged answer key', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'practice',
    score: 100,
    accuracy: 100,
    metadata: {
      scenarioId: 'j1',
      answers: [0, 0, 0],
      answerKey: [0, 0, 0],
    },
  });

  assert.equal(result.score, 0);
  assert.equal(result.accuracy, 0);
});

test('saveListeningProgressRecord scores practice dictation against the scenario transcript', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'practice-dictation',
    score: 0,
    accuracy: 0,
    metadata: {
      scenarioId: 'j1',
      input: 'Tom forgot his homework at home.',
      dictation: 'totally different sentence',
    },
  });

  assert.equal(result.score, 100);
  assert.equal(result.accuracy, 100);
});

test('saveListeningProgressRecord scores advanced sentences from the catalog passage, ignoring forged text', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'advanced-sentence',
    score: 100,
    accuracy: 100,
    metadata: {
      passageId: 'p1',
      sentenceIndex: 0,
      text: 'anything the client wants to claim',
      input: 'anything the client wants to claim',
    },
  });

  assert.equal(result.score, 0);
  assert.equal(result.accuracy, 0);
});

test('saveListeningProgressRecord credits an advanced sentence that matches the catalog passage', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'advanced-sentence',
    score: 0,
    accuracy: 0,
    metadata: {
      passageId: 'p1',
      sentenceIndex: 0,
      input: 'Reading is one of the best habits a person can develop.',
    },
  });

  assert.equal(result.score, 100);
  assert.equal(result.accuracy, 100);
});

test('saveListeningProgressRecord refuses credit for an invented minimal pair', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'basics-pair',
    score: 100,
    accuracy: 100,
    metadata: { pair: ['zzz', 'yyy'], selected: 'zzz', answer: 'zzz' },
  });

  assert.equal(result.score, 0);
  assert.equal(result.accuracy, 0);
});

test('saveListeningProgressRecord credits a catalog minimal pair answered correctly', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'basics-pair',
    score: 0,
    accuracy: 0,
    metadata: { pair: ['ship', 'sheep'], selected: 'sheep', answer: 'sheep' },
  });

  assert.equal(result.score, 100);
});

test('saveListeningProgressRecord refuses credit for an invented word or sentence', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const word = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'basics-word',
    score: 100,
    metadata: { word: 'notarealword', input: 'notarealword' },
  });
  assert.equal(word.score, 0);

  queuedGetResults = [];
  const sentence = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'basics-sentence',
    score: 100,
    metadata: { text: 'A sentence that is not in the catalog.', input: 'A sentence that is not in the catalog.' },
  });
  assert.equal(sentence.score, 0);
});

test('saveListeningProgressRecord refuses credit when verifiable evidence is missing', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  insertedRow = null;

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'basics-word',
    score: 100,
    accuracy: 100,
  });

  assert.equal(result.score, 0);
});

test('saveListeningProgressRecord dedupes immediate repeated records', async () => {
  dbCalls.length = 0;
  insertedRow = null;
  queuedGetResults = [{
    id: 'existing-listen',
    activity_type: 'basics-word',
    score: 100,
    accuracy: 100,
    duration_ms: 900,
    created_at: 1782800000000,
  }];

  const result = await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'basics-word',
    score: 100,
    accuracy: 100,
    metadata: { word: 'environment', input: 'environment' },
  });

  assert.equal(result.id, 'existing-listen');
  assert.equal(result.deduped, true);
  assert.equal(insertedRow, null);
});

test('saveListeningProgressRecord rate-limits excessive records', async () => {
  dbCalls.length = 0;
  insertedRow = null;
  queuedGetResults = [null, { count: 30 }];

  await assert.rejects(
    () => saveListeningProgressRecord({
      userId: 'user-1',
      activityType: 'basics-word',
      score: 100,
      accuracy: 100,
    }),
    /提交过于频繁/,
  );
  assert.equal(insertedRow, null);
});

test('saveListeningProgressRecord auto-completes matching module assignments', async () => {
  dbCalls.length = 0;
  queuedGetResults = [];
  queuedAllResults = [[{ id: 'module-assignment-1' }]];

  await saveListeningProgressRecord({
    userId: 'user-1',
    activityType: 'basics-word',
    score: 100,
    accuracy: 100,
  });

  assert.ok(dbCalls.some((call) => /FROM module_assignments ma/.test(call.sql)));
  assert.ok(dbCalls.some((call) => /INSERT INTO module_assignment_submissions/.test(call.sql)));
});

test('saveListeningProgressRecord rejects unknown activity types', async () => {
  await assert.rejects(
    () => saveListeningProgressRecord({ userId: 'user-1', activityType: 'vocab', score: 80 }),
    /不支持的听读活动类型/,
  );
});

test('getListeningClassProgress returns per-student listening stats', async () => {
  dbCalls.length = 0;
  queuedGetResults = [{ id: 'class-1' }];
  queuedAllResults = [[{
    id: 'student-1',
    real_name: '学生甲',
    nick_name: '',
    student_no: 'S001',
    sessions: 2,
    duration_ms: 120000,
    average_score: 90,
    average_accuracy: 88.6,
    last_practiced_at: 1782800000000,
  }]];

  const rows = await getListeningClassProgress({ teacherId: 'teacher-1', classId: 'class-1' });

  assert.equal(rows[0].realName, '学生甲');
  assert.equal(rows[0].studentNo, 'S001');
  assert.equal(rows[0].listeningStats.sessions, 2);
  assert.equal(rows[0].listeningStats.averageAccuracy, 89);
});

test('getListeningProgressStats returns aggregates and recent records', async () => {
  dbCalls.length = 0;
  queuedGetResults = [{
    sessions: 3,
    average_score: 83.3,
    average_accuracy: 77.8,
    duration_ms: 4200,
    last_practiced_at: 1782800000000,
  }];
  queuedAllResults = [
    [{
      activity_type: 'basics-word',
      sessions: 2,
      average_score: 100,
      average_accuracy: 100,
      last_practiced_at: 1782800000000,
    }],
    [{
      id: 'listen-1',
      activity_type: 'practice',
      score: 67,
      accuracy: 67,
      duration_ms: 1200,
      metadata_json: '{"stage":"初中"}',
      created_at: 1782800000000,
    }],
  ];

  const stats = await getListeningProgressStats('user-1');

  assert.deepEqual(dbCalls[0].args, ['user-1']);
  assert.equal(stats.sessions, 3);
  assert.equal(stats.averageScore, 83);
  assert.equal(stats.averageAccuracy, 78);
  assert.equal(stats.durationMs, 4200);
  assert.equal(stats.byActivity[0].activityType, 'basics-word');
  assert.equal(stats.recent[0].metadata.stage, '初中');
});
