import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const state = {
  children: [],
  bindCodeRow: null,
  childAccessRow: null,
  writingSummary: { total_writings: 0, average_score: null },
  recentWritings: [],
  taskSummary: { pending_tasks: 0, returned_tasks: 0 },
  recentTasks: [],
  userClassRow: null,
  existingBindCode: null,
  generatedCodeExists: null,
  consumeBindCodeAffectedRows: 1,
  pointsSummary: {
    balance: 0,
    pendingPoints: 0,
    totalEarned: 0,
    totalSpent: 0,
    membership: null,
    quotaUsages: [],
    entitlements: [],
  },
  learningEvents: [],
  grammarStats: { sessions: 0 },
  readingPracticeStats: { sessions: 0 },
  readingAnalysisStats: { sessions: 0 },
  vocabularyStats: { sessions: 0 },
  listeningStats: { sessions: 0 },
  phoneticsStats: { sessions: 0 },
  runCalls: [],
};

function resetState(overrides = {}) {
  Object.assign(state, {
    children: [],
    bindCodeRow: null,
    childAccessRow: null,
    writingSummary: { total_writings: 0, average_score: null },
    recentWritings: [],
    taskSummary: { pending_tasks: 0, returned_tasks: 0 },
    recentTasks: [],
    userClassRow: null,
    existingBindCode: null,
    generatedCodeExists: null,
    consumeBindCodeAffectedRows: 1,
    pointsSummary: {
      balance: 0,
      pendingPoints: 0,
      totalEarned: 0,
      totalSpent: 0,
      membership: null,
      quotaUsages: [],
      entitlements: [],
    },
    learningEvents: [],
    grammarStats: { sessions: 0 },
    readingPracticeStats: { sessions: 0 },
    readingAnalysisStats: { sessions: 0 },
    vocabularyStats: { sessions: 0 },
    listeningStats: { sessions: 0 },
    phoneticsStats: { sessions: 0 },
    runCalls: [],
    ...overrides,
  });
}

mock.module('../db/database.js', {
  defaultExport: {
    prepare: (sql) => ({
      all: async () => {
        const text = String(sql);
        if (text.includes('FROM parent_student_links')) return state.children;
        if (text.includes('FROM writings') && text.includes('ORDER BY created_at DESC')) return state.recentWritings;
        if (text.includes('FROM assignment_tasks t')) return state.recentTasks;
        throw new Error(`unexpected all sql: ${sql}`);
      },
      get: async () => {
        const text = String(sql);
        if (text.includes('COUNT(*) AS total_writings')) return state.writingSummary;
        if (text.includes('SUM(CASE WHEN status')) return state.taskSummary;
        if (text.includes('JOIN users u ON u.id = l.student_user_id') && text.includes('l.student_user_id = ?')) return state.childAccessRow;
        if (text.includes('SELECT class_id FROM users')) return state.userClassRow;
        if (text.includes('FROM parent_binding_codes c')) return state.bindCodeRow;
        if (text.includes('SELECT code, expires_at')) return state.existingBindCode;
        if (text.includes('SELECT id FROM parent_binding_codes')) return state.generatedCodeExists;
        throw new Error(`unexpected get sql: ${sql}`);
      },
      run: async (...params) => {
        state.runCalls.push({ sql: String(sql), params });
        if (String(sql).includes('UPDATE parent_binding_codes')) {
          return { changes: state.consumeBindCodeAffectedRows };
        }
        return { affectedRows: 1 };
      },
    }),
  },
});

mock.module('../services/pointsService.js', {
  namedExports: {
    awardPointsForLearningEvent: async () => null,
    getPointsSummary: async () => state.pointsSummary,
    toDateKey: (timestamp = Date.now()) => new Date(Number(timestamp) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10),
  },
});

mock.module('../services/assignmentService.js', {
  namedExports: { listAssignmentTasksForStudent: async () => state.recentTasks },
});
mock.module('../services/grammar/assignmentService.js', {
  namedExports: { listGrammarTasksForStudent: async () => [] },
});
mock.module('../services/moduleAssignmentService.js', {
  namedExports: {
    listModuleTasksForStudent: async () => [],
    completeOpenModuleAssignmentsForStudent: async () => null,
  },
});
mock.module('../services/grammar/practiceRecordService.js', {
  namedExports: { getPracticeStats: async () => state.grammarStats },
});
mock.module('../services/reading/practiceService.js', {
  namedExports: { getReadingPracticeStats: async () => state.readingPracticeStats },
});
mock.module('../services/reading/analysisRecordService.js', {
  namedExports: { getReadingAnalysisStats: async () => state.readingAnalysisStats },
});
mock.module('../services/vocabularyProgressService.js', {
  namedExports: { getVocabularyProgressStats: async () => state.vocabularyStats },
});
mock.module('../services/listeningProgressService.js', {
  namedExports: { getListeningProgressStats: async () => state.listeningStats },
});
mock.module('../services/phoneticsProgressService.js', {
  namedExports: { getPhoneticsProgressStats: async () => state.phoneticsStats },
});
mock.module('../services/learningEventService.js', {
  namedExports: { getRecentLearningEvents: async () => state.learningEvents },
});

const {
  bindParentStudent,
  getParentChildEntitlements,
  getParentChildProgress,
  getParentChildTasks,
  getStudentParentBindCode,
  getParentOverview,
} = await import('../services/parentService.js');

test('getParentOverview aggregates linked child writing and task counts', async () => {
  resetState({
    children: [{
      id: 'student-1',
      account_code: '123456',
      real_name: '学生甲',
      student_no: 'S001',
      class_name: '高一（1）班',
    }],
    writingSummary: { total_writings: 2, average_score: 19 },
    taskSummary: { pending_tasks: 1, returned_tasks: 1 },
    recentWritings: [
      { id: 'w1', writing_title: '作文一', created_at: 100, total_score: 18 },
      { id: 'w2', writing_title: '作文二', created_at: 90, total_score: 20 },
    ],
    recentTasks: [
      { id: 'task-1', status: 'pending', title: '作文作业', class_name: '高一（1）班' },
      { id: 'task-2', status: 'returned', latest_score: 18, title: '已批作业', class_name: '高一（1）班' },
    ],
  });

  const result = await getParentOverview({
    parentId: 'parent-1',
    user: { id: 'parent-1', role: 'parent' },
  });

  assert.equal(result.summary.childCount, 1);
  assert.equal(result.summary.totalWritings, 2);
  assert.equal(result.summary.pendingTasks, 1);
  assert.equal(result.children[0].summary.averageScore, 19);
});

test('bindParentStudent rejects non-parent callers', async () => {
  await assert.rejects(
    () => bindParentStudent({
      parentId: 'teacher-1',
      user: { id: 'teacher-1', role: 'teacher' },
      studentBindCode: 'ABCD2345',
    }),
    /家长身份/
  );
});

test('bindParentStudent links a student by one-time bind code', async () => {
  resetState({
    bindCodeRow: { code_id: 'code-1', student_user_id: 'student-1', role: 'student' },
  });

  await bindParentStudent({
    parentId: 'parent-1',
    user: { id: 'parent-1', role: 'parent' },
    studentBindCode: 'ABCD2345',
  });

  assert.equal(state.runCalls.length, 2);
  assert.match(state.runCalls[0].sql, /UPDATE parent_binding_codes/);
  assert.equal(state.runCalls[0].params[2], 'code-1');
  assert.equal(state.runCalls[1].params[1], 'parent-1');
  assert.equal(state.runCalls[1].params[2], 'student-1');
});

test('bindParentStudent rejects a bind code consumed by another request', async () => {
  resetState({
    bindCodeRow: { code_id: 'code-1', student_user_id: 'student-1', role: 'student' },
    consumeBindCodeAffectedRows: 0,
  });

  await assert.rejects(
    () => bindParentStudent({
      parentId: 'parent-1',
      user: { id: 'parent-1', role: 'parent' },
      studentBindCode: 'ABCD2345',
    }),
    /绑定码无效或已过期/
  );

  assert.equal(state.runCalls.length, 1);
  assert.match(state.runCalls[0].sql, /UPDATE parent_binding_codes/);
});

test('getStudentParentBindCode reuses an active unconsumed code', async () => {
  resetState({
    existingBindCode: { code: 'ABCD2345', expires_at: Date.now() + 1000 },
  });

  const result = await getStudentParentBindCode({
    studentId: 'student-1',
    user: { id: 'student-1', role: 'student' },
  });

  assert.equal(result.code, 'ABCD2345');
  assert.equal(state.runCalls.length, 0);
});

test('getStudentParentBindCode rejects non-students', async () => {
  await assert.rejects(
    () => getStudentParentBindCode({
      studentId: 'parent-1',
      user: { id: 'parent-1', role: 'parent' },
    }),
    /学生身份/
  );
});

test('getParentChildTasks rejects unbound children', async () => {
  resetState({ childAccessRow: null });

  await assert.rejects(
    () => getParentChildTasks({
      parentId: 'parent-1',
      childId: 'student-2',
      user: { id: 'parent-1', role: 'parent' },
    }),
    /未找到已绑定的学生/
  );
});

test('getParentChildEntitlements exposes child subscription and points summary', async () => {
  resetState({
    childAccessRow: {
      id: 'student-1',
      real_name: '学生甲',
      student_no: 'S001',
      class_name: '高一（1）班',
    },
    pointsSummary: {
      balance: 120,
      pendingPoints: 10,
      totalEarned: 300,
      totalSpent: 180,
      membership: { tier: 'premium', expiresAt: 1785600000000 },
      quotaUsages: [{ unit: 'writing_review', quota: 10, used: 2, balance: 8 }],
      entitlements: [{ unit: 'sentence_analysis', balance: 20, totalAdded: 30, totalUsed: 10 }],
    },
  });

  const result = await getParentChildEntitlements({
    parentId: 'parent-1',
    childId: 'student-1',
    user: { id: 'parent-1', role: 'parent' },
  });

  assert.equal(result.balance, 120);
  assert.equal(result.pendingPoints, 10);
  assert.equal(result.membership.tier, 'premium');
  assert.equal(result.quotaUsages[0].balance, 8);
  assert.equal(result.entitlements[0].unit, 'sentence_analysis');
});

test('getParentChildProgress builds a parent-friendly weekly report', async () => {
  const now = Date.now();
  resetState({
    childAccessRow: {
      id: 'student-1',
      real_name: '学生甲',
      student_no: 'S001',
      class_name: '高一（1）班',
    },
    writingSummary: { total_writings: 3, average_score: 18 },
    vocabularyStats: { sessions: 4 },
    pointsSummary: {
      balance: 120,
      pendingPoints: 10,
      totalEarned: 300,
      totalSpent: 180,
      membership: null,
      quotaUsages: [{ unit: 'writing_review', quota: 10, used: 2, balance: 8 }],
      entitlements: [{ unit: 'sentence_analysis', balance: 20, totalAdded: 30, totalUsed: 10 }],
    },
    recentTasks: [
      { id: 'task-1', taskType: 'writing', status: 'pending', title: '周记' },
      { id: 'task-2', taskType: 'grammar', status: 'overdue', title: '语法练习' },
      { id: 'task-3', taskType: 'reading', status: 'completed', title: '阅读训练' },
    ],
    learningEvents: [
      { id: 'e1', module: 'writing', eventType: 'submission', createdAt: now },
      { id: 'e2', module: 'vocabulary', eventType: 'practice_complete', createdAt: now - 24 * 60 * 60 * 1000 },
      { id: 'old', module: 'reading', eventType: 'practice_complete', createdAt: now - 10 * 24 * 60 * 60 * 1000 },
    ],
  });

  const result = await getParentChildProgress({
    parentId: 'parent-1',
    childId: 'student-1',
    user: { id: 'parent-1', role: 'parent' },
  });

  assert.equal(result.weekly.totalEvents, 2);
  assert.equal(result.weekly.activeDays, 2);
  assert.equal(result.weekly.taskSummary.pending, 1);
  assert.equal(result.weekly.taskSummary.overdue, 1);
  assert.equal(result.weekly.taskSummary.completed, 1);
  assert.equal(result.weekly.entitlementSummary.balance, 120);
  assert.equal(result.weekly.entitlementSummary.totalSpent, 180);
  assert.equal(result.weekly.entitlementSummary.entitlementCount, 1);
  assert.equal(result.weekly.entitlementSummary.usedQuotaCount, 2);
  assert.equal(result.weekly.moduleBreakdown[0].module, 'writing');
  assert.match(result.weekly.suggestions.join('\n'), /逾期任务/);
});
