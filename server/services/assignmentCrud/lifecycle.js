import db from '../../db/database.js';
import { NotFoundError } from '../../utils/appError.js';
import { toClientAssignment } from '../assignmentSharedService.js';

export async function closeAssignment({ teacherId, assignmentId }) {
  const now = Date.now();
  const result = await db.prepare(`
    UPDATE assignments
    SET status = 'closed', updated_at = ?
    WHERE id = ? AND teacher_id = ?
      AND status IN ('published', 'active')
  `).run(now, assignmentId, teacherId);

  if (!result?.changes) {
    throw new NotFoundError('作业不存在、无权限关闭，或当前状态不是已发布');
  }

  const updated = await db.prepare(`
    SELECT a.*, c.class_name
    FROM assignments a
    JOIN classes c ON c.id = a.class_id
    WHERE a.id = ?
    LIMIT 1
  `).get(assignmentId);
  return { ...toClientAssignment(updated), className: updated?.class_name || '' };
}

export async function archiveAssignment({ teacherId, assignmentId }) {
  const now = Date.now();
  const result = await db.prepare(`
    UPDATE assignments
    SET status = 'archived', updated_at = ?
    WHERE id = ? AND teacher_id = ?
      AND status = 'closed'
  `).run(now, assignmentId, teacherId);

  if (!result?.changes) {
    throw new NotFoundError('作业不存在、无权限归档，或当前状态不是已关闭');
  }

  const updated = await db.prepare(`
    SELECT a.*, c.class_name
    FROM assignments a
    JOIN classes c ON c.id = a.class_id
    WHERE a.id = ?
    LIMIT 1
  `).get(assignmentId);
  return { ...toClientAssignment(updated), className: updated?.class_name || '' };
}
