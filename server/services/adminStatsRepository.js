import db from '../db/database.js';

export async function getAdminDashboardBaseRows({
  userScope,
  classScope,
  writingScope,
  includeTestData,
  start,
}) {
  const [
    userSummary,
    writingSummary,
    classSummary,
    taskAiRows,
    eventAiRows,
    submissionRows,
    teacherRows,
    classRows,
  ] = await Promise.all([
    db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) AS teachers,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) AS students,
        SUM(CASE WHEN is_disabled = 1 THEN 1 ELSE 0 END) AS disabled
      FROM users u
      WHERE ${userScope}
    `).get(),
    db.prepare(`
      SELECT COUNT(*) AS total
      FROM writings w
      WHERE ${writingScope}
    `).get(),
    db.prepare(`SELECT COUNT(*) AS total FROM classes c WHERE ${classScope}`).get(),
    db.prepare(`
      SELECT wt.task_type AS scope, COUNT(*) AS total
      FROM writing_tasks wt
      LEFT JOIN writings w ON w.id = wt.writing_id
      WHERE ${includeTestData ? '1 = 1' : 'COALESCE(w.is_test_data, 0) = 0'}
      GROUP BY task_type
      ORDER BY total DESC
    `).all(),
    db.prepare(`
      SELECT e.feature AS scope, COUNT(*) AS total
      FROM ai_usage_events e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE ${includeTestData ? '1 = 1' : '(e.user_id IS NULL OR COALESCE(u.is_test_data, 0) = 0)'}
      GROUP BY e.feature
      ORDER BY total DESC
    `).all(),
    db.prepare(`
      SELECT DATE_FORMAT(FROM_UNIXTIME(w.created_at / 1000), '%Y-%m-%d') AS day, COUNT(*) AS total
      FROM writings w
      WHERE w.created_at >= ?
        AND ${writingScope}
      GROUP BY day
      ORDER BY day ASC
    `).all(start),
    db.prepare(`
      SELECT
        u.id,
        u.real_name,
        u.email,
        COUNT(DISTINCT c.id) AS class_count,
        COUNT(DISTINCT w.id) AS writing_count,
        MAX(w.created_at) AS last_active_at
      FROM users u
      LEFT JOIN classes c ON c.teacher_id = u.id
      LEFT JOIN assignments a ON a.teacher_id = u.id
      LEFT JOIN writings w ON w.assignment_id = a.id
      WHERE u.role = 'teacher'
        AND ${userScope}
        AND (w.id IS NULL OR COALESCE(w.is_test_data, 0) = 0)
      GROUP BY u.id, u.real_name, u.email
      ORDER BY writing_count DESC, class_count DESC, last_active_at DESC
      LIMIT 8
    `).all(),
    db.prepare(`
      SELECT
        c.id,
        c.class_name,
        COALESCE(NULLIF(u.real_name, ''), NULLIF(c.teacher_name, ''), u.email, '') AS teacher_name,
        COUNT(DISTINCT cs.student_id) AS student_count,
        COUNT(DISTINCT w.id) AS writing_count,
        MAX(w.created_at) AS last_active_at
      FROM classes c
      LEFT JOIN users u ON u.id = c.teacher_id
      LEFT JOIN class_students cs ON cs.class_id = c.id
      LEFT JOIN assignments a ON a.class_id = c.id
      LEFT JOIN writings w ON w.assignment_id = a.id
      WHERE ${classScope}
        AND (w.id IS NULL OR COALESCE(w.is_test_data, 0) = 0)
      GROUP BY c.id, c.class_name, c.teacher_name, u.real_name, u.email
      ORDER BY writing_count DESC, student_count DESC, last_active_at DESC
      LIMIT 8
    `).all(),
  ]);

  return {
    userSummary,
    writingSummary,
    classSummary,
    taskAiRows,
    eventAiRows,
    submissionRows,
    teacherRows,
    classRows,
  };
}

export async function getAdminUserListRows({ whereSql, params, pageSize, offset }) {
  const [totalRow, rows] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) AS total
      FROM users u
      ${whereSql}
    `).get(...params),
    db.prepare(`
      SELECT
        u.id, u.account_code, u.nick_name, u.email, u.phone, u.role, u.real_name,
        u.student_no, u.class_id, u.class_name, u.created_at, u.is_admin,
        u.is_disabled, u.disabled_at, u.is_test_data,
        COUNT(DISTINCT w.id) AS writing_count,
        COUNT(DISTINCT c.id) AS class_count,
        MAX(w.created_at) AS last_writing_at
      FROM users u
      LEFT JOIN writings w ON w.user_id = u.id
      LEFT JOIN classes c ON c.teacher_id = u.id
      ${whereSql}
      GROUP BY
        u.id, u.account_code, u.nick_name, u.email, u.phone, u.role, u.real_name,
        u.student_no, u.class_id, u.class_name, u.created_at, u.is_admin,
        u.is_disabled, u.disabled_at, u.is_test_data
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset),
  ]);

  return { totalRow, rows };
}

export async function getAdminUserDetailBaseRow(userId) {
  return db.prepare(`
    SELECT
      u.id, u.account_code, u.nick_name, u.email, u.phone, u.role, u.real_name,
      u.student_no, u.class_id, u.class_name, u.created_at, u.is_admin,
      u.is_disabled, u.disabled_at, u.disabled_by, u.is_test_data,
      COUNT(DISTINCT w.id) AS writing_count,
      COUNT(DISTINCT c.id) AS class_count,
      MAX(w.created_at) AS last_writing_at
    FROM users u
    LEFT JOIN writings w ON w.user_id = u.id
    LEFT JOIN classes c ON c.teacher_id = u.id
    WHERE u.id = ?
    GROUP BY
      u.id, u.account_code, u.nick_name, u.email, u.phone, u.role, u.real_name,
      u.student_no, u.class_id, u.class_name, u.created_at, u.is_admin,
      u.is_disabled, u.disabled_at, u.disabled_by, u.is_test_data
  `).get(userId);
}

export async function getAdminUserDetailExtraRows(userId) {
  const [teacherStats, aiRows, recentWritings] = await Promise.all([
    db.prepare(`
      SELECT COUNT(DISTINCT cs.student_id) AS student_count
      FROM classes c
      LEFT JOIN class_students cs ON cs.class_id = c.id
      WHERE c.teacher_id = ?
    `).get(userId),
    db.prepare(`
      SELECT wt.task_type AS scope, COUNT(*) AS total, MAX(wt.created_at) AS last_used_at
      FROM writing_tasks wt
      INNER JOIN writings w ON w.id = wt.writing_id
      WHERE w.user_id = ?
      GROUP BY wt.task_type
      ORDER BY total DESC
    `).all(userId),
    db.prepare(`
      SELECT id, writing_title, selected_type, created_at
      FROM writings
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(userId),
  ]);

  return {
    teacherStats,
    aiRows,
    recentWritings,
  };
}

export async function getAdminUserStatusRow(userId) {
  return db.prepare('SELECT id, is_admin, is_disabled FROM users WHERE id = ?').get(userId);
}

export async function updateAdminUserDisabledRow({ userId, disabled, adminId, timestamp }) {
  return db.prepare(`
    UPDATE users
    SET is_disabled = ?, disabled_at = ?, disabled_by = ?
    WHERE id = ?
  `).run(disabled ? 1 : 0, disabled ? timestamp : null, disabled ? adminId : null, userId);
}
