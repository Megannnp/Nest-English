import { toTaskRow, WRITING_TASK_STATUS } from './model.js';
import db from '../../db/database.js';

export async function claimNextWritingTask({
  taskType,
  queueName = '',
  workerId = 'default-worker',
  staleBefore = Date.now() - 5 * 60 * 1000,
}) {
  const candidate = await db.prepare(`
    SELECT *
    FROM writing_tasks
    WHERE task_type = ?
      AND dead_lettered_at IS NULL
      AND (next_run_at IS NULL OR next_run_at <= ?)
      AND (
        status = ?
        OR (status = ? AND last_heartbeat_at IS NOT NULL AND last_heartbeat_at < ?)
      )
    ORDER BY updated_at ASC
    LIMIT 1
  `).get(
    taskType,
    Date.now(),
    WRITING_TASK_STATUS.PENDING,
    WRITING_TASK_STATUS.RUNNING,
    staleBefore
  );

  if (!candidate) return null;

  const now = Date.now();
  const nextAttempts = Math.max(1, Number(candidate.attempts || 0) || 0);
  const result = await db.prepare(`
    UPDATE writing_tasks
    SET status = ?, queue_name = ?, attempts = ?, started_at = ?, finished_at = NULL, updated_at = ?,
        next_run_at = NULL, dead_lettered_at = NULL, error_message = NULL, last_heartbeat_at = ?
    WHERE id = ?
      AND dead_lettered_at IS NULL
      AND (next_run_at IS NULL OR next_run_at <= ?)
      AND (
        status = ?
        OR (status = ? AND last_heartbeat_at IS NOT NULL AND last_heartbeat_at < ?)
      )
  `).run(
    WRITING_TASK_STATUS.RUNNING,
    queueName || workerId,
    nextAttempts,
    now,
    now,
    now,
    candidate.id,
    Date.now(),
    WRITING_TASK_STATUS.PENDING,
    WRITING_TASK_STATUS.RUNNING,
    staleBefore
  );

  if (!result?.changes) {
    return null;
  }

  const claimedRow = await db.prepare('SELECT * FROM writing_tasks WHERE id = ?').get(candidate.id);
  return toTaskRow(claimedRow);
}
