import { toTaskRow, WRITING_TASK_STATUS } from './model.js';
import db from '../../db/database.js';

export async function getWritingTasksByWritingId(writingId) {
  const rows = await db.prepare(`
    SELECT *
    FROM writing_tasks
    WHERE writing_id = ?
    ORDER BY created_at DESC
  `).all(writingId);

  return rows.map(toTaskRow);
}

export async function getLatestWritingTaskByType(writingId, taskType) {
  const row = await db.prepare(`
    SELECT *
    FROM writing_tasks
    WHERE writing_id = ? AND task_type = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `).get(writingId, taskType);

  return toTaskRow(row);
}

export async function getDeadLetterWritingTasks({
  taskType = null,
  limit = 50,
} = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit || 50), 200));
  const rows = taskType
    ? await db.prepare(`
        SELECT *
        FROM writing_tasks
        WHERE status = ? AND task_type = ?
        ORDER BY dead_lettered_at DESC, updated_at DESC
        LIMIT ?
      `).all(WRITING_TASK_STATUS.DEAD_LETTER, taskType, safeLimit)
    : await db.prepare(`
        SELECT *
        FROM writing_tasks
        WHERE status = ?
        ORDER BY dead_lettered_at DESC, updated_at DESC
        LIMIT ?
      `).all(WRITING_TASK_STATUS.DEAD_LETTER, safeLimit);

  return rows.map(toTaskRow);
}
