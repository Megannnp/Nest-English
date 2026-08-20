import db from '../db/database.js';

export async function listStudentsForTeacher(teacherId) {
  return db.prepare(`
    SELECT DISTINCT u.id, u.email, u.phone, u.role, u.real_name, u.class_id, u.class_name, u.preferences, u.created_at,
      u.account_code
    FROM users u
    JOIN class_students cs ON cs.student_id = u.id
    JOIN classes c ON c.id = cs.class_id
    WHERE c.teacher_id = ?
    ORDER BY u.created_at DESC
  `).all(teacherId);
}

export async function findUserById(userId, columns = '*') {
  return db.prepare(`SELECT ${columns} FROM users WHERE id = ?`).get(userId);
}

export async function findUserByEmail(email) {
  return db.prepare('SELECT id FROM users WHERE email = ?').get(email);
}

export async function findUserByPhone(phone) {
  return db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
}

export async function findOtherUserByEmail(email, userId) {
  return db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
}

export async function findOtherUserByPhone(phone, userId) {
  return db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, userId);
}

export async function canTeacherAccessStudent(teacherId, studentId) {
  if (!teacherId || !studentId) return false;

  const membership = await db.prepare(`
    SELECT 1
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    WHERE cs.student_id = ? AND c.teacher_id = ?
    LIMIT 1
  `).get(studentId, teacherId);

  return Boolean(membership);
}

export async function updateUserById(userId, updates, params) {
  await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .run(...params, userId);
}

export async function getUserProfileRow(userId) {
  return findUserById(
    userId,
    'id, email, phone, role, real_name, class_id, class_name, preferences, created_at, account_code'
  );
}
