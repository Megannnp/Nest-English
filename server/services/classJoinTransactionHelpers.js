import {
  buildAssignmentTaskSyncPayload,
  canInsertAssignmentTaskForLinkedWriting,
  resetAssignmentTaskForDetachedWriting,
  updateAssignmentTaskForLinkedWriting,
  upsertAssignmentTaskForLinkedWriting,
} from "./classAssignmentTaskSync.js";

export async function withClassTransaction(db, run) {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await run(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // ignore rollback failures after the original error
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function getJoinedClassUserForUpdate(connection, classId, userId) {
  const [rows] = await connection.query(
    `SELECT u.id, u.account_code, u.real_name, u.email, u.student_no, u.class_id, u.class_name, cs.joined_at
     FROM class_students cs
     JOIN users u ON u.id = cs.student_id
     WHERE cs.class_id = ? AND cs.student_id = ?
     LIMIT 1
     FOR UPDATE`,
    [classId, userId]
  );
  return rows[0] || null;
}

export async function assertUserHasNoOtherRoster(connection, classId, userId, allowedRosterId = null) {
  const [rows] = await connection.query(
    "SELECT id FROM student_roster WHERE class_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
    [classId, userId]
  );
  const existing = rows[0] || null;
  if (existing && existing.id !== allowedRosterId) {
    throw new Error("USER_ALREADY_LINKED_ROSTER");
  }
}

export async function getRosterByStudentNoForUpdate(connection, classId, studentNo) {
  const [rows] = await connection.query(
    `SELECT id, student_no, student_name, user_id, status
     FROM student_roster
     WHERE class_id = ? AND student_no = ?
     LIMIT 1
     FOR UPDATE`,
    [classId, studentNo]
  );
  return rows[0] || null;
}

export async function getRosterByIdForUpdate(connection, classId, rosterId) {
  const [rows] = await connection.query(
    `SELECT id, student_no, student_name, user_id, status
     FROM student_roster
     WHERE class_id = ? AND id = ?
     LIMIT 1
     FOR UPDATE`,
    [classId, rosterId]
  );
  return rows[0] || null;
}

export async function markRosterLinked(connection, rosterId, userId, now) {
  await connection.query(
    `UPDATE student_roster
     SET user_id = ?, status = 'linked', updated_at = ?
     WHERE id = ?`,
    [userId, now, rosterId]
  );
}

export async function attachRosterWritingsToUser(connection, rosterId, userId) {
  const [writingRows] = await connection.query(
    `SELECT w.id, w.assignment_id, w.feedback, w.created_at,
            COALESCE(sr.class_id, a.class_id) AS task_class_id
     FROM writings w
     JOIN assignments a ON a.id = w.assignment_id
     LEFT JOIN student_roster sr ON sr.id = w.roster_id
     WHERE w.roster_id = ? AND w.user_id IS NULL AND w.assignment_id IS NOT NULL`,
    [rosterId]
  );

  await connection.query("UPDATE writings SET user_id = ? WHERE roster_id = ? AND user_id IS NULL", [
    userId,
    rosterId,
  ]);

  const now = Date.now();
  for (const writing of writingRows) {
    const payload = buildAssignmentTaskSyncPayload(writing, userId, now);
    if (await updateAssignmentTaskForLinkedWriting(connection, payload)) continue;
    if (!(await canInsertAssignmentTaskForLinkedWriting(connection, payload))) continue;
    await upsertAssignmentTaskForLinkedWriting(connection, payload);
  }
}

export async function detachRosterWritingsFromUser(connection, rosterId, userId) {
  const [writingRows] = await connection.query(
    `SELECT id, assignment_id
     FROM writings
     WHERE roster_id = ? AND user_id = ?`,
    [rosterId, userId]
  );

  await connection.query("UPDATE writings SET user_id = NULL WHERE roster_id = ? AND user_id = ?", [
    rosterId,
    userId,
  ]);

  const now = Date.now();
  for (const writing of writingRows) {
    if (!writing.assignment_id) continue;
    await resetAssignmentTaskForDetachedWriting(connection, writing, userId, now);
  }
}
