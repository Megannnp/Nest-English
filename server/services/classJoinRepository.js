import {
  assertUserHasNoOtherRoster,
  attachRosterWritingsToUser,
  detachRosterWritingsFromUser,
  getJoinedClassUserForUpdate,
  getRosterByIdForUpdate,
  getRosterByStudentNoForUpdate,
  markRosterLinked,
  withClassTransaction,
} from './classJoinTransactionHelpers.js';
import db from '../db/database.js';

async function upgradeClassPasswordIfNeeded(connection, classId, upgradedHash) {
  if (!upgradedHash) return;
  await connection.query('UPDATE classes SET password = ? WHERE id = ?', [upgradedHash, classId]);
}

async function loadJoiningUser(connection, studentId) {
  const [currentUserRows] = await connection.query(
    'SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ? LIMIT 1',
    [studentId]
  );
  const currentUser = currentUserRows[0];
  if (!currentUser) {
    throw new Error('当前用户不存在');
  }
  return currentUser;
}

async function removePreviousClassMembershipIfNeeded(connection, currentUser, classId, studentId) {
  if (!currentUser.class_id || currentUser.class_id === classId) return;
  await connection.query('DELETE FROM class_students WHERE student_id = ?', [studentId]);
}

async function persistJoinedClassMembership(connection, { classId, className, studentId }) {
  await connection.query(
    'INSERT INTO class_students (class_id, student_id, joined_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE joined_at = VALUES(joined_at)',
    [classId, studentId, Date.now()]
  );

  await connection.query(
    'UPDATE users SET class_id = ?, class_name = ? WHERE id = ?',
    [classId, className, studentId]
  );
}

async function autoLinkRosterForJoinedUser(connection, { classId, studentId, studentNo }) {
  if (!studentNo) return null;
  const roster = await getRosterByStudentNoForUpdate(connection, classId, studentNo);

  if (roster?.user_id && roster.user_id !== studentId) {
    throw new Error('ROSTER_ALREADY_LINKED');
  }

  if (roster && (!roster.user_id || roster.user_id === studentId)) {
    await markRosterLinked(connection, roster.id, studentId, Date.now());
    await attachRosterWritingsToUser(connection, roster.id, studentId);
  }

  return roster;
}

function buildJoinClassResult(roster) {
  return {
    matchedRosterId: roster?.id || null,
    matchedRosterName: roster?.student_name || '',
  };
}

export async function linkRosterToClassUserByStudentNo({ classId, userId, now }) {
  return withClassTransaction(db, async (connection) => {
    const user = await getJoinedClassUserForUpdate(connection, classId, userId);
    if (!user) throw new Error('USER_NOT_IN_CLASS');

    const studentNo = String(user.student_no || '').trim();
    if (!studentNo) throw new Error('USER_STUDENT_NO_REQUIRED');

    const roster = await getRosterByStudentNoForUpdate(connection, classId, studentNo);
    if (!roster) throw new Error('ROSTER_NOT_FOUND_FOR_USER');

    if (roster.user_id && roster.user_id !== userId) {
      throw new Error('ROSTER_ALREADY_LINKED');
    }

    await assertUserHasNoOtherRoster(connection, classId, userId, roster.id);
    await markRosterLinked(connection, roster.id, userId, now);
    await attachRosterWritingsToUser(connection, roster.id, userId);

    return {
      rosterId: roster.id,
      studentNo: roster.student_no,
      studentName: roster.student_name,
      userId,
    };
  });
}

export async function createAndLinkRosterForClassUser({ classId, userId, rosterId, now }) {
  return withClassTransaction(db, async (connection) => {
    const user = await getJoinedClassUserForUpdate(connection, classId, userId);
    if (!user) throw new Error('USER_NOT_IN_CLASS');

    const studentNo = String(user.student_no || '').trim();
    if (!studentNo) throw new Error('USER_STUDENT_NO_REQUIRED');

    await assertUserHasNoOtherRoster(connection, classId, userId);

    const existing = await getRosterByStudentNoForUpdate(connection, classId, studentNo);

    if (existing?.user_id && existing.user_id !== userId) {
      throw new Error('ROSTER_ALREADY_LINKED');
    }

    if (existing) {
      await markRosterLinked(connection, existing.id, userId, now);
      await attachRosterWritingsToUser(connection, existing.id, userId);
      return {
        rosterId: existing.id,
        studentNo: existing.student_no,
        studentName: existing.student_name,
        userId,
      };
    }

    const studentName = String(user.real_name || '').trim() || '未命名学生';
    await connection.query(
      `INSERT INTO student_roster (id, class_id, student_no, student_name, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'linked', ?, ?)`,
      [rosterId, classId, studentNo, studentName, userId, now, now]
    );

    return {
      rosterId,
      studentNo,
      studentName,
      userId,
    };
  });
}

export async function linkSpecificRosterToClassUser({ classId, rosterId, userId, now }) {
  return withClassTransaction(db, async (connection) => {
    const user = await getJoinedClassUserForUpdate(connection, classId, userId);
    if (!user) throw new Error('USER_NOT_IN_CLASS');

    const roster = await getRosterByIdForUpdate(connection, classId, rosterId);
    if (!roster) throw new Error('ROSTER_NOT_FOUND');

    if (roster.user_id && roster.user_id !== userId) {
      throw new Error('ROSTER_ALREADY_LINKED');
    }

    await assertUserHasNoOtherRoster(connection, classId, userId, roster.id);
    await markRosterLinked(connection, roster.id, userId, now);
    await attachRosterWritingsToUser(connection, roster.id, userId);
    await connection.query(
      'UPDATE users SET student_no = ? WHERE id = ?',
      [roster.student_no, userId]
    );

    return {
      rosterId: roster.id,
      studentNo: roster.student_no,
      studentName: roster.student_name,
      userId,
    };
  });
}

export async function unlinkRosterFromClassUser({ classId, rosterId, now }) {
  return withClassTransaction(db, async (connection) => {
    const roster = await getRosterByIdForUpdate(connection, classId, rosterId);
    if (!roster) throw new Error('ROSTER_NOT_FOUND');

    if (roster.user_id) {
      await detachRosterWritingsFromUser(connection, roster.id, roster.user_id);
    }

    await connection.query(
      `UPDATE student_roster
       SET user_id = NULL, status = 'pending', updated_at = ?
       WHERE id = ?`,
      [now, roster.id]
    );

    return {
      rosterId: roster.id,
      studentNo: roster.student_no,
      studentName: roster.student_name,
      previousUserId: roster.user_id || null,
    };
  });
}

export async function joinClassTransaction({
  classId,
  className,
  studentId,
  upgradedHash,
}) {
  return withClassTransaction(db, async (connection) => {
    await upgradeClassPasswordIfNeeded(connection, classId, upgradedHash);
    const currentUser = await loadJoiningUser(connection, studentId);
    await removePreviousClassMembershipIfNeeded(connection, currentUser, classId, studentId);
    await persistJoinedClassMembership(connection, { classId, className, studentId });
    const studentNo = String(currentUser.student_no || '').trim();
    const roster = await autoLinkRosterForJoinedUser(connection, { classId, studentId, studentNo });
    return buildJoinClassResult(roster);
  });
}
