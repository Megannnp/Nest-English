import db from '../../db/database.js';

export function createQueryResult(rows = []) {
  return [rows, []];
}

export function createAffectedRowsResult(affectedRows = 1) {
  return [{ affectedRows }, []];
}

export function createMockConnection(handler) {
  const calls = [];
  let began = false;
  let committed = false;
  let rolledBack = false;
  let released = false;

  return {
    calls,
    get state() {
      return { began, committed, rolledBack, released };
    },
    async beginTransaction() {
      began = true;
    },
    async commit() {
      committed = true;
    },
    async rollback() {
      rolledBack = true;
    },
    release() {
      released = true;
    },
    async query(sql, params) {
      calls.push({ sql, params });
      return handler(sql, params, calls);
    },
  };
}

export function withMockedConnection(connection) {
  const originalGetConnection = db.pool.getConnection;
  db.pool.getConnection = async () => connection;
  return () => {
    db.pool.getConnection = originalGetConnection;
  };
}

export function createClassSummaryRow(overrides = {}) {
  return {
    id: 'class-1',
    class_name: '高二（1）班',
    class_code: 'C001',
    teacher_id: 'teacher-1',
    teacher_name: '测试教师',
    created_at: 1710000000000,
    ...overrides,
  };
}

export function createJoinedStudentUserRow(overrides = {}) {
  return {
    id: 'student-1',
    account_code: '100001',
    email: 'student@example.com',
    role: 'student',
    real_name: '学生甲',
    student_no: 'S001',
    class_id: 'class-1',
    class_name: '高二（1）班',
    ...overrides,
  };
}

export function createClassStudentRow(overrides = {}) {
  return {
    id: 'student-1',
    real_name: 'Alice',
    student_no: 'S001',
    ...overrides,
  };
}

export function createRosterRow(overrides = {}) {
  return {
    id: 'roster-1',
    student_no: 'S001',
    student_name: 'Alice',
    user_id: null,
    status: 'pending',
    ...overrides,
  };
}

export function createWritingRow(overrides = {}) {
  return {
    id: 'writing-1',
    assignment_id: 'assignment-1',
    feedback: null,
    created_at: 111,
    task_class_id: 'class-1',
    ...overrides,
  };
}
