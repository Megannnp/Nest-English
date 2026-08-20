import { classifyAIError } from './aiProviderService.js';
import { generateDetailedFeedbackResult } from './feedback/ai.js';
import { recordFeedbackGenerationOutcome } from './feedback/metrics.js';
import { logError } from '../utils/logger.js';
import { runQuickFeedbackGeneration } from './feedback/quick/generation.js';
import { runSupplementalFullFeedbackGeneration } from './feedback/quick/supplementalRunner.js';
import { loadWritingById } from './feedback/repository.js';
import { createWorkerLoopBackoff } from './workerLoopBackoff.js';
import {
  claimNextWritingTask,
  markWritingTaskFailed,
  markWritingTaskHeartbeat,
  markWritingTaskSuccess,
  WRITING_TASK_TYPE,
} from './writingTaskService.js';

const FEEDBACK_TASK_WORKER_ID = 'feedback_worker';
const FEEDBACK_TASK_STALE_MS = 2 * 60 * 1000;
const FEEDBACK_TASK_POLL_INTERVAL_MS = 1500;
const FEEDBACK_RECOVERY_INTERVAL_MS = 30000;
const FEEDBACK_TASK_TYPES = [
  WRITING_TASK_TYPE.GRADING,
  WRITING_TASK_TYPE.DETAILED_FEEDBACK,
  WRITING_TASK_TYPE.SUPPLEMENTAL_FEEDBACK,
];

let feedbackWorkerTimer = null;
let feedbackRecoveryTimer = null;
let feedbackQueueActive = false;
const feedbackWorkerBackoff = createWorkerLoopBackoff({
  baseDelayMs: FEEDBACK_TASK_POLL_INTERVAL_MS,
  maxDelayMs: FEEDBACK_RECOVERY_INTERVAL_MS,
});

async function claimNextFeedbackTask() {
  for (const taskType of FEEDBACK_TASK_TYPES) {
    const task = await claimNextWritingTask({
      taskType,
      queueName: FEEDBACK_TASK_WORKER_ID,
      workerId: FEEDBACK_TASK_WORKER_ID,
      staleBefore: Date.now() - FEEDBACK_TASK_STALE_MS,
    });
    if (task?.writingId) {
      return task;
    }
  }
  return null;
}

async function runDetailedFeedbackTask(task) {
  const row = await loadWritingById(task.writingId);
  if (!row) return;

  const startedAt = Date.now();
  const heartbeat = setInterval(() => {
    void markWritingTaskHeartbeat(task.id).catch((error) => {
      logError('detailed_feedback_task_heartbeat_failed', {
        writingId: task.writingId,
        message: error.message,
      });
    });
  }, 4000);
  heartbeat.unref?.();

  try {
    const detailedResult = await generateDetailedFeedbackResult(row);
    await markWritingTaskSuccess({
      writingId: row.id,
      taskType: WRITING_TASK_TYPE.DETAILED_FEEDBACK,
      queueName: FEEDBACK_TASK_WORKER_ID,
      attempts: Number(task.attempts || 1),
      payload: task.payload,
      result: detailedResult,
    });
    recordFeedbackGenerationOutcome('detailed', 'succeeded', {
      writingId: row.id,
      durationMs: Date.now() - startedAt,
      inputChars: String(row.full_text || '').length,
    });
  } catch (error) {
    const errorCode = classifyAIError(error).code;
    await markWritingTaskFailed({
      writingId: task.writingId,
      taskType: WRITING_TASK_TYPE.DETAILED_FEEDBACK,
      queueName: FEEDBACK_TASK_WORKER_ID,
      attempts: Number(task.attempts || 1),
      payload: task.payload,
      errorMessage: error.message || 'AI精批生成失败',
    });
    if (errorCode === 'AI_TIMEOUT') {
      recordFeedbackGenerationOutcome('detailed', 'timeout', {
        writingId: task.writingId,
        durationMs: Date.now() - startedAt,
        inputChars: String(row.full_text || '').length,
      });
    }
    if (String(error.message || '').includes('AI 返回格式错误')) {
      recordFeedbackGenerationOutcome('detailed', 'invalid_json', {
        writingId: task.writingId,
        durationMs: Date.now() - startedAt,
        inputChars: String(row.full_text || '').length,
      });
    }
    recordFeedbackGenerationOutcome('detailed', 'failed', {
      writingId: task.writingId,
      durationMs: Date.now() - startedAt,
      errorMessage: error.message || 'AI精批生成失败',
      inputChars: String(row.full_text || '').length,
      errorCode,
    });
  } finally {
    clearInterval(heartbeat);
  }
}

async function runSupplementalFeedbackTask(task) {
  const row = await loadWritingById(task.writingId);
  if (!row) return;
  const startedAt = Date.now();

  const heartbeat = setInterval(() => {
    void markWritingTaskHeartbeat(task.id).catch((error) => {
      logError('supplemental_feedback_task_heartbeat_failed', {
        writingId: task.writingId,
        message: error.message,
      });
    });
  }, 4000);
  heartbeat.unref?.();

  try {
    await runSupplementalFullFeedbackGeneration({ writingId: task.writingId });
    await markWritingTaskSuccess({
      writingId: task.writingId,
      taskType: WRITING_TASK_TYPE.SUPPLEMENTAL_FEEDBACK,
      queueName: FEEDBACK_TASK_WORKER_ID,
      attempts: Number(task.attempts || 1),
      payload: task.payload,
      result: { status: 'ready' },
    });
    recordFeedbackGenerationOutcome('supplemental', 'succeeded', {
      writingId: task.writingId,
      durationMs: Date.now() - startedAt,
      inputChars: String(row.full_text || '').length,
    });
  } catch (error) {
    await markWritingTaskFailed({
      writingId: task.writingId,
      taskType: WRITING_TASK_TYPE.SUPPLEMENTAL_FEEDBACK,
      queueName: FEEDBACK_TASK_WORKER_ID,
      attempts: Number(task.attempts || 1),
      payload: task.payload,
      errorMessage: error.message || '完整精批补齐失败',
    });
    const errorCode = classifyAIError(error).code;
    recordFeedbackGenerationOutcome('supplemental', 'failed', {
      writingId: task.writingId,
      durationMs: Date.now() - startedAt,
      inputChars: String(row.full_text || '').length,
      errorMessage: error.message || '完整精批补齐失败',
      errorCode,
    });
  } finally {
    clearInterval(heartbeat);
  }
}

async function runClaimedFeedbackTask(task) {
  if (!task?.writingId) return;
  const scope = task.taskType === WRITING_TASK_TYPE.DETAILED_FEEDBACK
    ? 'detailed'
    : (task.taskType === WRITING_TASK_TYPE.SUPPLEMENTAL_FEEDBACK ? 'supplemental' : 'quick');
  if (task.recoveredFromStale) {
    recordFeedbackGenerationOutcome(scope, 'stale_recovered', {
      writingId: task.writingId,
      taskId: task.id || null,
      attempts: task.attempts,
      previousStatus: task.previousStatus || null,
    });
  }

  if (task.taskType === WRITING_TASK_TYPE.GRADING) {
    await runQuickFeedbackGeneration({
      writingId: task.writingId,
      user: null,
      claimedTask: task,
    });
    return;
  }

  if (task.taskType === WRITING_TASK_TYPE.DETAILED_FEEDBACK) {
    await runDetailedFeedbackTask(task);
    return;
  }

  if (task.taskType === WRITING_TASK_TYPE.SUPPLEMENTAL_FEEDBACK) {
    await runSupplementalFeedbackTask(task);
  }
}

async function processFeedbackTaskQueue() {
  if (feedbackQueueActive) return;
  feedbackQueueActive = true;

  try {
    while (true) {
      const task = await claimNextFeedbackTask();
      if (!task?.writingId) break;

      try {
        await runClaimedFeedbackTask(task);
      } catch (error) {
        logError('feedback_task_execution_failed', {
          taskType: task.taskType,
          writingId: task.writingId,
          message: error.message,
        });
      }
    }
  } finally {
    feedbackQueueActive = false;
  }
}

function kickFeedbackWorker() {
  if (feedbackWorkerBackoff.shouldSkip()) {
    return;
  }

  processFeedbackTaskQueue().then(() => {
    feedbackWorkerBackoff.recordSuccess();
  }, (error) => {
    const retryAfterMs = feedbackWorkerBackoff.recordFailure();
    logError('feedback_task_queue_loop_failed', {
      message: error.message,
      retryAfterMs,
    });
  });
}

export function startFeedbackTaskWorkerLoop() {
  if (!feedbackWorkerTimer) {
    feedbackWorkerTimer = setInterval(() => {
      kickFeedbackWorker();
    }, FEEDBACK_TASK_POLL_INTERVAL_MS);
    feedbackWorkerTimer.unref?.();
  }

  kickFeedbackWorker();
}

export function startFeedbackTaskRecoveryLoop() {
  if (feedbackRecoveryTimer) return;
  feedbackRecoveryTimer = setInterval(() => {
    kickFeedbackWorker();
  }, FEEDBACK_RECOVERY_INTERVAL_MS);
  feedbackRecoveryTimer.unref?.();
}

export function stopFeedbackTaskLoops() {
  if (feedbackWorkerTimer) {
    clearInterval(feedbackWorkerTimer);
    feedbackWorkerTimer = null;
  }
  if (feedbackRecoveryTimer) {
    clearInterval(feedbackRecoveryTimer);
    feedbackRecoveryTimer = null;
  }
}
