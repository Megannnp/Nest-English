import db from '../../db/database.js';

export async function getPendingGradingsCount(teacherId) {
  const row = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM assignment_tasks t
    JOIN assignments a ON a.id = t.assignment_id
    WHERE a.teacher_id = ?
      AND t.status IN ('submitted', 'grading')
  `).get(teacherId);
  return Number(row?.count || 0);
}

export async function getPendingCommentsCount(teacherId) {
  const row = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM assignment_tasks t
    JOIN assignments a ON a.id = t.assignment_id
    LEFT JOIN writings w ON w.id = t.writing_id
    WHERE a.teacher_id = ?
      AND t.status = 'returned'
      AND (w.teacher_comment IS NULL OR w.teacher_comment = '')
  `).get(teacherId);
  return Number(row?.count || 0);
}

export async function getExceptionCount(teacherId) {
  const row = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM writing_tasks wt
    JOIN writings w ON w.id = wt.writing_id
    LEFT JOIN assignments a ON a.id = w.assignment_id
    WHERE wt.status IN ('failed', 'dead_letter')
      AND (
        a.teacher_id = ?
        OR EXISTS (
          SELECT 1
          FROM class_students cs
          JOIN classes c2 ON c2.id = cs.class_id
          WHERE cs.student_id = w.user_id AND c2.teacher_id = ?
        )
        OR JSON_UNQUOTE(JSON_EXTRACT(w.submitted_by_teacher, '$.teacherId')) = ?
      )
  `).get(teacherId, teacherId, teacherId);
  return Number(row?.count || 0);
}

export async function listDueSoonRows(teacherId, now, upperBound) {
  return db.prepare(`
    SELECT
      a.id,
      a.class_id,
      a.title,
      a.max_score,
      a.due_at,
      a.updated_at,
      c.class_name,
      COUNT(t.id) AS total_count,
      SUM(CASE WHEN t.status = 'returned' THEN 1 ELSE 0 END) AS returned_count,
      SUM(CASE WHEN t.status IN ('pending', 'overdue') THEN 1 ELSE 0 END) AS unfinished_count
    FROM assignments a
    JOIN classes c ON c.id = a.class_id
    LEFT JOIN assignment_tasks t ON t.assignment_id = a.id
    WHERE a.teacher_id = ?
      AND a.status IN ('published', 'active')
      AND a.due_at IS NOT NULL
      AND a.due_at > ?
      AND a.due_at <= ?
    GROUP BY a.id, a.class_id, a.title, a.max_score, a.due_at, a.updated_at, c.class_name
    ORDER BY a.due_at ASC
    LIMIT 20
  `).all(teacherId, now, upperBound);
}

export async function listGradingRows(teacherId) {
  return db.prepare(`
    SELECT
      w.id,
      w.user_id,
      w.user_name,
      w.class_name,
      w.assignment_id,
      a.class_id,
      w.writing_title,
      w.created_at,
      t.status AS task_status,
      a.title AS assignment_title,
      a.max_score,
      JSON_EXTRACT(w.feedback, '$.totalScore') AS total_score,
      JSON_UNQUOTE(JSON_EXTRACT(w.feedback, '$.summary')) AS quick_summary,
      w.teacher_comment
    FROM assignment_tasks t
    JOIN assignments a ON a.id = t.assignment_id
    LEFT JOIN writings w ON w.id = t.writing_id
    WHERE a.teacher_id = ?
      AND t.status IN ('submitted', 'grading', 'returned')
      AND w.id IS NOT NULL
    ORDER BY
      CASE t.status
        WHEN 'submitted' THEN 0
        WHEN 'grading' THEN 1
        ELSE 2
      END,
      w.created_at DESC
    LIMIT 20
  `).all(teacherId);
}

export async function listPendingCommentRows(teacherId) {
  return db.prepare(`
    SELECT
      w.id,
      w.user_id,
      w.user_name,
      w.class_name,
      w.assignment_id,
      a.class_id,
      w.writing_title,
      w.created_at,
      t.status AS task_status,
      a.title AS assignment_title,
      a.max_score,
      JSON_EXTRACT(w.feedback, '$.totalScore') AS total_score,
      JSON_UNQUOTE(JSON_EXTRACT(w.feedback, '$.summary')) AS quick_summary
    FROM assignment_tasks t
    JOIN assignments a ON a.id = t.assignment_id
    JOIN writings w ON w.id = t.writing_id
    WHERE a.teacher_id = ?
      AND t.status = 'returned'
      AND (w.teacher_comment IS NULL OR w.teacher_comment = '')
    ORDER BY w.created_at DESC
    LIMIT 20
  `).all(teacherId);
}

export async function listExceptionRows(teacherId) {
  return db.prepare(`
    SELECT
      wt.id,
      wt.task_type,
      wt.status,
      wt.error_message,
      wt.updated_at,
      w.id AS writing_id,
      w.user_name,
      w.class_name,
      w.assignment_id,
      a.class_id,
      a.title AS assignment_title
    FROM writing_tasks wt
    JOIN writings w ON w.id = wt.writing_id
    LEFT JOIN assignments a ON a.id = w.assignment_id
    WHERE wt.status IN ('failed', 'dead_letter')
      AND (
        a.teacher_id = ?
        OR EXISTS (
          SELECT 1
          FROM class_students cs
          JOIN classes c2 ON c2.id = cs.class_id
          WHERE cs.student_id = w.user_id AND c2.teacher_id = ?
        )
        OR JSON_UNQUOTE(JSON_EXTRACT(w.submitted_by_teacher, '$.teacherId')) = ?
      )
    ORDER BY wt.updated_at DESC
    LIMIT 20
  `).all(teacherId, teacherId, teacherId);
}
