import db from '../db/database.js';

export async function listClassesByTeacher(teacherId) {
  return db.prepare('SELECT * FROM classes WHERE teacher_id = ? ORDER BY created_at DESC').all(teacherId);
}

export async function listClassMembersByClassIds(classIds) {
  if (!classIds.length) return [];
  const placeholders = classIds.map(() => '?').join(',');
  return db.prepare(`SELECT class_id, student_id FROM class_students WHERE class_id IN (${placeholders})`).all(...classIds);
}

export async function getClassByCode(classCode) {
  return db.prepare('SELECT * FROM classes WHERE class_code = ?').get(classCode);
}

export async function countClassStudents(classId) {
  const row = await db.prepare('SELECT COUNT(*) AS student_count FROM class_students WHERE class_id = ?').get(classId);
  return Number(row?.student_count || 0);
}

export async function insertClass({
  id,
  className,
  classCode,
  passwordHash,
  teacherId,
  teacherName,
  createdAt,
}) {
  await db.prepare(`
    INSERT INTO classes (id, class_name, class_code, password, teacher_id, teacher_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, className, classCode, passwordHash, teacherId, teacherName, createdAt);
}

export async function getClassById(classId) {
  return db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
}

export async function getClassForTeacher(classId, teacherId, columns = '*') {
  return db.prepare(`SELECT ${columns} FROM classes WHERE id = ? AND teacher_id = ?`).get(classId, teacherId);
}

export async function updateClassPassword(classId, passwordHash) {
  await db.prepare('UPDATE classes SET password = ? WHERE id = ?').run(passwordHash, classId);
}

export async function updateUserClass(userId, classId, className) {
  await db.prepare('UPDATE users SET class_id = ?, class_name = ? WHERE id = ?').run(classId, className, userId);
}

export async function getClassUserById(userId) {
  return db.prepare(
    'SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ?'
  ).get(userId);
}

export async function listClassMemberIds(classId) {
  const rows = await db.prepare('SELECT student_id FROM class_students WHERE class_id = ?').all(classId);
  return rows.map((row) => row.student_id);
}

export async function listUsersByIds(userIds) {
  if (!userIds.length) return [];
  const placeholders = userIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT id, account_code, real_name, email, student_no, class_id, class_name
    FROM users WHERE id IN (${placeholders})
  `).all(...userIds);
}

export async function listWritingStatsByUserIds(userIds) {
  if (!userIds.length) return [];
  const placeholders = userIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT user_id,
      JSON_EXTRACT(feedback, '$.totalScore') as total_score,
      JSON_EXTRACT(feedback, '$.maxScore')   as max_score,
      JSON_EXTRACT(feedback, '$.weaknesses') as weaknesses,
      created_at
    FROM writings WHERE user_id IN (${placeholders})
    ORDER BY created_at ASC
  `).all(...userIds);
}

export async function listClassWritingsByUserIds(userIds) {
  if (!userIds.length) return [];
  const placeholders = userIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT w.id, w.user_id, w.user_name, w.class_name, w.writing_title,
           w.selected_type, w.selected_themes, w.word_count, w.max_score,
           w.source, w.teacher_comment, w.submitted_by_teacher, w.created_at,
           JSON_EXTRACT(w.feedback, '$.totalScore') as total_score,
           JSON_EXTRACT(w.feedback, '$.tier')       as tier,
           JSON_EXTRACT(w.feedback, '$.summary')    as summary,
           JSON_EXTRACT(w.feedback, '$.categories') as categories,
           u.real_name as student_real_name
    FROM writings w
    JOIN users u ON u.id = w.user_id
    WHERE w.user_id IN (${placeholders})
    ORDER BY w.created_at DESC
    LIMIT 200
  `).all(...userIds);
}

export async function updateClassName(classId, className) {
  await db.prepare('UPDATE classes SET class_name = ? WHERE id = ?').run(className, classId);
}

export async function deleteClass(classId) {
  await db.prepare('DELETE FROM classes WHERE id = ?').run(classId);
}

export async function syncClassNameReferences(classId, className) {
  await db.prepare('UPDATE users SET class_name = ? WHERE class_id = ?').run(className, classId);

  await db.pool.query(`
    UPDATE writings w
    LEFT JOIN assignments a ON a.id = w.assignment_id
    LEFT JOIN student_roster sr ON sr.id = w.roster_id
    LEFT JOIN class_students cs
      ON cs.student_id = w.user_id
     AND cs.class_id = ?
    SET w.class_name = ?
    WHERE a.class_id = ?
       OR sr.class_id = ?
       OR cs.class_id = ?
  `, [classId, className, classId, classId, classId]);
}

export async function clearClassReferences(classId) {
  await db.prepare(`UPDATE users SET class_id = NULL, class_name = '' WHERE class_id = ?`).run(classId);

  await db.pool.query(`
    UPDATE writings w
    LEFT JOIN assignments a ON a.id = w.assignment_id
    LEFT JOIN student_roster sr ON sr.id = w.roster_id
    LEFT JOIN class_students cs
      ON cs.student_id = w.user_id
     AND cs.class_id = ?
    SET w.assignment_id = CASE WHEN a.class_id = ? THEN NULL ELSE w.assignment_id END,
        w.class_name = ''
    WHERE a.class_id = ?
       OR sr.class_id = ?
       OR cs.class_id = ?
  `, [classId, classId, classId, classId, classId]);
}

export async function joinClassTransaction({
  classId,
  className,
  studentId,
  upgradedHash,
}) {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    if (upgradedHash) {
      await connection.query('UPDATE classes SET password = ? WHERE id = ?', [upgradedHash, classId]);
    }

    const [currentUserRows] = await connection.query(
      'SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ? LIMIT 1',
      [studentId]
    );
    const currentUser = currentUserRows[0];
    if (!currentUser) {
      throw new Error('当前用户不存在');
    }

    if (currentUser.class_id && currentUser.class_id !== classId) {
      await connection.query('DELETE FROM class_students WHERE student_id = ?', [studentId]);
    }

    await connection.query(
      'INSERT INTO class_students (class_id, student_id, joined_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE joined_at = VALUES(joined_at)',
      [classId, studentId, Date.now()]
    );

    await connection.query(
      'UPDATE users SET class_id = ?, class_name = ? WHERE id = ?',
      [classId, className, studentId]
    );

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch { /* intentional */ }
    throw error;
  } finally {
    connection.release();
  }
}
