import { safeJsonParse } from '../../../utils/writingFeedback.js';
import { normalizeWritingType } from '../../aiService.js';
import {
  getLatestWritingTaskByType,
  markWritingTaskFailed,
  markWritingTaskQueued,
} from '../../writingTaskService.js';
import { buildFeedbackStatusResponse } from '../dto.js';
import { recordQuickFeedbackOutcome } from '../metrics.js';
import { WRITING_TASK_TYPE } from '../query.js';
import { loadWritingById } from '../repository.js';
import { getQuickFeedbackStatus } from '../status.js';
import { runQuickFeedbackGeneration } from './generation.js';
import { QUICK_FEEDBACK_TIMEOUT_MS } from './shared.js';

function _buildGradingPayload(row, feedback) {
  return {
    writingType: normalizeWritingType(row.selected_type || feedback?.aiAnalysis?.type || 'general'),
    staged: 'quick',
  };
}

function _detectStaleTask(taskStatus, latestTask, now) {
  const lastHeartbeatAt = Number(latestTask?.lastHeartbeatAt || 0);
  const startedAt = Number(latestTask?.startedAt || 0);
  const staleRunning = taskStatus === 'running'
    && ((lastHeartbeatAt && now - lastHeartbeatAt > 20000) || (startedAt && now - startedAt > QUICK_FEEDBACK_TIMEOUT_MS));
  const stalePending = taskStatus === 'pending'
    && Number(latestTask?.updatedAt || 0) > 0
    && now - Number(latestTask.updatedAt) > QUICK_FEEDBACK_TIMEOUT_MS;
  return { staleRunning, stalePending };
}

async function _markStaleTaskFailed(row, latestTask, feedback, staleRunning, stalePending) {
  await markWritingTaskFailed({
    writingId: row.id,
    taskType: WRITING_TASK_TYPE.GRADING,
    queueName: 'grading',
    attempts: Number(latestTask?.attempts || 1),
    payload: latestTask?.payload || _buildGradingPayload(row, feedback),
    errorMessage: staleRunning ? '快速反馈任务超时，已结束本次执行' : '快速反馈排队超时，已结束本次执行',
  });
  recordQuickFeedbackOutcome('timeout', {
    writingId: row.id,
    taskId: latestTask?.id || null,
    staleRunning,
    stalePending,
    durationMs: 0,
  });
}

export async function requestQuickFeedback({ row, user, onBeforeQueue = null }) {
  const feedback = safeJsonParse(row?.feedback, null);
  const quickStatus = getQuickFeedbackStatus(feedback);
  const latestTask = await getLatestWritingTaskByType(row?.id, WRITING_TASK_TYPE.GRADING);
  const taskStatus = String(latestTask?.status || '').toLowerCase();
  const { staleRunning, stalePending } = _detectStaleTask(taskStatus, latestTask, Date.now());

  if (quickStatus === 'ready') return buildFeedbackStatusResponse(row);

  if ((taskStatus === 'pending' || taskStatus === 'running') && !staleRunning && !stalePending) {
    return buildFeedbackStatusResponse(row);
  }

  if (staleRunning || stalePending) {
    await _markStaleTaskFailed(row, latestTask, feedback, staleRunning, stalePending);
  }

  if (typeof onBeforeQueue === 'function') {
    await onBeforeQueue();
  }

  await markWritingTaskQueued({
    writingId: row.id,
    taskType: WRITING_TASK_TYPE.GRADING,
    queueName: 'grading',
    payload: _buildGradingPayload(row, feedback),
  });
  recordQuickFeedbackOutcome('queued', {
    writingId: row.id,
    previousTaskStatus: taskStatus || 'not_started',
  });

  setTimeout(() => { void runQuickFeedbackGeneration({ writingId: row.id, user }); }, 0);

  const latest = await loadWritingById(row.id);
  return buildFeedbackStatusResponse(latest);
}
