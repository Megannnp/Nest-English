import { markWritingQueuedForQuestionAnalysis } from './questionAnalysisQueueMutationService.js';
import { getQuestionAnalysisQueueState } from './questionAnalysisQueueRuntime.js';
import db from '../db/database.js';
import { logInfo } from '../utils/logger.js';

/**
 * Dependency-injected factory for the question analysis recovery routine.
 * Accepts explicit collaborators so the logic can be unit-tested without a
 * real database or queue runtime.
 */
export function createQuestionAnalysisRecoveryService({
  database,
  getQueueState,
  markQueued,
  enqueueRetry,
  logger,
}) {
  return async function recoverStale({ staleBefore }) {
    const rows = database.prepare(`
      SELECT id, selected_type, feedback
      FROM writings
      WHERE feedback IS NOT NULL
        AND (
          (
            JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.analysisMeta.queueState')) IN ('queued', 'running')
            AND CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.analysisMeta.lastAttemptAt')), '0') AS UNSIGNED) > 0
            AND CAST(JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.analysisMeta.lastAttemptAt')) AS UNSIGNED) < ?
          )
          OR (
            JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.status')) = 'pending'
            AND CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.updatedAt')), '0') AS UNSIGNED) > 0
            AND CAST(JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.updatedAt')) AS UNSIGNED) < ?
          )
        )
      ORDER BY created_at DESC
      LIMIT 20
    `).all(staleBefore, staleBefore);

    let recovered = 0;
    for (const row of rows) {
      if (getQueueState(row.id) !== 'idle') continue;
      await markQueued(row, {
        incrementRetry: false,
        clearLastError: false,
        overview: '检测到题目分析任务中断，系统已自动重新加入后台队列。',
      });
      enqueueRetry(row.id);
      recovered++;
    }

    if (recovered > 0) {
      logger('question_analysis_recovery_completed', { recovered });
    }
  };
}

export async function recoverStaleQuestionAnalysisJobs({
  staleBefore,
  enqueueQuestionAnalysisRetryJob,
}) {
  const rows = await db.prepare(`
    SELECT id, selected_type, feedback
    FROM writings
    WHERE feedback IS NOT NULL
      AND (
        (
          JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.analysisMeta.queueState')) IN ('queued', 'running')
          AND CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.analysisMeta.lastAttemptAt')), '0') AS UNSIGNED) > 0
          AND CAST(JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.analysisMeta.lastAttemptAt')) AS UNSIGNED) < ?
        )
        OR (
          JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.status')) = 'pending'
          AND CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.updatedAt')), '0') AS UNSIGNED) > 0
          AND CAST(JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.updatedAt')) AS UNSIGNED) < ?
        )
      )
    ORDER BY created_at DESC
    LIMIT 20
  `).all(staleBefore, staleBefore);

  for (const row of rows) {
    if (getQuestionAnalysisQueueState(row.id) !== 'idle') continue;

    await markWritingQueuedForQuestionAnalysis(row, {
      incrementRetry: false,
      clearLastError: false,
      overview: '检测到题目分析任务中断，系统已自动重新加入后台队列。',
    });
    enqueueQuestionAnalysisRetryJob(row.id);
  }

  if (rows.length > 0) {
    logInfo('question_analysis_recovery_completed', { recovered: rows.length });
  }
}
