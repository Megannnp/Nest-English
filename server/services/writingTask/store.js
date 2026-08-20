import {
  serializeJson,
  toTaskRow,
} from './model.js';
import db from '../../db/database.js';
import { nanoid } from '../../utils/nanoid.js';

export async function saveWritingTask({
  writingId,
  taskType,
  status,
  queueName = '',
  payload = undefined,
  result = undefined,
  errorMessage = null,
  attempts = 0,
  startedAt = null,
  finishedAt = null,
  nextRunAt = null,
  lastHeartbeatAt = null,
  deadLetteredAt = null,
}) {
  const now = Date.now();
  const id = nanoid();

  // Atomic upsert avoids the SELECT→INSERT TOCTOU race that would violate
  // the UNIQUE KEY uniq_writing_task_type (writing_id, task_type) constraint
  // when two concurrent callers both see no existing row and both try to INSERT.
  await db.prepare(`
    INSERT INTO writing_tasks (
      id, writing_id, task_type, status, queue_name, payload, result, error_message,
      attempts, created_at, updated_at, next_run_at, last_heartbeat_at, dead_lettered_at, started_at, finished_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      queue_name = VALUES(queue_name),
      payload = VALUES(payload),
      result = VALUES(result),
      error_message = VALUES(error_message),
      attempts = VALUES(attempts),
      updated_at = VALUES(updated_at),
      next_run_at = VALUES(next_run_at),
      last_heartbeat_at = VALUES(last_heartbeat_at),
      dead_lettered_at = VALUES(dead_lettered_at),
      started_at = VALUES(started_at),
      finished_at = VALUES(finished_at)
  `).run(
    id,
    writingId,
    taskType,
    status,
    queueName,
    serializeJson(payload),
    serializeJson(result),
    errorMessage,
    attempts,
    now,
    now,
    nextRunAt,
    lastHeartbeatAt,
    deadLetteredAt,
    startedAt,
    finishedAt
  );

  const row = await db.prepare(`
    SELECT * FROM writing_tasks WHERE writing_id = ? AND task_type = ? LIMIT 1
  `).get(writingId, taskType);
  return toTaskRow(row);
}

export async function recoverStaleRunningTasks({ taskType, staleBefore }) {
  const now = Date.now();
  const result = await db.prepare(`
    UPDATE writing_tasks
    SET status = 'failed',
        error_message = '服务重启，任务已重置，请重试',
        finished_at = ?,
        updated_at = ?
    WHERE task_type = ?
      AND status = 'running'
      AND (last_heartbeat_at IS NULL OR last_heartbeat_at < ?)
  `).run(now, now, taskType, staleBefore);
  return result.changes || 0;
}

export async function markWritingTaskHeartbeat(taskId) {
  if (!taskId) return null;
  const now = Date.now();
  await db.prepare(`
    UPDATE writing_tasks
    SET last_heartbeat_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, taskId);
  const row = await db.prepare('SELECT * FROM writing_tasks WHERE id = ?').get(taskId);
  return toTaskRow(row);
}
