import { runQuestionAnalysisRetryJob } from './questionAnalysisQueueMutationService.js';
import {
  QUESTION_ANALYSIS_RECOVERY_INTERVAL_MS,
  QUESTION_ANALYSIS_STARTUP_RECOVERY_DELAY_MS,
  QUESTION_ANALYSIS_STALE_MS,
  QUESTION_ANALYSIS_WORKER_ID,
  addQueuedQuestionAnalysis,
  addRunningQuestionAnalysis,
  getQuestionAnalysisQueueState,
  getQuestionAnalysisRecoveryTimer,
  getQuestionAnalysisWorkerPollTimer,
  isQuestionAnalysisQueueActive,
  markQuestionAnalysisQueueActive,
  removeQueuedQuestionAnalysis,
  removeRunningQuestionAnalysis,
  setQuestionAnalysisRecoveryTimer,
  setQuestionAnalysisWorkerPollTimer,
} from './questionAnalysisQueueRuntime.js';
import { recoverStaleQuestionAnalysisJobs as recoverStaleQuestionAnalysisJobsInternal } from './questionAnalysisRecoveryService.js';
import {
  claimNextWritingTask,
  WRITING_TASK_TYPE,
} from './writingTaskService.js';
import { logError } from '../utils/logger.js';

async function processQuestionAnalysisQueue() {
  if (isQuestionAnalysisQueueActive()) return;
  markQuestionAnalysisQueueActive(true);

  while (true) {
    const claimedTask = await claimNextWritingTask({
      taskType: WRITING_TASK_TYPE.QUESTION_ANALYSIS,
      queueName: QUESTION_ANALYSIS_WORKER_ID,
      workerId: QUESTION_ANALYSIS_WORKER_ID,
      staleBefore: Date.now() - QUESTION_ANALYSIS_STALE_MS,
    });
    if (!claimedTask?.writingId) break;

    const writingId = claimedTask.writingId;
    removeQueuedQuestionAnalysis(writingId);
    addRunningQuestionAnalysis(writingId);

    try {
      await runQuestionAnalysisRetryJob(claimedTask);
    } catch (error) {
      logError('question_analysis_queue_task_failed', { writingId, message: error.message });
    } finally {
      removeRunningQuestionAnalysis(writingId);
    }
  }

  markQuestionAnalysisQueueActive(false);
}

function kickQuestionAnalysisWorker() {
  processQuestionAnalysisQueue().catch((error) => {
    logError('question_analysis_queue_loop_failed', { message: error.message });
  });
}

export function enqueueQuestionAnalysisRetryJob(writingId) {
  if (!writingId) return { accepted: false, state: 'idle' };
  const currentState = getQuestionAnalysisQueueState(writingId);
  if (currentState !== 'idle') {
    return { accepted: false, state: currentState };
  }

  addQueuedQuestionAnalysis(writingId);
  queueMicrotask(kickQuestionAnalysisWorker);

  return { accepted: true, state: 'queued' };
}

async function recoverStaleQuestionAnalysisJobs() {
  return recoverStaleQuestionAnalysisJobsInternal({
    staleBefore: Date.now() - QUESTION_ANALYSIS_STALE_MS,
    enqueueQuestionAnalysisRetryJob,
  });
}

export function startQuestionAnalysisRecoveryLoop() {
  if (getQuestionAnalysisRecoveryTimer()) return;

  const startupTimer = setTimeout(() => {
    recoverStaleQuestionAnalysisJobs().catch((error) => {
      logError('question_analysis_startup_recovery_failed', { message: error.message });
    });
  }, QUESTION_ANALYSIS_STARTUP_RECOVERY_DELAY_MS);
  startupTimer.unref?.();

  setQuestionAnalysisRecoveryTimer(setInterval(() => {
    recoverStaleQuestionAnalysisJobs().catch((error) => {
      logError('question_analysis_periodic_recovery_failed', { message: error.message });
    });
  }, QUESTION_ANALYSIS_RECOVERY_INTERVAL_MS));
  getQuestionAnalysisRecoveryTimer()?.unref?.();
}

export function startQuestionAnalysisWorkerLoop() {
  if (!getQuestionAnalysisWorkerPollTimer()) {
    setQuestionAnalysisWorkerPollTimer(setInterval(() => {
      kickQuestionAnalysisWorker();
    }, 1500));
    getQuestionAnalysisWorkerPollTimer()?.unref?.();
  }

  kickQuestionAnalysisWorker();
}

/**
 * Clears both the worker-poll and recovery intervals.
 * Call this during graceful shutdown before closing the DB pool so that no
 * new tasks are claimed after the shutdown signal is received.
 */
export function stopQuestionAnalysisLoops() {
  const pollTimer = getQuestionAnalysisWorkerPollTimer();
  if (pollTimer) {
    clearInterval(pollTimer);
    setQuestionAnalysisWorkerPollTimer(null);
  }

  const recoveryTimer = getQuestionAnalysisRecoveryTimer();
  if (recoveryTimer) {
    clearInterval(recoveryTimer);
    setQuestionAnalysisRecoveryTimer(null);
  }
}
