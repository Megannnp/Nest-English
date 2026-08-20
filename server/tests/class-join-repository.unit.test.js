import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createClassStudentRow,
  createMockConnection,
  createRosterRow,
  createWritingRow,
  withMockedConnection,
} from './fixtures/classJoinFixtures.js';
import {
  createAndLinkRosterForClassUser,
  joinClassTransaction,
  linkRosterToClassUserByStudentNo,
  linkSpecificRosterToClassUser,
  unlinkRosterFromClassUser,
} from '../services/classJoinRepository.js';

test('linkRosterToClassUserByStudentNo links roster, reattaches writings, and inserts returned assignment task when needed', async () => {
  const originalNow = Date.now;
  Date.now = () => 500;

  const connection = createMockConnection(async (sql) => {
    if (sql.includes('FROM class_students cs')) {
      return [[createClassStudentRow()]];
    }
    if (sql.includes('SELECT id, student_no, student_name, user_id, status') && sql.includes('student_no = ?')) {
      return [[createRosterRow()]];
    }
    if (sql.includes('SELECT id FROM student_roster WHERE class_id = ? AND user_id = ?')) {
      return [[]];
    }
    if (sql.includes('UPDATE student_roster') && sql.includes("status = 'linked'")) {
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('FROM writings w')) {
      return [[createWritingRow({
        feedback: JSON.stringify({ totalScore: 88 }),
      })]];
    }
    if (sql.includes('UPDATE writings SET user_id = ? WHERE roster_id = ? AND user_id IS NULL')) {
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('UPDATE assignment_tasks')) {
      return [{ affectedRows: 0 }];
    }
    if (sql.includes('SELECT id, writing_id') && sql.includes('FROM assignment_tasks')) {
      return [[]];
    }
    if (sql.includes('INSERT INTO assignment_tasks')) {
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    const result = await linkRosterToClassUserByStudentNo({
      classId: 'class-1',
      userId: 'student-1',
      now: 123,
    });

    assert.deepEqual(result, {
      rosterId: 'roster-1',
      studentNo: 'S001',
      studentName: 'Alice',
      userId: 'student-1',
    });
    assert.deepEqual(connection.state, {
      began: true,
      committed: true,
      rolledBack: false,
      released: true,
    });

    const rosterUpdate = connection.calls.find((call) => call.sql.includes('UPDATE student_roster'));
    assert.deepEqual(rosterUpdate.params, ['student-1', 123, 'roster-1']);

    const writingRelink = connection.calls.find((call) => call.sql.includes('UPDATE writings SET user_id = ? WHERE roster_id = ? AND user_id IS NULL'));
    assert.deepEqual(writingRelink.params, ['student-1', 'roster-1']);

    const taskInsert = connection.calls.find((call) => call.sql.includes('INSERT INTO assignment_tasks'));
    assert.equal(taskInsert.params[1], 'assignment-1');
    assert.equal(taskInsert.params[2], 'student-1');
    assert.equal(taskInsert.params[3], 'class-1');
    assert.equal(taskInsert.params[4], 'returned');
    assert.equal(taskInsert.params[5], 'writing-1');
    assert.equal(taskInsert.params[6], 88);
    assert.equal(taskInsert.params[7], 111);
    assert.equal(taskInsert.params[8], 500);
  } finally {
    restore();
    Date.now = originalNow;
  }
});

test('linkSpecificRosterToClassUser updates existing assignment task and syncs user student number without inserting duplicate task', async () => {
  const originalNow = Date.now;
  Date.now = () => 700;

  const connection = createMockConnection(async (sql) => {
    if (sql.includes('FROM class_students cs')) {
      return [[createClassStudentRow({
        id: 'student-9',
        real_name: 'Bob',
        student_no: 'S009',
      })]];
    }
    if (sql.includes('SELECT id, student_no, student_name, user_id, status') && sql.includes('WHERE class_id = ? AND id = ?')) {
      return [[createRosterRow({
        id: 'roster-9',
        student_no: 'S777',
        student_name: 'Bob',
      })]];
    }
    if (sql.includes('SELECT id FROM student_roster WHERE class_id = ? AND user_id = ?')) {
      return [[]];
    }
    if (sql.includes('UPDATE student_roster') && sql.includes("status = 'linked'")) {
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('FROM writings w')) {
      return [[createWritingRow({
        id: 'writing-9',
        assignment_id: 'assignment-9',
        created_at: 222,
        task_class_id: 'class-9',
      })]];
    }
    if (sql.includes('UPDATE writings SET user_id = ? WHERE roster_id = ? AND user_id IS NULL')) {
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('UPDATE assignment_tasks')) {
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('UPDATE users SET student_no = ? WHERE id = ?')) {
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    const result = await linkSpecificRosterToClassUser({
      classId: 'class-9',
      rosterId: 'roster-9',
      userId: 'student-9',
      now: 456,
    });

    assert.deepEqual(result, {
      rosterId: 'roster-9',
      studentNo: 'S777',
      studentName: 'Bob',
      userId: 'student-9',
    });
    assert.deepEqual(connection.state, {
      began: true,
      committed: true,
      rolledBack: false,
      released: true,
    });

    const taskUpdate = connection.calls.find((call) => call.sql.includes('UPDATE assignment_tasks'));
    assert.deepEqual(taskUpdate.params, [
      null,
      'writing-9',
      null,
      null,
      700,
      700,
      'assignment-9',
      'student-9',
      'writing-9',
    ]);

    const userSync = connection.calls.find((call) => call.sql.includes('UPDATE users SET student_no = ? WHERE id = ?'));
    assert.deepEqual(userSync.params, ['S777', 'student-9']);

    assert.equal(connection.calls.some((call) => call.sql.includes('INSERT INTO assignment_tasks')), false);
  } finally {
    restore();
    Date.now = originalNow;
  }
});

test('unlinkRosterFromClassUser detaches writings and resets linked assignment tasks to pending', async () => {
  const originalNow = Date.now;
  Date.now = () => 900;

  const connection = createMockConnection(async (sql) => {
    if (sql.includes('SELECT id, student_no, student_name, user_id, status') && sql.includes('WHERE class_id = ? AND id = ?')) {
      return [[createRosterRow({
        id: 'roster-2',
        student_no: 'S002',
        student_name: 'Carol',
        user_id: 'student-2',
        status: 'linked',
      })]];
    }
    if (sql.includes('SELECT id, assignment_id') && sql.includes('FROM writings')) {
      return [[
        { id: 'writing-a', assignment_id: 'assignment-a' },
        { id: 'writing-b', assignment_id: null },
      ]];
    }
    if (sql.includes('UPDATE writings SET user_id = NULL WHERE roster_id = ? AND user_id = ?')) {
      return [{ affectedRows: 2 }];
    }
    if (sql.includes('UPDATE assignment_tasks')) {
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('UPDATE student_roster') && sql.includes("status = 'pending'")) {
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    const result = await unlinkRosterFromClassUser({
      classId: 'class-2',
      rosterId: 'roster-2',
      now: 321,
    });

    assert.deepEqual(result, {
      rosterId: 'roster-2',
      studentNo: 'S002',
      studentName: 'Carol',
      previousUserId: 'student-2',
    });
    assert.deepEqual(connection.state, {
      began: true,
      committed: true,
      rolledBack: false,
      released: true,
    });

    const taskResets = connection.calls.filter((call) => call.sql.includes('UPDATE assignment_tasks'));
    assert.equal(taskResets.length, 1);
    assert.deepEqual(taskResets[0].params, [900, 'assignment-a', 'student-2', 'writing-a']);

    const rosterReset = connection.calls.find((call) => call.sql.includes("SET user_id = NULL, status = 'pending'"));
    assert.deepEqual(rosterReset.params, [321, 'roster-2']);
  } finally {
    restore();
    Date.now = originalNow;
  }
});

test('linkRosterToClassUserByStudentNo rolls back when user is not in class', async () => {
  const connection = createMockConnection(async (sql) => {
    if (sql.includes('FROM class_students cs')) {
      return [[]];
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    await assert.rejects(
      () => linkRosterToClassUserByStudentNo({
        classId: 'class-1',
        userId: 'student-missing',
        now: 123,
      }),
      /USER_NOT_IN_CLASS/
    );

    assert.deepEqual(connection.state, {
      began: true,
      committed: false,
      rolledBack: true,
      released: true,
    });
  } finally {
    restore();
  }
});

test('createAndLinkRosterForClassUser rejects users without student number and rolls back transaction', async () => {
  const connection = createMockConnection(async (sql) => {
    if (sql.includes('FROM class_students cs')) {
      return [[createClassStudentRow({ student_no: '' })]];
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    await assert.rejects(
      () => createAndLinkRosterForClassUser({
        classId: 'class-1',
        userId: 'student-1',
        rosterId: 'roster-new',
        now: 456,
      }),
      /USER_STUDENT_NO_REQUIRED/
    );

    assert.deepEqual(connection.state, {
      began: true,
      committed: false,
      rolledBack: true,
      released: true,
    });
  } finally {
    restore();
  }
});

test('linkSpecificRosterToClassUser rejects roster already linked to another user', async () => {
  const connection = createMockConnection(async (sql) => {
    if (sql.includes('FROM class_students cs')) {
      return [[createClassStudentRow({
        id: 'student-9',
        real_name: 'Bob',
        student_no: 'S009',
      })]];
    }
    if (sql.includes('SELECT id, student_no, student_name, user_id, status') && sql.includes('WHERE class_id = ? AND id = ?')) {
      return [[createRosterRow({
        id: 'roster-9',
        student_no: 'S777',
        student_name: 'Bob',
        user_id: 'other-student',
        status: 'linked',
      })]];
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    await assert.rejects(
      () => linkSpecificRosterToClassUser({
        classId: 'class-9',
        rosterId: 'roster-9',
        userId: 'student-9',
        now: 456,
      }),
      /ROSTER_ALREADY_LINKED/
    );

    assert.deepEqual(connection.state, {
      began: true,
      committed: false,
      rolledBack: true,
      released: true,
    });
  } finally {
    restore();
  }
});

test('unlinkRosterFromClassUser rejects missing roster without mutating transaction state', async () => {
  const connection = createMockConnection(async (sql) => {
    if (sql.includes('SELECT id, student_no, student_name, user_id, status') && sql.includes('WHERE class_id = ? AND id = ?')) {
      return [[]];
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    await assert.rejects(
      () => unlinkRosterFromClassUser({
        classId: 'class-2',
        rosterId: 'missing-roster',
        now: 321,
      }),
      /ROSTER_NOT_FOUND/
    );

    assert.deepEqual(connection.state, {
      began: true,
      committed: false,
      rolledBack: true,
      released: true,
    });
  } finally {
    restore();
  }
});

test('joinClassTransaction removes previous class membership and auto-links matching roster', async () => {
  const originalNow = Date.now;
  Date.now = () => 1000;

  const connection = createMockConnection(async (sql, params) => {
    if (sql.includes('UPDATE classes SET password = ? WHERE id = ?')) {
      assert.deepEqual(params, ['bcrypt-hash', 'class-new']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ? LIMIT 1')) {
      return [[{
        id: 'student-1',
        account_code: '100001',
        email: 'student@example.com',
        role: 'student',
        real_name: 'Alice',
        student_no: 'S001',
        class_id: 'class-old',
        class_name: '旧班级',
      }]];
    }
    if (sql.includes('DELETE FROM class_students WHERE student_id = ?')) {
      assert.deepEqual(params, ['student-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('INSERT INTO class_students')) {
      assert.deepEqual(params, ['class-new', 'student-1', 1000]);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('UPDATE users SET class_id = ?, class_name = ? WHERE id = ?')) {
      assert.deepEqual(params, ['class-new', '新班级', 'student-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('SELECT id, student_no, student_name, user_id, status') && sql.includes('student_no = ?')) {
      return [[{
        id: 'roster-1',
        student_no: 'S001',
        student_name: 'Alice',
        user_id: null,
        status: 'pending',
      }]];
    }
    if (sql.includes('UPDATE student_roster') && sql.includes("status = 'linked'")) {
      assert.deepEqual(params, ['student-1', 1000, 'roster-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('FROM writings w')) {
      return [[]];
    }
    if (sql.includes('UPDATE writings SET user_id = ? WHERE roster_id = ? AND user_id IS NULL')) {
      assert.deepEqual(params, ['student-1', 'roster-1']);
      return [[{ affectedRows: 0 }]];
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    const result = await joinClassTransaction({
      classId: 'class-new',
      className: '新班级',
      studentId: 'student-1',
      upgradedHash: 'bcrypt-hash',
    });

    assert.deepEqual(result, {
      matchedRosterId: 'roster-1',
      matchedRosterName: 'Alice',
    });
    assert.deepEqual(connection.state, {
      began: true,
      committed: true,
      rolledBack: false,
      released: true,
    });
  } finally {
    restore();
    Date.now = originalNow;
  }
});

test('joinClassTransaction rolls back when matching roster is already linked to another user', async () => {
  const connection = createMockConnection(async (sql) => {
    if (sql.includes('SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ? LIMIT 1')) {
      return [[{
        id: 'student-1',
        account_code: '100001',
        email: 'student@example.com',
        role: 'student',
        real_name: 'Alice',
        student_no: 'S001',
        class_id: null,
        class_name: '',
      }]];
    }
    if (sql.includes('INSERT INTO class_students')) {
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('UPDATE users SET class_id = ?, class_name = ? WHERE id = ?')) {
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('SELECT id, student_no, student_name, user_id, status') && sql.includes('student_no = ?')) {
      return [[{
        id: 'roster-1',
        student_no: 'S001',
        student_name: 'Alice',
        user_id: 'other-student',
        status: 'linked',
      }]];
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    await assert.rejects(
      () => joinClassTransaction({
        classId: 'class-new',
        className: '新班级',
        studentId: 'student-1',
        upgradedHash: null,
      }),
      /ROSTER_ALREADY_LINKED/
    );

    assert.deepEqual(connection.state, {
      began: true,
      committed: false,
      rolledBack: true,
      released: true,
    });
  } finally {
    restore();
  }
});

test('joinClassTransaction rolls back when auto-linked roster writing task update fails', async () => {
  const originalNow = Date.now;
  Date.now = () => 3000;

  const connection = createMockConnection(async (sql, params) => {
    if (sql.includes('SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ? LIMIT 1')) {
      return [[{
        id: 'student-1',
        account_code: '100001',
        email: 'student@example.com',
        role: 'student',
        real_name: 'Alice',
        student_no: 'S001',
        class_id: null,
        class_name: '',
      }]];
    }
    if (sql.includes('INSERT INTO class_students')) {
      assert.deepEqual(params, ['class-new', 'student-1', 3000]);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('UPDATE users SET class_id = ?, class_name = ? WHERE id = ?')) {
      assert.deepEqual(params, ['class-new', '新班级', 'student-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('SELECT id, student_no, student_name, user_id, status') && sql.includes('student_no = ?')) {
      return [[{
        id: 'roster-1',
        student_no: 'S001',
        student_name: 'Alice',
        user_id: null,
        status: 'pending',
      }]];
    }
    if (sql.includes('UPDATE student_roster') && sql.includes("status = 'linked'")) {
      assert.deepEqual(params, ['student-1', 3000, 'roster-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('FROM writings w')) {
      assert.deepEqual(params, ['roster-1']);
      return [[{
        id: 'writing-1',
        assignment_id: 'assignment-1',
        feedback: null,
        created_at: 111,
        task_class_id: 'class-new',
      }]];
    }
    if (sql.includes('UPDATE writings SET user_id = ? WHERE roster_id = ? AND user_id IS NULL')) {
      assert.deepEqual(params, ['student-1', 'roster-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('UPDATE assignment_tasks')) {
      assert.deepEqual(params, [
        null,
        'writing-1',
        null,
        null,
        3000,
        3000,
        'assignment-1',
        'student-1',
        'writing-1',
      ]);
      throw new Error('TASK_UPDATE_FAILED');
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    await assert.rejects(
      () => joinClassTransaction({
        classId: 'class-new',
        className: '新班级',
        studentId: 'student-1',
        upgradedHash: null,
      }),
      /TASK_UPDATE_FAILED/
    );

    assert.deepEqual(connection.state, {
      began: true,
      committed: false,
      rolledBack: true,
      released: true,
    });
  } finally {
    restore();
    Date.now = originalNow;
  }
});

test('joinClassTransaction rolls back when auto-linked roster writing task insert fails', async () => {
  const originalNow = Date.now;
  Date.now = () => 4000;

  const connection = createMockConnection(async (sql, params) => {
    if (sql.includes('SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ? LIMIT 1')) {
      return [[{
        id: 'student-1',
        account_code: '100001',
        email: 'student@example.com',
        role: 'student',
        real_name: 'Alice',
        student_no: 'S001',
        class_id: null,
        class_name: '',
      }]];
    }
    if (sql.includes('INSERT INTO class_students')) {
      assert.deepEqual(params, ['class-new', 'student-1', 4000]);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('UPDATE users SET class_id = ?, class_name = ? WHERE id = ?')) {
      assert.deepEqual(params, ['class-new', '新班级', 'student-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('SELECT id, student_no, student_name, user_id, status') && sql.includes('student_no = ?')) {
      return [[{
        id: 'roster-1',
        student_no: 'S001',
        student_name: 'Alice',
        user_id: null,
        status: 'pending',
      }]];
    }
    if (sql.includes('UPDATE student_roster') && sql.includes("status = 'linked'")) {
      assert.deepEqual(params, ['student-1', 4000, 'roster-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('FROM writings w')) {
      assert.deepEqual(params, ['roster-1']);
      return [[{
        id: 'writing-1',
        assignment_id: 'assignment-1',
        feedback: JSON.stringify({ totalScore: 92 }),
        created_at: 222,
        task_class_id: 'class-new',
      }]];
    }
    if (sql.includes('UPDATE writings SET user_id = ? WHERE roster_id = ? AND user_id IS NULL')) {
      assert.deepEqual(params, ['student-1', 'roster-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('UPDATE assignment_tasks')) {
      return [[{ affectedRows: 0 }]];
    }
    if (sql.includes('SELECT id, writing_id') && sql.includes('FROM assignment_tasks')) {
      assert.deepEqual(params, ['assignment-1', 'student-1']);
      return [[]];
    }
    if (sql.includes('INSERT INTO assignment_tasks')) {
      assert.equal(params[1], 'assignment-1');
      assert.equal(params[2], 'student-1');
      assert.equal(params[3], 'class-new');
      assert.equal(params[4], 'returned');
      assert.equal(params[5], 'writing-1');
      assert.equal(params[6], 92);
      assert.equal(params[7], 222);
      assert.equal(params[8], 4000);
      throw new Error('TASK_INSERT_FAILED');
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    await assert.rejects(
      () => joinClassTransaction({
        classId: 'class-new',
        className: '新班级',
        studentId: 'student-1',
        upgradedHash: null,
      }),
      /TASK_INSERT_FAILED/
    );

    assert.deepEqual(connection.state, {
      began: true,
      committed: false,
      rolledBack: true,
      released: true,
    });
  } finally {
    restore();
    Date.now = originalNow;
  }
});

test('joinClassTransaction skips roster auto-link when student has no student number', async () => {
  const originalNow = Date.now;
  Date.now = () => 5000;

  const connection = createMockConnection(async (sql, params) => {
    if (sql.includes('SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ? LIMIT 1')) {
      return [[{
        id: 'student-1',
        account_code: '100001',
        email: 'student@example.com',
        role: 'student',
        real_name: 'Alice',
        student_no: '',
        class_id: null,
        class_name: '',
      }]];
    }
    if (sql.includes('INSERT INTO class_students')) {
      assert.deepEqual(params, ['class-new', 'student-1', 5000]);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('UPDATE users SET class_id = ?, class_name = ? WHERE id = ?')) {
      assert.deepEqual(params, ['class-new', '新班级', 'student-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('student_no = ?') || sql.includes('UPDATE student_roster') || sql.includes('FROM writings w') || sql.includes('UPDATE writings SET user_id = ? WHERE roster_id = ? AND user_id IS NULL') || sql.includes('assignment_tasks')) {
      throw new Error(`Roster auto-link should be skipped, but got query: ${sql}`);
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    const result = await joinClassTransaction({
      classId: 'class-new',
      className: '新班级',
      studentId: 'student-1',
      upgradedHash: null,
    });

    assert.deepEqual(result, {
      matchedRosterId: null,
      matchedRosterName: '',
    });
    assert.deepEqual(connection.state, {
      began: true,
      committed: true,
      rolledBack: false,
      released: true,
    });
  } finally {
    restore();
    Date.now = originalNow;
  }
});

test('joinClassTransaction removes previous class membership even when roster auto-link is skipped', async () => {
  const originalNow = Date.now;
  Date.now = () => 6000;

  const connection = createMockConnection(async (sql, params) => {
    if (sql.includes('SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ? LIMIT 1')) {
      return [[{
        id: 'student-1',
        account_code: '100001',
        email: 'student@example.com',
        role: 'student',
        real_name: 'Alice',
        student_no: '',
        class_id: 'class-old',
        class_name: '旧班级',
      }]];
    }
    if (sql.includes('DELETE FROM class_students WHERE student_id = ?')) {
      assert.deepEqual(params, ['student-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('INSERT INTO class_students')) {
      assert.deepEqual(params, ['class-new', 'student-1', 6000]);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('UPDATE users SET class_id = ?, class_name = ? WHERE id = ?')) {
      assert.deepEqual(params, ['class-new', '新班级', 'student-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('student_no = ?') || sql.includes('UPDATE student_roster') || sql.includes('FROM writings w') || sql.includes('UPDATE writings SET user_id = ? WHERE roster_id = ? AND user_id IS NULL') || sql.includes('assignment_tasks')) {
      throw new Error(`Roster auto-link should be skipped, but got query: ${sql}`);
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    const result = await joinClassTransaction({
      classId: 'class-new',
      className: '新班级',
      studentId: 'student-1',
      upgradedHash: null,
    });

    assert.deepEqual(result, {
      matchedRosterId: null,
      matchedRosterName: '',
    });
    assert.deepEqual(connection.state, {
      began: true,
      committed: true,
      rolledBack: false,
      released: true,
    });
  } finally {
    restore();
    Date.now = originalNow;
  }
});

test('joinClassTransaction succeeds when roster auto-link reattaches writing but assignment task stays untouched', async () => {
  const originalNow = Date.now;
  Date.now = () => 7000;

  const connection = createMockConnection(async (sql, params) => {
    if (sql.includes('SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ? LIMIT 1')) {
      return [[{
        id: 'student-1',
        account_code: '100001',
        email: 'student@example.com',
        role: 'student',
        real_name: 'Alice',
        student_no: 'S001',
        class_id: null,
        class_name: '',
      }]];
    }
    if (sql.includes('INSERT INTO class_students')) {
      assert.deepEqual(params, ['class-new', 'student-1', 7000]);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('UPDATE users SET class_id = ?, class_name = ? WHERE id = ?')) {
      assert.deepEqual(params, ['class-new', '新班级', 'student-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('SELECT id, student_no, student_name, user_id, status') && sql.includes('student_no = ?')) {
      return [[{
        id: 'roster-1',
        student_no: 'S001',
        student_name: 'Alice',
        user_id: null,
        status: 'pending',
      }]];
    }
    if (sql.includes('UPDATE student_roster') && sql.includes("status = 'linked'")) {
      assert.deepEqual(params, ['student-1', 7000, 'roster-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('FROM writings w')) {
      assert.deepEqual(params, ['roster-1']);
      return [[{
        id: 'writing-1',
        assignment_id: 'assignment-1',
        feedback: JSON.stringify({ totalScore: 88 }),
        created_at: 333,
        task_class_id: 'class-new',
      }]];
    }
    if (sql.includes('UPDATE writings SET user_id = ? WHERE roster_id = ? AND user_id IS NULL')) {
      assert.deepEqual(params, ['student-1', 'roster-1']);
      return [[{ affectedRows: 1 }]];
    }
    if (sql.includes('UPDATE assignment_tasks')) {
      return [[{ affectedRows: 0 }]];
    }
    if (sql.includes('SELECT id, writing_id') && sql.includes('FROM assignment_tasks')) {
      assert.deepEqual(params, ['assignment-1', 'student-1']);
      return [[{
        id: 'task-existing',
        writing_id: 'writing-other',
      }]];
    }
    if (sql.includes('INSERT INTO assignment_tasks')) {
      throw new Error(`Assignment task should remain untouched, but got query: ${sql}`);
    }
    throw new Error(`Unexpected query: ${sql}`);
  });

  const restore = withMockedConnection(connection);

  try {
    const result = await joinClassTransaction({
      classId: 'class-new',
      className: '新班级',
      studentId: 'student-1',
      upgradedHash: null,
    });

    assert.deepEqual(result, {
      matchedRosterId: 'roster-1',
      matchedRosterName: 'Alice',
    });
    assert.deepEqual(connection.state, {
      began: true,
      committed: true,
      rolledBack: false,
      released: true,
    });
  } finally {
    restore();
    Date.now = originalNow;
  }
});
