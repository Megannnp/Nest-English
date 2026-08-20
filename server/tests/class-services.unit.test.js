import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import {
  createAffectedRowsResult,
  createClassSummaryRow,
  createJoinedStudentUserRow,
  createQueryResult,
} from './fixtures/classJoinFixtures.js';
import {
  deleteClassForTeacher,
  listClassesForTeacher,
  updateClassNameForTeacher,
} from '../services/classCrudService.js';
import { joinClassForStudent } from '../services/classMembershipService.js';
import {
  importClassRosterForTeacher,
  linkClassRosterUserForTeacher,
} from '../services/classRosterService.js';

test('class crud service returns teacher class list with joined student ids', async (t) => {
  t.mock.method(db.pool, 'query', async (sql, params = []) => {
    if (String(sql).includes('SELECT * FROM classes WHERE teacher_id = ?')) {
      assert.equal(params[0], 'teacher-1');
      return createQueryResult([createClassSummaryRow()]);
    }
    if (String(sql).includes('SELECT class_id, student_id FROM class_students WHERE class_id IN')) {
      assert.deepEqual(params, ['class-1']);
      return createQueryResult([
        { class_id: 'class-1', student_id: 'student-1' },
        { class_id: 'class-1', student_id: 'student-2' },
      ]);
    }
    throw new Error(`unexpected sql: ${sql}`);
  });

  const data = await listClassesForTeacher('teacher-1');
  assert.deepEqual(data, [{
    id: 'class-1',
    className: '高二（1）班',
    classCode: 'C001',
    teacherId: 'teacher-1',
    teacherName: '测试教师',
    createdAt: 1710000000000,
    students: ['student-1', 'student-2'],
  }]);
});

test('class membership service returns joined class payload for student', async (t) => {
  t.mock.method(db.pool, 'query', async (sql) => {
    if (String(sql).includes('SELECT * FROM classes WHERE id = ?')) {
      return createQueryResult([{
        ...createClassSummaryRow(),
        password: '123456',
      }]);
    }
    if (String(sql).includes('SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ?')) {
      return createQueryResult([createJoinedStudentUserRow()]);
    }
    throw new Error(`unexpected pool sql: ${sql}`);
  });

  t.mock.method(db.pool, 'getConnection', async () => ({
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, params = []) {
      if (String(sql).includes('UPDATE classes SET password = ? WHERE id = ?')) {
        assert.equal(params[1], 'class-1');
        return createAffectedRowsResult();
      }
      if (String(sql).includes('SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ? LIMIT 1')) {
        assert.equal(params[0], 'student-1');
        return createQueryResult([createJoinedStudentUserRow({ class_id: null, class_name: '' })]);
      }
      if (String(sql).includes('INSERT INTO class_students')) {
        return createAffectedRowsResult();
      }
      if (String(sql).includes('UPDATE users SET class_id = ?, class_name = ? WHERE id = ?')) {
        assert.deepEqual(params, ['class-1', '高二（1）班', 'student-1']);
        return createAffectedRowsResult();
      }
      if (String(sql).includes('FROM student_roster') && String(sql).includes('student_no = ?')) {
        return createQueryResult();
      }
      throw new Error(`unexpected connection sql: ${sql}`);
    },
  }));

  const data = await joinClassForStudent({
    user: { id: 'student-1', role: 'student' },
    classId: 'class-1',
    password: '123456',
  });

  assert.deepEqual(data, {
    classId: 'class-1',
    className: '高二（1）班',
    rosterMatched: false,
    matchedRosterId: null,
    matchedRosterName: '',
    user: {
      id: 'student-1',
      accountCode: '100001',
      name: '学生甲',
      email: 'student@example.com',
      role: 'student',
      realName: '学生甲',
      studentNo: 'S001',
      classId: 'class-1',
      className: '高二（1）班',
    },
  });
});

test('class roster service imports roster items and returns mapped pending rows', async (t) => {
  t.mock.method(db.pool, 'query', async (sql, params = []) => {
    if (String(sql).includes('SELECT * FROM classes WHERE id = ? AND teacher_id = ?')) {
      assert.deepEqual(params, ['class-1', 'teacher-1']);
      return createQueryResult([createClassSummaryRow()]);
    }
    if (String(sql).includes('INSERT INTO student_roster')) {
      return createAffectedRowsResult();
    }
    if (String(sql).includes('FROM student_roster sr') && String(sql).includes('LEFT JOIN users u ON u.id = sr.user_id')) {
      return createQueryResult([
        {
          id: 'roster-1',
          class_id: 'class-1',
          student_no: 'S001',
          student_name: '学生甲',
          user_id: null,
          linked_user_name: null,
          linked_user_email: null,
          status: 'pending',
          created_at: 1710000000100,
          updated_at: 1710000000200,
        },
      ]);
    }
    throw new Error(`unexpected sql: ${sql}`);
  });

  const data = await importClassRosterForTeacher({
    teacherId: 'teacher-1',
    classId: 'class-1',
    items: [
      { studentNo: 'S001', studentName: '学生甲' },
    ],
  });

  assert.equal(data.importedCount, 1);
  assert.deepEqual(data.items, [{
    id: 'roster-1',
    classId: 'class-1',
    studentNo: 'S001',
    studentName: '学生甲',
    userId: null,
    linkedUserName: '',
    linkedUserEmail: '',
    status: 'pending',
    createdAt: 1710000000100,
    updatedAt: 1710000000200,
  }]);
});

test('class roster service rejects duplicate student numbers within one import batch', async (t) => {
  t.mock.method(db.pool, 'query', async (sql, params = []) => {
    if (String(sql).includes('SELECT * FROM classes WHERE id = ? AND teacher_id = ?')) {
      assert.deepEqual(params, ['class-1', 'teacher-1']);
      return createQueryResult([createClassSummaryRow()]);
    }
    throw new Error(`unexpected sql: ${sql}`);
  });

  await assert.rejects(
    () => importClassRosterForTeacher({
      teacherId: 'teacher-1',
      classId: 'class-1',
      items: [
        { studentNo: 'S001', studentName: '学生甲' },
        { studentNo: 'S001', studentName: '学生乙' },
      ],
    }),
    (error) => {
      assert.equal(error?.name, 'ValidationError');
      assert.equal(error?.code, 'VALIDATION_ERROR');
      assert.equal(error?.status, 400);
      assert.match(error.message, /学号 S001 在本次导入中重复/);
      return true;
    }
  );
});

test('class roster service rejects overlong roster fields before persistence', async (t) => {
  t.mock.method(db.pool, 'query', async (sql, params = []) => {
    if (String(sql).includes('SELECT * FROM classes WHERE id = ? AND teacher_id = ?')) {
      assert.deepEqual(params, ['class-1', 'teacher-1']);
      return createQueryResult([createClassSummaryRow()]);
    }
    throw new Error(`unexpected sql: ${sql}`);
  });

  await assert.rejects(
    () => importClassRosterForTeacher({
      teacherId: 'teacher-1',
      classId: 'class-1',
      items: [
        { studentNo: 'S'.repeat(33), studentName: '学生甲' },
      ],
    }),
    (error) => {
      assert.equal(error?.name, 'ValidationError');
      assert.equal(error?.code, 'VALIDATION_ERROR');
      assert.equal(error?.status, 400);
      assert.match(error.message, /第 1 行学号过长/);
      return true;
    }
  );

  await assert.rejects(
    () => importClassRosterForTeacher({
      teacherId: 'teacher-1',
      classId: 'class-1',
      items: [
        { studentNo: 'S001', studentName: '名'.repeat(129) },
      ],
    }),
    (error) => {
      assert.equal(error?.name, 'ValidationError');
      assert.equal(error?.code, 'VALIDATION_ERROR');
      assert.equal(error?.status, 400);
      assert.match(error.message, /第 1 行姓名过长/);
      return true;
    }
  );
});

test('class roster service translates join repository sentinel errors into validation errors', async (t) => {
  t.mock.method(db.pool, 'query', async (sql, params = []) => {
    if (String(sql).includes('SELECT * FROM classes WHERE id = ? AND teacher_id = ?')) {
      assert.deepEqual(params, ['class-1', 'teacher-1']);
      return createQueryResult([createClassSummaryRow()]);
    }
    throw new Error(`unexpected sql: ${sql}`);
  });

  t.mock.method(db.pool, 'getConnection', async () => ({
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql) {
      if (String(sql).includes('FROM class_students cs')) {
        return [[]];
      }
      throw new Error(`unexpected connection sql: ${sql}`);
    },
  }));

  await assert.rejects(
    () => linkClassRosterUserForTeacher({
      teacherId: 'teacher-1',
      classId: 'class-1',
      userId: 'student-missing',
    }),
    (error) => {
      assert.equal(error?.name, 'ValidationError');
      assert.equal(error?.code, 'VALIDATION_ERROR');
      assert.equal(error?.status, 400);
      assert.match(error.message, /该学生账号尚未加入当前班级/);
      return true;
    }
  );
});

test('class crud service updates class name and synchronizes dependent references', async (t) => {
  const calls = [];
  t.mock.method(db.pool, 'query', async (sql, params = []) => {
    calls.push({ sql: String(sql), params });
    if (String(sql).includes('SELECT id, class_name, class_code, teacher_id, teacher_name, created_at FROM classes WHERE id = ? AND teacher_id = ?')) {
      return createQueryResult([createClassSummaryRow({ class_name: '旧班级名' })]);
    }
    if (String(sql).includes('UPDATE classes SET class_name = ? WHERE id = ?')) {
      assert.deepEqual(params, ['新班级名', 'class-1']);
      return createAffectedRowsResult();
    }
    if (String(sql).includes('UPDATE users SET class_name = ? WHERE class_id = ?')) {
      assert.deepEqual(params, ['新班级名', 'class-1']);
      return createAffectedRowsResult(2);
    }
    if (String(sql).includes('UPDATE writings w') && String(sql).includes('SET w.class_name = ?')) {
      assert.deepEqual(params, ['class-1', '新班级名', 'class-1', 'class-1', 'class-1']);
      return createAffectedRowsResult(3);
    }
    throw new Error(`unexpected sql: ${sql}`);
  });

  const data = await updateClassNameForTeacher({
    teacherId: 'teacher-1',
    classId: 'class-1',
    className: '新班级名',
  });

  assert.equal(calls.some((call) => call.sql.includes('UPDATE users SET class_name = ? WHERE class_id = ?')), true);
  assert.equal(calls.some((call) => call.sql.includes('UPDATE writings w')), true);
  assert.deepEqual(data, {
    id: 'class-1',
    className: '新班级名',
    classCode: 'C001',
    teacherId: 'teacher-1',
    teacherName: '测试教师',
    createdAt: 1710000000000,
    students: [],
  });
});

test('class crud service deletes class after clearing dependent references', async (t) => {
  const calls = [];
  t.mock.method(db.pool, 'query', async (sql, params = []) => {
    calls.push({ sql: String(sql), params });
    if (String(sql).includes('SELECT id FROM classes WHERE id = ? AND teacher_id = ?')) {
      return createQueryResult([{ id: 'class-1' }]);
    }
    if (String(sql).includes("UPDATE users SET class_id = NULL, class_name = '' WHERE class_id = ?")) {
      assert.deepEqual(params, ['class-1']);
      return createAffectedRowsResult(2);
    }
    if (String(sql).includes('UPDATE writings w') && String(sql).includes("w.class_name = ''")) {
      assert.deepEqual(params, ['class-1', 'class-1', 'class-1', 'class-1', 'class-1']);
      return createAffectedRowsResult(4);
    }
    if (String(sql).includes('DELETE FROM classes WHERE id = ?')) {
      assert.deepEqual(params, ['class-1']);
      return createAffectedRowsResult();
    }
    throw new Error(`unexpected sql: ${sql}`);
  });

  await deleteClassForTeacher({
    teacherId: 'teacher-1',
    classId: 'class-1',
  });

  const clearUserCallIndex = calls.findIndex((call) => call.sql.includes("UPDATE users SET class_id = NULL, class_name = '' WHERE class_id = ?"));
  const clearWritingCallIndex = calls.findIndex((call) => call.sql.includes('UPDATE writings w'));
  const deleteCallIndex = calls.findIndex((call) => call.sql.includes('DELETE FROM classes WHERE id = ?'));
  assert.equal(clearUserCallIndex >= 0, true);
  assert.equal(clearWritingCallIndex >= 0, true);
  assert.equal(deleteCallIndex > clearWritingCallIndex, true);
});
