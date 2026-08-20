import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const state = {
  classRow: { id: 'class-1', class_name: '高二（1）班' },
  students: [],
  writingAssignments: [],
  writingPending: [],
  grammarAssignments: [],
  grammarPractice: { sessions: 0, total_questions: 0, correct_questions: 0, last_practiced_at: null },
  grammarPending: [],
  readingPractice: { sessions: 0, total_questions: 0, correct_questions: 0, last_practiced_at: null },
  readingAnalyses: { analyses_count: 0, last_analyzed_at: null },
  vocabularyProgress: { sessions: 0, duration_ms: 0, average_score: null, average_accuracy: null, last_practiced_at: null },
  listeningProgress: { sessions: 0, duration_ms: 0, average_score: null, average_accuracy: null, last_practiced_at: null },
  phoneticsProgress: { sessions: 0, duration_ms: 0, average_score: null, average_accuracy: null, last_practiced_at: null },
  speakingProgress: { sessions: 0, duration_ms: 0, average_score: null, average_accuracy: null, last_practiced_at: null },
  moduleRows: [],
  overviewClasses: [],
};

function resetState(overrides = {}) {
  Object.assign(state, {
    classRow: { id: 'class-1', class_name: '高二（1）班' },
    students: [],
    writingAssignments: [],
    writingPending: [],
    grammarAssignments: [],
    grammarPractice: { sessions: 0, total_questions: 0, correct_questions: 0, last_practiced_at: null },
    grammarPending: [],
    readingPractice: { sessions: 0, total_questions: 0, correct_questions: 0, last_practiced_at: null },
    readingAnalyses: { analyses_count: 0, last_analyzed_at: null },
    vocabularyProgress: { sessions: 0, duration_ms: 0, average_score: null, average_accuracy: null, last_practiced_at: null },
    listeningProgress: { sessions: 0, duration_ms: 0, average_score: null, average_accuracy: null, last_practiced_at: null },
    phoneticsProgress: { sessions: 0, duration_ms: 0, average_score: null, average_accuracy: null, last_practiced_at: null },
    speakingProgress: { sessions: 0, duration_ms: 0, average_score: null, average_accuracy: null, last_practiced_at: null },
    moduleRows: [],
    overviewClasses: [],
    ...overrides,
  });
}

function allForSql(sql) {
  const text = String(sql);
  if (text.includes('FROM classes c') && text.includes('WHERE c.teacher_id = ?')) return state.overviewClasses;
  if (text.includes('FROM class_students cs') && text.includes('JOIN users u') && text.includes('WHERE cs.class_id = ?')) return state.students;
  if (text.includes('FROM assignments a') && text.includes('LEFT JOIN assignment_tasks t')) return state.writingAssignments;
  if (text.includes('FROM assignments a') && text.includes("t.status IN ('pending', 'overdue')")) return state.writingPending;
  if (text.includes('FROM grammar_assignments ga') && text.includes('LEFT JOIN class_students cs')) return state.grammarAssignments;
  if (text.includes('FROM grammar_assignments ga') && text.includes('gas.id IS NULL')) return state.grammarPending;
  if (text.includes('FROM module_assignments ma')) return state.moduleRows;
  throw new Error(`unexpected all sql: ${text}`);
}

function getForSql(sql) {
  const text = String(sql);
  if (text.includes('FROM classes') && text.includes('WHERE id = ? AND teacher_id = ?')) return state.classRow;
  if (text.includes('FROM class_students cs') && text.includes('LEFT JOIN grammar_practice_records')) return state.grammarPractice;
  if (text.includes('FROM class_students cs') && text.includes('LEFT JOIN reading_practice_records')) return state.readingPractice;
  if (text.includes('FROM class_students cs') && text.includes('LEFT JOIN reading_analyses')) return state.readingAnalyses;
  if (text.includes('LEFT JOIN vocabulary_progress_records')) return state.vocabularyProgress;
  if (text.includes('LEFT JOIN listening_progress_records')) return state.listeningProgress;
  if (text.includes('LEFT JOIN phonetics_progress_records')) return state.phoneticsProgress;
  if (text.includes('LEFT JOIN speaking_progress_records')) return state.speakingProgress;
  throw new Error(`unexpected get sql: ${text}`);
}

mock.module('../db/database.js', {
  defaultExport: {
    prepare: (sql) => ({
      get: async () => getForSql(sql),
      all: async () => allForSql(sql),
    }),
  },
});

const {
  getTeacherClassData,
  getTeacherDataOverview,
} = await import('../services/teacherDataService.js');

test('getTeacherClassData returns empty class data', async () => {
  resetState({
    students: [],
  });

  const data = await getTeacherClassData({ teacherId: 'teacher-1', classId: 'class-1' });

  assert.equal(data.classSummary.studentCount, 0);
  assert.equal(data.overall.completionRate, 0);
  assert.equal(data.writing.assignmentCount, 0);
  assert.equal(data.grammar.assignmentCount, 0);
  assert.equal(data.reading.practiceSessions, 0);
  assert.equal(data.modules.assignedCount, 0);
});

test('getTeacherClassData aggregates writing completion and teacher comments', async () => {
  resetState({
    students: [{ id: 'student-1', real_name: '学生甲', student_no: 'S001' }],
    writingAssignments: [{
      id: 'assignment-1',
      title: '作文一',
      assigned_count: 2,
      submitted_count: 1,
      returned_count: 1,
      commented_count: 1,
      last_activity_at: 1782800000000,
    }],
    writingPending: [{ student_id: 'student-2', real_name: '学生乙', student_no: 'S002' }],
  });

  const data = await getTeacherClassData({ teacherId: 'teacher-1', classId: 'class-1' });

  assert.equal(data.writing.assignmentCount, 1);
  assert.equal(data.writing.assignedCount, 2);
  assert.equal(data.writing.returnedCount, 1);
  assert.equal(data.writing.completionRate, 50);
  assert.equal(data.writing.teacherCommentCoverageRate, 100);
  assert.deepEqual(data.writing.pendingStudents[0], { id: 'student-2', name: '学生乙', studentNo: 'S002' });
});

test('getTeacherClassData aggregates grammar assignments and practice', async () => {
  resetState({
    grammarAssignments: [{
      id: 'grammar-1',
      title: '定语从句',
      assigned_count: 4,
      submitted_count: 3,
      last_submitted_at: 1782800000000,
    }],
    grammarPractice: {
      sessions: 5,
      total_questions: 40,
      correct_questions: 30,
      last_practiced_at: 1782800100000,
    },
    grammarPending: [{ student_id: 'student-1', real_name: '学生甲', student_no: 'S001' }],
  });

  const data = await getTeacherClassData({ teacherId: 'teacher-1', classId: 'class-1' });

  assert.equal(data.grammar.assignmentCount, 1);
  assert.equal(data.grammar.submittedCount, 3);
  assert.equal(data.grammar.completionRate, 75);
  assert.equal(data.grammar.practiceSessions, 5);
  assert.equal(data.grammar.accuracy, 75);
  assert.equal(data.grammar.lastPracticedAt, 1782800100000);
});

test('getTeacherClassData aggregates reading practice and analyses', async () => {
  resetState({
    readingPractice: {
      sessions: 3,
      total_questions: 20,
      correct_questions: 16,
      last_practiced_at: 1782800200000,
    },
    readingAnalyses: {
      analyses_count: 2,
      last_analyzed_at: 1782800300000,
    },
  });

  const data = await getTeacherClassData({ teacherId: 'teacher-1', classId: 'class-1' });

  assert.equal(data.reading.practiceSessions, 3);
  assert.equal(data.reading.totalQuestions, 20);
  assert.equal(data.reading.accuracy, 80);
  assert.equal(data.reading.analysesCount, 2);
  assert.equal(data.reading.lastRecordAt, 1782800300000);
});

test('getTeacherClassData aggregates module assignment manual completion', async () => {
  resetState({
    moduleRows: [{
      module_type: 'vocab',
      assignment_count: 2,
      assigned_count: 6,
      completed_count: 3,
      last_activity_at: 1782800400000,
    }],
  });

  const data = await getTeacherClassData({ teacherId: 'teacher-1', classId: 'class-1' });

  assert.equal(data.modules.assignedCount, 6);
  assert.equal(data.modules.completedCount, 3);
  assert.equal(data.modules.completionRate, 50);
  assert.equal(data.modules.completionSource, 'manual');
  assert.equal(data.modules.byModule[0].moduleType, 'vocab');
});

test('getTeacherClassData aggregates real module practice records', async () => {
  resetState({
    vocabularyProgress: { sessions: 4, duration_ms: 120000, average_score: 80, average_accuracy: 75, last_practiced_at: 1782800500000 },
    listeningProgress: { sessions: 2, duration_ms: 60000, average_score: 90, average_accuracy: 85, last_practiced_at: 1782800600000 },
    speakingProgress: { sessions: 3, duration_ms: 90000, average_score: 82, average_accuracy: null, last_practiced_at: 1782800700000 },
  });

  const data = await getTeacherClassData({ teacherId: 'teacher-1', classId: 'class-1' });

  assert.equal(data.modules.realPracticeSessions, 9);
  assert.equal(data.modules.realRecords.find((item) => item.moduleType === 'vocabulary').averageAccuracy, 75);
  assert.equal(data.modules.realRecords.find((item) => item.moduleType === 'listening').sessions, 2);
  assert.equal(data.modules.realRecords.find((item) => item.moduleType === 'speaking').sessions, 3);
  assert.equal(data.modules.realRecords.find((item) => item.moduleType === 'speaking').averageAccuracy, 0);
});

test('getTeacherDataOverview aggregates class summaries', async () => {
  resetState({
    overviewClasses: [{ id: 'class-1', class_name: '高二（1）班', student_count: 2 }],
    students: [{ id: 'student-1', real_name: '学生甲' }, { id: 'student-2', real_name: '学生乙' }],
    writingAssignments: [{ id: 'a1', title: '作文', assigned_count: 2, submitted_count: 2, returned_count: 1, commented_count: 0 }],
    grammarAssignments: [{ id: 'g1', title: '语法', assigned_count: 2, submitted_count: 1 }],
    moduleRows: [{ module_type: 'reading', assignment_count: 1, assigned_count: 2, completed_count: 1 }],
  });

  const data = await getTeacherDataOverview({ teacherId: 'teacher-1' });

  assert.equal(data.summary.classCount, 1);
  assert.equal(data.summary.studentCount, 2);
  assert.equal(data.summary.assignedCount, 6);
  assert.equal(data.summary.completedCount, 3);
  assert.equal(data.summary.completionRate, 50);
  assert.equal(data.classes[0].className, '高二（1）班');
});
