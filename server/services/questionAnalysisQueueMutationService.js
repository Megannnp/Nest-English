import { recordQuestionAnalysisMetric } from './questionAnalysisMetrics.js';
import {
  QUESTION_ANALYSIS_HEARTBEAT_INTERVAL_MS,
  QUESTION_ANALYSIS_MAX_ATTEMPTS,
  computeRetryDelay,
  getQuestionAnalysisWorker,
  hasGeneralAnalysisContent,
} from './questionAnalysisQueueRuntime.js';
import {
  markWritingTaskDeadLetter,
  markWritingTaskHeartbeat,
  markWritingTaskQueued,
  markWritingTaskRetryPending,
  markWritingTaskSuccess,
  WRITING_TASK_TYPE,
} from './writingTaskService.js';
import db from '../db/database.js';
import {
  FEEDBACK_STATUS,
  isPlainObject,
} from '../utils/feedbackSchema.js';
import { logError } from '../utils/logger.js';
import {
  buildAnalysisMeta,
  finalizeFeedback,
  mergeFeedback,
  safeJsonParse,
  serializeFeedback,
} from '../utils/writingFeedback.js';

function buildQuestionAnalysisTaskPayload(row) {
  return {
    writingType: row?.selected_type || 'general',
    title: row?.writing_title || '',
  };
}

export function buildQuestionAnalysisRetryPayload(row) {
  return buildQuestionAnalysisTaskPayload(row);
}

function _computeQueueStats(existingMeta, options) {
  const baseRetryCount = options.resetRetryCount ? 0 : (existingMeta.retryCount || 0);
  const retryCount = options.incrementRetry ? baseRetryCount + 1 : baseRetryCount;
  const manualReplayCount = options.manualReplay
    ? (existingMeta.manualReplayCount || 0) + 1
    : (existingMeta.manualReplayCount || 0);
  return { retryCount, manualReplayCount };
}

function _buildPendingQA(existingFeedback, row, options) {
  return {
    ...(isPlainObject(existingFeedback.questionAnalysis) ? existingFeedback.questionAnalysis : {}),
    type: row.selected_type || existingFeedback?.type || 'general',
    status: FEEDBACK_STATUS.PENDING,
    pending: true,
    overview: options.overview || '题目分析重新生成中，请稍候查看。',
  };
}

export async function markWritingQueuedForQuestionAnalysis(row, options = {}) {
  if (!row?.id) return null;

  const existingFeedback = safeJsonParse(row.feedback, {}) || {};
  const existingMeta = buildAnalysisMeta(existingFeedback, row.selected_type, existingFeedback?.analysisMeta || {});
  const now = Date.now();
  const { retryCount, manualReplayCount } = _computeQueueStats(existingMeta, options);

  const pendingQuestionAnalysis = _buildPendingQA(existingFeedback, row, options);

  const queuedFeedback = finalizeFeedback(
    existingFeedback,
    mergeFeedback(existingFeedback, {
      questionAnalysis: pendingQuestionAnalysis,
      analysisMeta: {
        ...existingMeta,
        retryCount,
        manualReplayCount,
        lastAttemptAt: now,
        lastError: options.clearLastError ? null : existingMeta.lastError,
        queueState: 'queued',
      },
      status: FEEDBACK_STATUS.PENDING,
    }),
    {
      questionAnalysis: pendingQuestionAnalysis,
      status: FEEDBACK_STATUS.PENDING,
    },
    row.selected_type
  );

  await db.prepare('UPDATE writings SET feedback = ? WHERE id = ?')
    .run(serializeFeedback(queuedFeedback), row.id);

  await markWritingTaskQueued({
    writingId: row.id,
    taskType: WRITING_TASK_TYPE.QUESTION_ANALYSIS,
    queueName: 'question_analysis',
    attempts: retryCount,
    payload: buildQuestionAnalysisTaskPayload(row),
  });
  recordQuestionAnalysisMetric('queued', {
    writingId: row.id,
    retryCount,
    manualReplayCount,
  });

  return queuedFeedback;
}

function _buildRunningFeedback(existingFeedback, existingMeta, nextRetryCount, now, row) {
  return finalizeFeedback(
    existingFeedback,
    mergeFeedback(existingFeedback, {
      analysisMeta: {
        ...existingMeta,
        retryCount: nextRetryCount,
        lastAttemptAt: existingMeta.lastAttemptAt || now,
        lastError: null,
        queueState: 'running',
      },
      status: FEEDBACK_STATUS.PENDING,
    }),
    { status: FEEDBACK_STATUS.PENDING },
    row.selected_type
  );
}

async function _loadRelatedRows(row) {
  const questionRow = row.question_id
    ? await db.prepare("SELECT COALESCE(prompt_text, content, '') AS prompt_text FROM questions WHERE id = ?").get(row.question_id)
    : null;
  const assignmentRow = row.assignment_id
    ? await db.prepare('SELECT prompt_text FROM assignments WHERE id = ?').get(row.assignment_id)
    : null;
  return { questionRow, assignmentRow };
}

function _startHeartbeat(task, writingId) {
  if (!task?.id) return null;
  const timer = setInterval(() => {
    markWritingTaskHeartbeat(task.id).catch((error) => {
      logError('question_analysis_task_heartbeat_failed', { writingId, message: error.message });
    });
  }, QUESTION_ANALYSIS_HEARTBEAT_INTERVAL_MS);
  timer.unref?.();
  return timer;
}

async function _callWorker(questionAnalysisWorker, row, questionRow, assignmentRow, existingFeedback) {
  return questionAnalysisWorker({
    type: row.selected_type,
    title: row.writing_title,
    promptText: row.prompt_text || questionRow?.prompt_text || assignmentRow?.prompt_text || '',
    studentText: row.full_text || '',
    aiAnalysis: existingFeedback.aiAnalysis || null,
  });
}

async function _loadPostAIFeedback(writingId, runningFeedback) {
  const postAIRow = await db.prepare('SELECT * FROM writings WHERE id = ?').get(writingId);
  return { postAIRow, postAIFeedback: safeJsonParse(postAIRow?.feedback, {}) || runningFeedback };
}

async function _persistSuccess({ writingId, postAIRow, postAIFeedback, questionAnalysis, runningFeedback, existingMeta, now, nextRetryCount, startedAt, row }) {
  const successFeedback = finalizeFeedback(
    postAIFeedback,
    mergeFeedback(postAIFeedback, {
      questionAnalysis,
      analysisMeta: {
        ...(runningFeedback.analysisMeta || {}),
        retryCount: nextRetryCount,
        manualReplayCount: existingMeta.manualReplayCount || 0,
        lastAttemptAt: existingMeta.lastAttemptAt || now,
        lastSuccessAt: Date.now(),
        lastError: null,
        queueState: 'idle',
      },
      status: questionAnalysis.status,
    }),
    { questionAnalysis, status: questionAnalysis.status },
    postAIRow?.selected_type || row.selected_type
  );
  await db.prepare('UPDATE writings SET feedback = ? WHERE id = ?').run(serializeFeedback(successFeedback), writingId);
  await markWritingTaskSuccess({
    writingId,
    taskType: WRITING_TASK_TYPE.QUESTION_ANALYSIS,
    queueName: 'question_analysis',
    attempts: nextRetryCount,
    payload: buildQuestionAnalysisTaskPayload(row),
    result: { status: questionAnalysis.status, type: questionAnalysis.type },
  });
  recordQuestionAnalysisMetric('succeeded', { writingId, retryCount: nextRetryCount, durationMs: Date.now() - startedAt });
}

async function _persistFailure({ writingId, analysisError, existingFeedback, postAIRow, postAIFeedback, runningFeedback, existingMeta, row, nextRetryCount, now, startedAt }) {
  const failedQA = {
    ...(postAIFeedback.questionAnalysis || runningFeedback.questionAnalysis || {}),
    pending: false,
    status: hasGeneralAnalysisContent(existingFeedback.questionAnalysis || {})
      ? FEEDBACK_STATUS.PARTIAL
      : FEEDBACK_STATUS.FAILED,
    overview: '题目分析重跑失败，当前保留已有内容，请稍后重试。',
  };
  const failedFeedback = finalizeFeedback(
    postAIFeedback,
    mergeFeedback(postAIFeedback, {
      questionAnalysis: failedQA,
      analysisMeta: {
        ...(runningFeedback.analysisMeta || {}),
        retryCount: nextRetryCount,
        manualReplayCount: existingMeta.manualReplayCount || 0,
        lastAttemptAt: existingMeta.lastAttemptAt || now,
        lastFailureAt: Date.now(),
        lastError: analysisError.message,
        queueState: 'idle',
      },
      errorCode: 'QUESTION_ANALYSIS_RETRY_FAILED',
      status: failedQA.status,
    }),
    { questionAnalysis: failedQA, errorCode: 'QUESTION_ANALYSIS_RETRY_FAILED', status: failedQA.status },
    postAIRow?.selected_type || row.selected_type
  );
  await db.prepare('UPDATE writings SET feedback = ? WHERE id = ?').run(serializeFeedback(failedFeedback), writingId);

  const taskPayload = buildQuestionAnalysisTaskPayload(row);
  if (nextRetryCount >= QUESTION_ANALYSIS_MAX_ATTEMPTS) {
    await markWritingTaskDeadLetter({
      writingId, taskType: WRITING_TASK_TYPE.QUESTION_ANALYSIS, queueName: 'question_analysis_dead_letter',
      attempts: nextRetryCount, payload: taskPayload, errorMessage: analysisError.message,
    });
    recordQuestionAnalysisMetric('dead_lettered', { writingId, attempts: nextRetryCount, durationMs: Date.now() - startedAt });
  } else {
    const nextRunAt = Date.now() + computeRetryDelay(nextRetryCount);
    await markWritingTaskRetryPending({
      writingId, taskType: WRITING_TASK_TYPE.QUESTION_ANALYSIS, queueName: 'question_analysis_retry',
      attempts: nextRetryCount, payload: taskPayload, errorMessage: analysisError.message, nextRunAt,
    });
    recordQuestionAnalysisMetric('retry_scheduled', { writingId, attempts: nextRetryCount, durationMs: Date.now() - startedAt });
  }
  recordQuestionAnalysisMetric('failed', { writingId, retryCount: nextRetryCount, durationMs: Date.now() - startedAt });
  logError('question_analysis_retry_job_failed', { writingId, message: analysisError.message });
}

export async function runQuestionAnalysisRetryJob(task) {
  const questionAnalysisWorker = getQuestionAnalysisWorker();
  if (typeof questionAnalysisWorker !== 'function') {
    throw new Error('题目分析 worker 尚未配置');
  }

  const writingId = task?.writingId;
  const row = await db.prepare('SELECT * FROM writings WHERE id = ?').get(writingId);
  if (!row) return;

  const existingFeedback = safeJsonParse(row.feedback, {}) || {};
  const existingMeta = buildAnalysisMeta(existingFeedback, row.selected_type, existingFeedback?.analysisMeta || {});
  const nextRetryCount = Math.max(1, Number(task?.attempts || 0) || 1);
  const now = Date.now();
  const startedAt = Date.now();

  const runningFeedback = _buildRunningFeedback(existingFeedback, existingMeta, nextRetryCount, now, row);
  await db.prepare('UPDATE writings SET feedback = ? WHERE id = ?').run(serializeFeedback(runningFeedback), writingId);

  const { questionRow, assignmentRow } = await _loadRelatedRows(row);

  let heartbeatTimer = null;
  try {
    recordQuestionAnalysisMetric('started', { writingId, retryCount: nextRetryCount });
    heartbeatTimer = _startHeartbeat(task, writingId);

    const questionAnalysis = await _callWorker(questionAnalysisWorker, row, questionRow, assignmentRow, existingFeedback);

    // Re-read the row so we merge into the latest feedback — grading may have
    // run concurrently during the AI call and written scores/tier/weaknesses.
    // Using stale runningFeedback here would overwrite those concurrent writes.
    const { postAIRow, postAIFeedback } = await _loadPostAIFeedback(writingId, runningFeedback);
    await _persistSuccess({ writingId, postAIRow, postAIFeedback, questionAnalysis, runningFeedback, existingMeta, now, nextRetryCount, startedAt, row });
  } catch (analysisError) {
    // Re-read the row so we merge into the latest feedback — grading may have
    // run concurrently during the AI call and written scores/tier/weaknesses.
    const { postAIRow, postAIFeedback } = await _loadPostAIFeedback(writingId, runningFeedback);
    await _persistFailure({ writingId, analysisError, existingFeedback, postAIRow, postAIFeedback, runningFeedback, existingMeta, row, nextRetryCount, now, startedAt });
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  }
}
