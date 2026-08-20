import db from '../../db/database.js';
import { NotFoundError } from '../../utils/appError.js';
import { toClientAssignment } from '../assignmentSharedService.js';

export async function listAssignmentsByTeacher(teacherId, classId = null) {
  const rows = classId
    ? await db.prepare(`
        SELECT a.*, c.class_name
        FROM assignments a
        JOIN classes c ON c.id = a.class_id
        WHERE a.teacher_id = ? AND a.class_id = ?
        ORDER BY a.created_at DESC
      `).all(teacherId, classId)
    : await db.prepare(`
        SELECT a.*, c.class_name
        FROM assignments a
        JOIN classes c ON c.id = a.class_id
        WHERE a.teacher_id = ?
        ORDER BY a.created_at DESC
      `).all(teacherId);
  return rows.map((row) => ({ ...toClientAssignment(row), className: row.class_name || '' }));
}

export async function getAssignmentDetailByTeacher(teacherId, assignmentId) {
  const row = await db.prepare(`
    SELECT a.*, c.class_name
    FROM assignments a
    JOIN classes c ON c.id = a.class_id
    WHERE a.id = ? AND a.teacher_id = ?
    LIMIT 1
  `).get(assignmentId, teacherId);

  if (!row) {
    throw new NotFoundError('作业不存在或无权限查看');
  }

  const [summaryRows] = await db.pool.query(`
    SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN status IN ('submitted', 'grading') THEN 1 ELSE 0 END) AS grading_count,
      SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned_count,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) AS overdue_count
    FROM assignment_tasks
    WHERE assignment_id = ?
  `, [assignmentId]);

  const summary = summaryRows?.[0] || {};
  return {
    assignment: { ...toClientAssignment(row), className: row.class_name || '' },
    summary: {
      totalCount: Number(summary.total_count || 0),
      pendingCount: Number(summary.pending_count || 0),
      gradingCount: Number(summary.grading_count || 0),
      returnedCount: Number(summary.returned_count || 0),
      overdueCount: Number(summary.overdue_count || 0),
    },
  };
}
