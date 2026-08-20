/**
 * Unit tests for grammar/practiceRecordService.js
 *
 * Verifies the DB schema and the learning event side-effect.
 */
import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

// ── mocks ─────────────────────────────────────────────────────────────────────
const prepared = {
  practiceInsert: { run: null },
  progressSelect: { get: null },
  progressInsert: { run: null },
  progressUpdate: { run: null },
};
function prepareMock(sql) {
  const text = String(sql);
  if (text.includes('INSERT INTO grammar_practice_records')) return prepared.practiceInsert;
  if (text.includes('SELECT id, completed_at FROM grammar_course_progress')) return prepared.progressSelect;
  if (text.includes('INSERT INTO grammar_course_progress')) return prepared.progressInsert;
  if (text.includes('UPDATE grammar_course_progress')) return prepared.progressUpdate;
  return prepared.practiceInsert;
}
const dbMock = {
  prepare: prepareMock,
};
const leEventCalls = [];
const logErrorCalls = [];

mock.module('../db/database.js', { defaultExport: dbMock });
mock.module('../utils/logger.js', {
  namedExports: { logError: (...args) => { logErrorCalls.push(args); } },
});
mock.module('../services/learningEventService.js', {
  namedExports: {
    recordLearningEvent: async (payload) => { leEventCalls.push(payload); },
  },
});

const { savePracticeRecord, getPracticeStats } = await import('../services/grammar/practiceRecordService.js');

// ── tests ─────────────────────────────────────────────────────────────────────
test('savePracticeRecord inserts correct columns', async () => {
  let insertedArgs = null;
  let progressArgs = null;
  prepared.practiceInsert.run = (...args) => { insertedArgs = args; };
  prepared.progressSelect.get = () => null;
  prepared.progressInsert.run = (...args) => { progressArgs = args; };

  const result = await savePracticeRecord({
    userId: 'u1',
    grammarPoint: '定语从句',
    quizType: 'single',
    stage: '基础',
    difficulty: '简单',
    correctCount: 4,
    totalCount: 5,
  });

  assert.ok(result.id, 'should return a generated id');
  assert.equal(result.courseNodeId, 'attributive-clause');
  // Column order: id, userId, grammarPoint, quizType, stage, difficulty, correctCount, totalCount, created_at
  assert.equal(insertedArgs[1], 'u1');
  assert.equal(insertedArgs[2], '定语从句');
  assert.equal(insertedArgs[3], 'single');
  assert.equal(insertedArgs[6], 4);
  assert.equal(insertedArgs[7], 5);
  assert.equal(progressArgs[2], 'attributive-clause');
  assert.equal(progressArgs[3], 4);
  assert.equal(progressArgs[4], 5);
});

test('savePracticeRecord maps grammar catalog aliases to course nodes', async () => {
  const insertedNodes = [];
  prepared.practiceInsert.run = () => {};
  prepared.progressSelect.get = () => null;
  prepared.progressInsert.run = (...args) => { insertedNodes.push(args[2]); };

  const relativeAlias = await savePracticeRecord({
    userId: 'u6',
    grammarPoint: '关系代词',
    quizType: 'single',
    stage: '进阶',
    difficulty: '中等',
    correctCount: 4,
    totalCount: 5,
  });
  const adjective = await savePracticeRecord({
    userId: 'u6',
    grammarPoint: '形容词',
    quizType: 'single',
    stage: '进阶',
    difficulty: '中等',
    correctCount: 4,
    totalCount: 5,
  });
  const nonFinite = await savePracticeRecord({
    userId: 'u6',
    grammarPoint: '不定式',
    quizType: 'single',
    stage: '进阶',
    difficulty: '中等',
    correctCount: 4,
    totalCount: 5,
  });

  assert.equal(relativeAlias.courseNodeId, 'attributive-clause');
  assert.equal(adjective.courseNodeId, 'adjective');
  assert.equal(nonFinite.courseNodeId, 'phrase-by-nonfinite');
  assert.deepEqual(insertedNodes, ['attributive-clause', 'adjective', 'phrase-by-nonfinite']);
});

test('savePracticeRecord maps sentence and verb categories without collapsing aliases', async () => {
  const insertedNodes = [];
  prepared.practiceInsert.run = () => {};
  prepared.progressSelect.get = () => null;
  prepared.progressInsert.run = (...args) => { insertedNodes.push(args[2]); };

  const compound = await savePracticeRecord({
    userId: 'u7',
    grammarPoint: '并列句',
    quizType: 'single',
    stage: '进阶',
    difficulty: '中等',
    correctCount: 4,
    totalCount: 5,
  });
  const tense = await savePracticeRecord({
    userId: 'u7',
    grammarPoint: '现在完成时',
    quizType: 'single',
    stage: '进阶',
    difficulty: '中等',
    correctCount: 4,
    totalCount: 5,
  });

  assert.equal(compound.courseNodeId, 'compound-sentence');
  assert.equal(tense.courseNodeId, 'verb');
  assert.deepEqual(insertedNodes, ['compound-sentence', 'verb']);
});

test('savePracticeRecord fires a learning event with percentage score', async () => {
  prepared.practiceInsert.run = () => {};
  prepared.progressSelect.get = () => null;
  prepared.progressInsert.run = () => {};
  leEventCalls.length = 0;

  await savePracticeRecord({
    userId: 'u2',
    grammarPoint: '虚拟语气',
    quizType: 'fill',
    stage: '进阶',
    difficulty: '中等',
    correctCount: 3,
    totalCount: 5,
    prepExamId: 'ielts',
    systemId: 'system-ielts',
  });

  assert.equal(leEventCalls.length, 1);
  assert.equal(leEventCalls[0].module, 'grammar');
  assert.equal(leEventCalls[0].eventType, 'quiz_complete');
  assert.equal(leEventCalls[0].score, 60);   // 3/5 * 100
  assert.equal(leEventCalls[0].metadata.grammarPoint, '虚拟语气');
  assert.equal(leEventCalls[0].metadata.courseNodeId, 'subjunctive-sentence');
  assert.equal(leEventCalls[0].metadata.prepExamId, 'ielts');
  assert.equal(leEventCalls[0].metadata.systemId, 'system-ielts');
});

test('savePracticeRecord updates existing mapped course progress', async () => {
  let updateArgs = null;
  let insertedProgress = false;
  prepared.practiceInsert.run = () => {};
  prepared.progressSelect.get = () => ({ id: 'progress-1', completed_at: 1782800000000 });
  prepared.progressUpdate.run = (...args) => { updateArgs = args; };
  prepared.progressInsert.run = () => { insertedProgress = true; };

  const result = await savePracticeRecord({
    userId: 'u4',
    grammarPoint: '宾语从句',
    quizType: 'single',
    stage: '进阶',
    difficulty: '中等',
    correctCount: 2,
    totalCount: 5,
  });

  assert.equal(result.courseNodeId, 'object-clause');
  assert.equal(insertedProgress, false);
  assert.equal(updateArgs[0], 2);
  assert.equal(updateArgs[1], 5);
  assert.equal(updateArgs[4], 'u4');
  assert.equal(updateArgs[5], 'object-clause');
});

test('savePracticeRecord keeps main record when course progress link fails', async () => {
  let insertedArgs = null;
  prepared.practiceInsert.run = (...args) => { insertedArgs = args; };
  prepared.progressSelect.get = () => null;
  prepared.progressInsert.run = () => { throw new Error('progress unavailable'); };
  logErrorCalls.length = 0;

  const result = await savePracticeRecord({
    userId: 'u5',
    grammarPoint: '定语从句',
    quizType: 'single',
    stage: '进阶',
    difficulty: '中等',
    correctCount: 4,
    totalCount: 5,
  });

  assert.ok(result.id);
  assert.equal(result.courseNodeId, null);
  assert.equal(insertedArgs[1], 'u5');
  assert.equal(logErrorCalls[0][0], 'grammar_course_progress_link_failed');
});

test('savePracticeRecord leaves course progress untouched when grammar point cannot be mapped', async () => {
  let progressTouched = false;
  prepared.practiceInsert.run = () => {};
  prepared.progressSelect.get = () => { progressTouched = true; return null; };
  prepared.progressInsert.run = () => { progressTouched = true; };

  const result = await savePracticeRecord({
    userId: 'u3',
    grammarPoint: '自定义语法点',
    quizType: 'fill',
    stage: '进阶',
    difficulty: '中等',
    correctCount: 3,
    totalCount: 5,
  });

  assert.equal(result.courseNodeId, null);
  assert.equal(progressTouched, false);
});

test('savePracticeRecord rejects impossible score totals', async () => {
  let inserted = false;
  prepared.practiceInsert.run = () => { inserted = true; };

  await assert.rejects(
    savePracticeRecord({
      userId: 'u2',
      grammarPoint: '虚拟语气',
      quizType: 'fill',
      stage: '进阶',
      difficulty: '中等',
      correctCount: 6,
      totalCount: 5,
    }),
    /答对题数不能大于总题数/
  );

  assert.equal(inserted, false);
});

test('savePracticeRecord rejects invalid score counts before inserting', async () => {
  let inserted = false;
  prepared.practiceInsert.run = () => { inserted = true; };

  await assert.rejects(
    savePracticeRecord({
      userId: 'u2',
      grammarPoint: '虚拟语气',
      quizType: 'fill',
      stage: '进阶',
      difficulty: '中等',
      correctCount: -1,
      totalCount: 5,
    }),
    /答对题数不合法/
  );

  await assert.rejects(
    savePracticeRecord({
      userId: 'u2',
      grammarPoint: '虚拟语气',
      quizType: 'fill',
      stage: '进阶',
      difficulty: '中等',
      correctCount: 0,
      totalCount: 0,
    }),
    /总题数不合法/
  );

  assert.equal(inserted, false);
});

test('getPracticeStats returns zero totals for empty result', async () => {
  const getStub = async () => ({ sessions: 0, total_questions: 0, correct_questions: 0 });
  const allStub = async () => [];
  let callCount = 0;
  dbMock.prepare = () => {
    callCount++;
    return callCount === 1 ? { get: getStub } : { all: allStub };
  };

  const stats = await getPracticeStats('u3');
  assert.equal(stats.sessions, 0);
  assert.equal(stats.totalQuestions, 0);
  assert.equal(stats.correctQuestions, 0);
  assert.deepEqual(stats.byPoint, []);

  dbMock.prepare = prepareMock;
});
