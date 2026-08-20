export const WRITING_TASK_TYPE = {
  QUESTION_ANALYSIS: 'question_analysis',
  GRADING: 'grading',
  DETAILED_FEEDBACK: 'detailed_feedback',
};

export const WRITING_TASK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  DEAD_LETTER: 'dead_letter',
};

export function serializeJson(value) {
  if (value === undefined) return null;
  return JSON.stringify(value ?? null);
}

function safeParseTaskJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function _rowTimestamp(row, key) {
  return Number(row[key] || 0) || null;
}

export function toTaskRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    writingId: row.writing_id,
    taskType: row.task_type,
    status: row.status,
    queueName: row.queue_name || '',
    attempts: Number(row.attempts || 0),
    payload: safeParseTaskJson(row.payload),
    result: safeParseTaskJson(row.result),
    errorMessage: row.error_message || null,
    createdAt: _rowTimestamp(row, 'created_at'),
    updatedAt: _rowTimestamp(row, 'updated_at'),
    nextRunAt: _rowTimestamp(row, 'next_run_at'),
    lastHeartbeatAt: _rowTimestamp(row, 'last_heartbeat_at'),
    deadLetteredAt: _rowTimestamp(row, 'dead_lettered_at'),
    startedAt: _rowTimestamp(row, 'started_at'),
    finishedAt: _rowTimestamp(row, 'finished_at'),
  };
}
