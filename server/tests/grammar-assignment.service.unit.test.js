import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let insertedAssignmentArgs = null;
let taskRows = [];
let submitAssignmentRow = null;
let existingSubmissionRow = null;
let assignmentSubmissionRows = [];
const runCalls = [];
const practiceRecordCalls = [];
let practiceRecordError = null;

const dbMock = {
  pool: null,
  prepare: (sql) => ({
    run: async (...args) => {
      runCalls.push({ sql: String(sql), args });
      insertedAssignmentArgs = args;
    },
    get: async (...args) => {
      const text = String(sql);
      if (text.includes('SELECT class_id FROM users')) return { class_id: 'class-1' };
      if (text.includes('SELECT ga.*, cs.student_id')) return submitAssignmentRow;
      if (text.includes('SELECT id FROM grammar_assignment_submissions')) return existingSubmissionRow;
      if (text.includes('FROM grammar_assignments') && text.includes('WHERE id = ? AND teacher_id = ?')) {
        return { id: args[0], class_id: 'class-1' };
      }
      if (text.includes('WHERE ga.id = ? AND ga.teacher_id = ?')) {
        return {
          id: args[0],
          title: '语法任务',
          class_id: 'class-1',
          class_name: '高二（1）班',
          grammar_point: '定语从句',
          quiz_type: 'error',
          stage: insertedAssignmentArgs?.[6] || '',
          difficulty: insertedAssignmentArgs?.[7] || '',
          due_at: null,
          allow_late: 1,
          status: 'published',
          assigned_count: 1,
          completed_count: 0,
          created_at: 1782800000000,
          updated_at: 1782800000000,
        };
      }
      return null;
    },
    all: async () => String(sql).includes('FROM class_students cs')
      ? assignmentSubmissionRows
      : taskRows,
  }),
};

mock.module('../db/database.js', { defaultExport: dbMock });
mock.module('../services/classRepository.js', {
  namedExports: {
    getClassForTeacher: async () => ({ id: 'class-1', class_name: '高二（1）班' }),
    listClassMemberIds: async () => ['student-1'],
  },
});
mock.module('../utils/nanoid.js', {
  namedExports: { nanoid: () => 'grammar-assignment-1' },
});
mock.module('../services/grammar/practiceRecordService.js', {
  namedExports: {
    savePracticeRecord: async (payload) => {
      if (practiceRecordError) throw practiceRecordError;
      practiceRecordCalls.push(payload);
      return { id: 'practice-record-1' };
    },
  },
});

const {
  createGrammarAssignment,
  listGrammarAssignmentSubmissionsForTeacher,
  listGrammarAssignmentsForTeacher,
  listGrammarTasksForStudent,
  submitGrammarAssignment,
} = await import('../services/grammar/assignmentService.js');

test('createGrammarAssignment defaults optional stage and difficulty', async () => {
  insertedAssignmentArgs = null;

  await createGrammarAssignment({
    teacher: { id: 'teacher-1' },
    payload: {
      classId: 'class-1',
      title: '语法任务',
      grammarPoint: '定语从句',
      quizType: 'error',
      stage: '',
      difficulty: '',
      allowLate: true,
    },
  });

  assert.equal(insertedAssignmentArgs[6], '高中');
  assert.equal(insertedAssignmentArgs[7], '中等');
});

test('listGrammarTasksForStudent backfills default stage and difficulty for legacy tasks', async () => {
  taskRows = [{
    id: 'assignment-1',
    title: '旧语法任务',
    class_id: 'class-1',
    class_name: '高二（1）班',
    teacher_name: '老师',
    grammar_point: '虚拟语气',
    quiz_type: 'fill',
    stage: '',
    difficulty: '',
    due_at: null,
    allow_late: 1,
    submission_id: null,
    submitted_at: null,
  }];

  const tasks = await listGrammarTasksForStudent({ student: { id: 'student-1' } });

  assert.equal(tasks[0].assignment.stage, '高中');
  assert.equal(tasks[0].assignment.difficulty, '中等');
  assert.equal(tasks[0].grammarConfig.stage, '高中');
  assert.equal(tasks[0].grammarConfig.difficulty, '中等');
});

test('listGrammarAssignmentsForTeacher backfills default stage and difficulty for legacy tasks', async () => {
  taskRows = [{
    id: 'assignment-1',
    title: '旧语法任务',
    class_id: 'class-1',
    class_name: '高二（1）班',
    grammar_point: '虚拟语气',
    quiz_type: 'fill',
    stage: '',
    difficulty: '',
    due_at: null,
    allow_late: 1,
    status: 'published',
    assigned_count: 1,
    completed_count: 0,
    created_at: 1782800000000,
    updated_at: 1782800000000,
  }];

  const assignments = await listGrammarAssignmentsForTeacher({ teacherId: 'teacher-1' });

  assert.equal(assignments[0].stage, '高中');
  assert.equal(assignments[0].difficulty, '中等');
});

test('listGrammarAssignmentSubmissionsForTeacher returns submitted and pending students', async () => {
  assignmentSubmissionRows = [
    {
      id: 'student-1',
      real_name: '学生甲',
      name: '',
      student_no: 'S001',
      correct_count: 4,
      total_count: 5,
      submitted_at: 1782800100000,
    },
    {
      id: 'student-2',
      real_name: '学生乙',
      name: '',
      student_no: 'S002',
      correct_count: null,
      total_count: null,
      submitted_at: null,
    },
  ];

  const submissions = await listGrammarAssignmentSubmissionsForTeacher({
    teacherId: 'teacher-1',
    assignmentId: 'assignment-1',
  });

  assert.deepEqual(submissions, [
    {
      studentId: 'student-1',
      realName: '学生甲',
      studentNo: 'S001',
      status: 'submitted',
      correctCount: 4,
      totalCount: 5,
      submittedAt: 1782800100000,
    },
    {
      studentId: 'student-2',
      realName: '学生乙',
      studentNo: 'S002',
      status: 'pending',
      correctCount: null,
      totalCount: null,
      submittedAt: null,
    },
  ]);
});

test('submitGrammarAssignment writes a matching practice record', async () => {
  dbMock.pool = null;
  runCalls.length = 0;
  practiceRecordCalls.length = 0;
  practiceRecordError = null;
  existingSubmissionRow = null;
  submitAssignmentRow = {
    id: 'assignment-1',
    class_id: 'class-1',
    grammar_point: '虚拟语气',
    quiz_type: 'fill',
    stage: '',
    difficulty: '',
    due_at: null,
    allow_late: 1,
    student_id: 'student-1',
  };

  await submitGrammarAssignment({
    student: { id: 'student-1' },
    assignmentId: 'assignment-1',
    correctCount: 4,
    totalCount: 5,
  });

  assert.ok(runCalls.some((call) => call.sql.includes('INSERT INTO grammar_assignment_submissions')));
  assert.deepEqual(practiceRecordCalls[0], {
    userId: 'student-1',
    grammarPoint: '虚拟语气',
    quizType: 'fill',
    stage: '高中',
    difficulty: '中等',
    correctCount: 4,
    totalCount: 5,
    connection: null,
  });
});

test('submitGrammarAssignment rejects impossible score totals before database writes', async () => {
  dbMock.pool = null;
  runCalls.length = 0;
  practiceRecordCalls.length = 0;

  await assert.rejects(
    submitGrammarAssignment({
      student: { id: 'student-1' },
      assignmentId: 'assignment-1',
      correctCount: 6,
      totalCount: 5,
    }),
    /答对题数不能大于总题数/
  );

  assert.equal(runCalls.length, 0);
  assert.equal(practiceRecordCalls.length, 0);
});

test('submitGrammarAssignment rejects invalid score counts before database writes', async () => {
  dbMock.pool = null;
  runCalls.length = 0;
  practiceRecordCalls.length = 0;

  await assert.rejects(
    submitGrammarAssignment({
      student: { id: 'student-1' },
      assignmentId: 'assignment-1',
      correctCount: 0,
      totalCount: 0,
    }),
    /总题数不合法/
  );

  assert.equal(runCalls.length, 0);
  assert.equal(practiceRecordCalls.length, 0);
});

test('submitGrammarAssignment rolls back when practice record write fails', async () => {
  const txCalls = [];
  practiceRecordError = new Error('practice insert failed');
  practiceRecordCalls.length = 0;
  dbMock.pool = {
    getConnection: async () => ({
      beginTransaction: async () => txCalls.push('begin'),
      commit: async () => txCalls.push('commit'),
      rollback: async () => txCalls.push('rollback'),
      release: () => txCalls.push('release'),
      query: async (sql) => {
        const text = String(sql);
        if (text.includes('SELECT ga.*, cs.student_id')) {
          return [[{
            id: 'assignment-1',
            class_id: 'class-1',
            grammar_point: '虚拟语气',
            quiz_type: 'fill',
            stage: '高中',
            difficulty: '中等',
            due_at: null,
            allow_late: 1,
            student_id: 'student-1',
          }]];
        }
        if (text.includes('SELECT id FROM grammar_assignment_submissions')) return [[]];
        return [{ affectedRows: 1 }];
      },
    }),
  };

  await assert.rejects(
    submitGrammarAssignment({
      student: { id: 'student-1' },
      assignmentId: 'assignment-1',
      correctCount: 4,
      totalCount: 5,
    }),
    /practice insert failed/
  );

  assert.deepEqual(txCalls, ['begin', 'rollback', 'release']);
  dbMock.pool = null;
  practiceRecordError = null;
});
