import db from '../../db/database.js';
import { ConflictError, NotFoundError } from '../../utils/appError.js';
import { nanoid } from '../../utils/nanoid.js';
import {
  normalizeAssignmentStatus,
  toClientAssignment,
} from '../assignmentSharedService.js';

export async function publishAssignment({ teacherId, assignmentId }) {
  const assignment = await db.prepare(`
    SELECT *
    FROM assignments
    WHERE id = ? AND teacher_id = ?
    LIMIT 1
  `).get(assignmentId, teacherId);

  if (!assignment) {
    throw new NotFoundError('作业不存在或无权限发布');
  }

  const currentStatus = normalizeAssignmentStatus(assignment.status);
  if (currentStatus !== 'draft') {
    throw new ConflictError('只有草稿作业可以发布');
  }

  const [students] = await db.pool.query(
    'SELECT student_id FROM class_students WHERE class_id = ? ORDER BY joined_at ASC',
    [assignment.class_id]
  );

  const now = Date.now();
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`
      UPDATE assignments
      SET status = 'published', updated_at = ?
      WHERE id = ? AND teacher_id = ?
    `, [now, assignmentId, teacherId]);

    for (const student of students) {
      await connection.query(`
        INSERT INTO assignment_tasks (
          id, assignment_id, student_id, class_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', ?, ?)
        ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)
      `, [nanoid(), assignmentId, student.student_id, assignment.class_id, now, now]);
    }

    await connection.commit();
  } catch (error) {
    try { await connection.rollback(); } catch { /* intentional */ }
    throw error;
  } finally {
    connection.release();
  }

  const updated = await db.prepare(`
    SELECT a.*, c.class_name
    FROM assignments a
    JOIN classes c ON c.id = a.class_id
    WHERE a.id = ?
    LIMIT 1
  `).get(assignmentId);

  return {
    assignment: { ...toClientAssignment(updated), className: updated?.class_name || '' },
    taskCount: students.length,
  };
}
