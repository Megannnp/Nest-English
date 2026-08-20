import {
  getLatestWritingTaskByType,
  WRITING_TASK_TYPE,
} from '../writingTaskService.js';

function _resolveTaskStatus(status) {
  if (status === 'success' || status === 'ready') return 'ready';
  if (status === 'pending') return 'pending';
  if (status === 'running') return 'running';
  if (status === 'failed' || status === 'dead_letter') return 'failed';
  return 'not_requested';
}

function _taskField(task, camel, snake) {
  return task?.[camel] || task?.[snake] || null;
}

function _taskTimestamps(task) {
  return {
    startedAt: _taskField(task, 'startedAt', 'started_at'),
    updatedAt: _taskField(task, 'updatedAt', 'updated_at'),
    finishedAt: _taskField(task, 'finishedAt', 'finished_at'),
    lastHeartbeatAt: _taskField(task, 'lastHeartbeatAt', 'last_heartbeat_at'),
  };
}

function _buildTaskSnapshot(task) {
  return {
    attempts: Number(task?.attempts || 0),
    errorMessage: task?.errorMessage || task?.error_message || null,
    ..._taskTimestamps(task),
  };
}

export async function getDetailedFeedbackStatus(row) {
  const task = await getLatestWritingTaskByType(row?.id, WRITING_TASK_TYPE.DETAILED_FEEDBACK);
  return _resolveTaskStatus(String(task?.status || '').toLowerCase());
}

export async function getDetailedFeedbackPayload(row) {
  const task = await getLatestWritingTaskByType(row?.id, WRITING_TASK_TYPE.DETAILED_FEEDBACK);
  const status = String(task?.status || '').toLowerCase();
  if (!['success', 'ready'].includes(status)) return null;
  return task?.result || null;
}

export async function getSupplementalFeedbackTaskStatus(row) {
  const task = await getLatestWritingTaskByType(row?.id, WRITING_TASK_TYPE.SUPPLEMENTAL_FEEDBACK);
  return _resolveTaskStatus(String(task?.status || '').toLowerCase());
}

export async function getSupplementalFeedbackTaskSnapshot(row) {
  const task = await getLatestWritingTaskByType(row?.id, WRITING_TASK_TYPE.SUPPLEMENTAL_FEEDBACK);
  const status = await getSupplementalFeedbackTaskStatus(row);
  return { status, ..._buildTaskSnapshot(task) };
}

export { WRITING_TASK_TYPE };
