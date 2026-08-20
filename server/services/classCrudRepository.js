import db from '../db/database.js';

export async function listClassesByTeacher(teacherId) {
  return db.prepare('SELECT * FROM classes WHERE teacher_id = ? ORDER BY created_at DESC').all(teacherId);
}

export async function getClassByCode(classCode) {
  return db.prepare('SELECT * FROM classes WHERE class_code = ?').get(classCode);
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

export async function updateUserClass(userId, classId, className) {
  await db.prepare('UPDATE users SET class_id = ?, class_name = ? WHERE id = ?').run(classId, className, userId);
}

export async function getClassUserById(userId) {
  return db.prepare(
    'SELECT id, account_code, email, role, real_name, student_no, class_id, class_name FROM users WHERE id = ?'
  ).get(userId);
}
