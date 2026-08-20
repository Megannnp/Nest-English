import db from '../db/database.js';

export async function countClassStudents(classId) {
  const row = await db.prepare('SELECT COUNT(*) AS student_count FROM class_students WHERE class_id = ?').get(classId);
  return Number(row?.student_count || 0);
}

export async function listClassMembersByClassIds(classIds) {
  if (!classIds.length) return [];
  const placeholders = classIds.map(() => '?').join(',');
  return db.prepare(`SELECT class_id, student_id FROM class_students WHERE class_id IN (${placeholders})`).all(...classIds);
}

export async function listClassMemberIds(classId) {
  const rows = await db.prepare('SELECT student_id FROM class_students WHERE class_id = ?').all(classId);
  return rows.map((row) => row.student_id);
}

export async function listUsersByIds(userIds) {
  if (!userIds.length) return [];
  const placeholders = userIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT id, account_code, real_name, student_no, email, class_id, class_name
    FROM users WHERE id IN (${placeholders})
  `).all(...userIds);
}

export async function listRosterItemsByClassId(classId) {
  return db.prepare(`
    SELECT sr.*,
           u.real_name AS linked_user_name,
           u.email AS linked_user_email
    FROM student_roster sr
    LEFT JOIN users u ON u.id = sr.user_id
    WHERE sr.class_id = ?
    ORDER BY sr.student_no ASC, sr.created_at ASC
  `).all(classId);
}

export async function listUnmatchedClassUsers(classId) {
  return db.prepare(`
    SELECT u.id, u.account_code, u.real_name, u.email, u.student_no, u.class_id, u.class_name, cs.joined_at
    FROM class_students cs
    JOIN users u ON u.id = cs.student_id
    LEFT JOIN student_roster sr
      ON sr.class_id = cs.class_id
     AND sr.user_id = cs.student_id
    WHERE cs.class_id = ?
      AND sr.id IS NULL
    ORDER BY cs.joined_at DESC
  `).all(classId);
}

export async function upsertRosterItems({ classId, entries, now }) {
  if (!entries.length) return;

  const statement = db.prepare(`
    INSERT INTO student_roster (id, class_id, student_no, student_name, user_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, 'pending', ?, ?)
    ON DUPLICATE KEY UPDATE
      student_name = VALUES(student_name),
      status = IF(user_id IS NULL, 'pending', 'linked'),
      updated_at = VALUES(updated_at)
  `);

  for (const entry of entries) {
    await statement.run(
      entry.id,
      classId,
      entry.studentNo,
      entry.studentName,
      now,
      now,
    );
  }
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

export async function listClassWritingsByUserIds(userIds, classId = null) {
  if (!userIds.length && !classId) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const userFilter = userIds.length ? `w.user_id IN (${placeholders})` : 'FALSE';
  const params = [...userIds];
  let rosterFilter = '';
  if (classId) {
    rosterFilter = ' OR sr.class_id = ?';
    params.push(classId);
  }

  return db.prepare(`
    SELECT w.id, w.user_id, w.roster_id, w.user_name, w.class_name, w.writing_title,
           w.selected_type, w.selected_themes, w.word_count, w.max_score,
           w.source, w.teacher_comment, w.submitted_by_teacher, w.created_at,
           JSON_EXTRACT(w.feedback, '$.totalScore') as total_score,
           JSON_EXTRACT(w.feedback, '$.tier')       as tier,
           JSON_EXTRACT(w.feedback, '$.summary')    as summary,
           JSON_EXTRACT(w.feedback, '$.categories') as categories,
           COALESCE(u.real_name, sr.student_name) as student_real_name
    FROM writings w
    LEFT JOIN users u ON u.id = w.user_id
    LEFT JOIN student_roster sr ON sr.id = w.roster_id
    WHERE (${userFilter}${rosterFilter})
    ORDER BY w.created_at DESC
    LIMIT 200
  `).all(...params);
}
