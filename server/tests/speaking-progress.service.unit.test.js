import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const dbCalls = [];
let queuedGetResults = [];
let queuedAllResults = [];
let insertedRow = null;
let completedAssignmentPayload = null;

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
  namedExports: { nanoid: () => 'speak-1' },
});
mock.module('../services/learningEventService.js', {
  namedExports: {
    recordLearningEvent: async () => {},
  },
});
mock.module('../services/moduleAssignmentService.js', {
  namedExports: {
    completeOpenModuleAssignmentsForStudent: async (payload) => {
      completedAssignmentPayload = payload;
      return [];
    },
  },
});

const {
  getSpeakingPracticeQuestions,
  getSpeakingProgressStats,
  getSpeakingProgressStatsByUserIds,
  saveSpeakingProgressRecord,
} = await import('../services/speakingProgressService.js');

test('getSpeakingPracticeQuestions maps modular speaking rows', async () => {
  dbCalls.length = 0;
  queuedAllResults = [[{
    id: 'question-1',
    question_type: 'opinion',
    content: '',
    estimated_time: 90,
    score: 10,
    prompt: 'Do you like online learning?',
    sample_answer: 'Yes, because it is flexible.',
    scoring_rubric: '{"fluency":40}',
    prep_time: 30,
    response_time: 60,
  }]];

  const rows = await getSpeakingPracticeQuestions({ limit: 200 });

  assert.deepEqual(dbCalls[0].args, [50]);
  assert.equal(rows[0].id, 'question-1');
  assert.equal(rows[0].type, 'opinion');
  assert.equal(rows[0].prompt, 'Do you like online learning?');
  assert.equal(rows[0].scoringRubric.fluency, 40);
  assert.equal(rows[0].responseTime, 60);
});

test('getSpeakingPracticeQuestions filters rows by system id', async () => {
  dbCalls.length = 0;
  queuedAllResults = [[{
    id: 'question-ielts',
    system_id: 'system-ielts',
    question_type: 'opinion',
    content: '',
    estimated_time: 90,
    score: 10,
    prompt: 'Do you prefer studying alone?',
    sample_answer: '',
    scoring_rubric: null,
    prep_time: 30,
    response_time: 60,
  }]];

  const rows = await getSpeakingPracticeQuestions({ limit: 20, systemId: 'system-ielts' });

  assert.match(dbCalls[0].sql, /q\.system_id = \?/);
  assert.deepEqual(dbCalls[0].args, ['system-ielts', 20]);
  assert.equal(rows[0].systemId, 'system-ielts');
});

test('saveSpeakingProgressRecord stores transcript and completes speaking tasks', async () => {
  dbCalls.length = 0;
  insertedRow = null;
  completedAssignmentPayload = null;

  const result = await saveSpeakingProgressRecord({
    userId: 'user-1',
    activityType: 'opinion',
    questionId: 'question-1',
    transcript: 'I think students should speak English every day.',
    score: 120,
    durationMs: 1500.4,
    feedback: 'Good length.',
    metadata: { wordCount: 8 },
  });

  assert.equal(result.id, 'speak-1');
  assert.equal(result.activityType, 'opinion');
  assert.equal(result.score, 100);
  assert.equal(result.durationMs, 1500);
  assert.equal(insertedRow[0], 'speak-1');
  assert.equal(insertedRow[1], 'user-1');
  assert.equal(insertedRow[2], 'question-1');
  assert.equal(insertedRow[3], 'opinion');
  assert.equal(insertedRow[4], 'I think students should speak English every day.');
  assert.equal(insertedRow[5], 100);
  assert.equal(insertedRow[6], 1500);
  assert.equal(insertedRow[7], 'Good length.');
  assert.equal(insertedRow[8], JSON.stringify({ wordCount: 8 }));
  assert.deepEqual(completedAssignmentPayload.moduleTypes, ['speaking']);
  assert.equal(completedAssignmentPayload.source.progressRecordId, 'speak-1');
});

test('saveSpeakingProgressRecord accepts question-bank speaking activity types', async () => {
  dbCalls.length = 0;
  insertedRow = null;

  const result = await saveSpeakingProgressRecord({
    userId: 'user-1',
    activityType: 'description',
    transcript: 'This picture shows a student reading in a bright library.',
    score: 80,
  });

  assert.equal(result.activityType, 'description');
  assert.equal(insertedRow[3], 'description');
});

test('saveSpeakingProgressRecord rejects unknown activity types', async () => {
  await assert.rejects(
    () => saveSpeakingProgressRecord({ userId: 'user-1', activityType: 'vocab', score: 80 }),
    /不支持的口语活动类型/,
  );
});

test('saveSpeakingProgressRecord rejects empty transcripts', async () => {
  await assert.rejects(
    () => saveSpeakingProgressRecord({ userId: 'user-1', activityType: 'opinion', transcript: '   ', score: 80 }),
    /请先完成口语回答/,
  );
});

test('saveSpeakingProgressRecord rejects too-short transcripts', async () => {
  await assert.rejects(
    () => saveSpeakingProgressRecord({ userId: 'user-1', activityType: 'opinion', transcript: 'hello', score: 80 }),
    /口语回答太短/,
  );
});

test('getSpeakingProgressStatsByUserIds returns per-student speaking stats keyed by user id', async () => {
  dbCalls.length = 0;
  queuedAllResults = [[{
    user_id: 'student-1',
    sessions: 3,
    duration_ms: 6000,
    average_score: 78.6,
    last_practiced_at: 1782800000000,
  }]];

  const stats = await getSpeakingProgressStatsByUserIds(['student-1', 'student-2']);

  assert.deepEqual(dbCalls[0].args, ['student-1', 'student-2']);
  assert.equal(stats['student-1'].sessions, 3);
  assert.equal(stats['student-1'].averageScore, 79);
  assert.equal(stats['student-2'].sessions, 0);
  assert.equal(stats['student-2'].averageScore, 0);
});

test('getSpeakingProgressStatsByUserIds returns an empty map for no user ids', async () => {
  const stats = await getSpeakingProgressStatsByUserIds([]);
  assert.deepEqual(stats, {});
});

test('getSpeakingProgressStats returns aggregates and recent records', async () => {
  dbCalls.length = 0;
  queuedGetResults = [{
    sessions: 4,
    average_score: 82.6,
    duration_ms: 8200,
    last_practiced_at: 1782800000000,
  }];
  queuedAllResults = [
    [{
      activity_type: 'conversation',
      sessions: 2,
      average_score: 90,
      last_practiced_at: 1782800000000,
    }],
    [{
      id: 'speak-1',
      question_id: 'question-1',
      activity_type: 'opinion',
      transcript: 'I agree with this idea.',
      score: 83,
      duration_ms: 1200,
      feedback: 'Add one example.',
      metadata_json: '{"wordCount":5}',
      created_at: 1782800000000,
    }],
  ];

  const stats = await getSpeakingProgressStats('user-1');

  assert.deepEqual(dbCalls[0].args, ['user-1']);
  assert.equal(stats.sessions, 4);
  assert.equal(stats.averageScore, 83);
  assert.equal(stats.durationMs, 8200);
  assert.equal(stats.byActivity[0].activityType, 'conversation');
  assert.equal(stats.recent[0].metadata.wordCount, 5);
  assert.equal(stats.recent[0].feedback, 'Add one example.');
});
