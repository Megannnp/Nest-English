import { QUESTION_ANALYSIS_RETRY_BASE_MS } from './questionAnalysisQueueConfig.js';
import {
  addQueuedQuestionAnalysis,
  removeQueuedQuestionAnalysis,
  addRunningQuestionAnalysis,
  removeRunningQuestionAnalysis,
  getQueuedQuestionAnalysisIds,
  getRunningQuestionAnalysisIds,
  getQuestionAnalysisWorkerId,
  setQuestionAnalysisWorker,
  getQuestionAnalysisWorker,
  markQuestionAnalysisQueueActive,
  isQuestionAnalysisQueueActive,
  getQuestionAnalysisRecoveryTimer,
  setQuestionAnalysisRecoveryTimer,
  getQuestionAnalysisWorkerPollTimer,
  setQuestionAnalysisWorkerPollTimer,
} from './questionAnalysisQueueStateStore.js';
import {
  WRITING_TASK_STATUS,
} from './writingTaskService.js';

export {
  QUESTION_ANALYSIS_RECOVERY_INTERVAL_MS,
  QUESTION_ANALYSIS_STALE_MS,
  QUESTION_ANALYSIS_STARTUP_RECOVERY_DELAY_MS,
  QUESTION_ANALYSIS_HEARTBEAT_INTERVAL_MS,
  QUESTION_ANALYSIS_MAX_ATTEMPTS,
  QUESTION_ANALYSIS_RETRY_BASE_MS,
  QUESTION_ANALYSIS_WORKER_ID,
} from './questionAnalysisQueueConfig.js';

export {
  addQueuedQuestionAnalysis,
  removeQueuedQuestionAnalysis,
  addRunningQuestionAnalysis,
  removeRunningQuestionAnalysis,
  setQuestionAnalysisWorker,
  getQuestionAnalysisWorker,
  markQuestionAnalysisQueueActive,
  isQuestionAnalysisQueueActive,
  getQuestionAnalysisRecoveryTimer,
  setQuestionAnalysisRecoveryTimer,
  getQuestionAnalysisWorkerPollTimer,
  setQuestionAnalysisWorkerPollTimer,
};

function _hasAnalysisArray(arr) {
  return Array.isArray(arr) && arr.length > 0;
}

export function hasGeneralAnalysisContent(feedback) {
  return Boolean(
    feedback?.overview ||
    feedback?.reason ||
    _hasAnalysisArray(feedback?.themes) ||
    _hasAnalysisArray(feedback?.focusPoints) ||
    _hasAnalysisArray(feedback?.risks) ||
    _hasAnalysisArray(feedback?.suggestions)
  );
}

export function shouldAutoQueueQuestionAnalysis(payload, normalizeWritingType, optionalTrimmedString) {
  return Boolean(
    normalizeWritingType(payload?.selectedType) &&
    optionalTrimmedString(payload?.fullText, 20000)
  );
}

export function getQuestionAnalysisQueueStateFromTask(task) {
  const status = String(task?.status || '').toLowerCase();
  if (status === WRITING_TASK_STATUS.RUNNING) return 'running';
  if (status === WRITING_TASK_STATUS.PENDING) return 'queued';
  if (status === WRITING_TASK_STATUS.DEAD_LETTER) return 'dead_letter';
  return 'idle';
}

export function getQuestionAnalysisQueueState(writingId, task = null) {
  if (!writingId) return 'idle';
  if (task) return getQuestionAnalysisQueueStateFromTask(task);
  if (getRunningQuestionAnalysisIds().has(writingId)) return 'running';
  if (getQueuedQuestionAnalysisIds().has(writingId)) return 'queued';
  return 'idle';
}

export function getQuestionAnalysisQueueMetrics() {
  return {
    queued: getQueuedQuestionAnalysisIds().size,
    running: getRunningQuestionAnalysisIds().size,
    queuedIds: Array.from(getQueuedQuestionAnalysisIds()),
    runningIds: Array.from(getRunningQuestionAnalysisIds()),
    workerActive: isQuestionAnalysisQueueActive(),
    workerId: getQuestionAnalysisWorkerId(),
  };
}

export function computeRetryDelay(attempts) {
  const step = Math.max(0, Number(attempts || 1) - 1);
  return Math.min(QUESTION_ANALYSIS_RETRY_BASE_MS * (2 ** step), 60 * 1000);
}

