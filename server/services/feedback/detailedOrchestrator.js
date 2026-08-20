import { ConflictError } from '../../utils/appError.js';
import { safeJsonParse } from '../../utils/writingFeedback.js';
import { normalizeWritingType } from '../aiService.js';
import {
  markWritingTaskFailed,
  markWritingTaskQueued,
  markWritingTaskRunning,
  markWritingTaskSuccess,
} from '../writingTaskService.js';
import { generateDetailedFeedbackResult } from './ai.js';
import { buildFeedbackResponse } from './dto.js';
import { recordFeedbackGenerationOutcome } from './metrics.js';
import { getDetailedFeedbackStatus, WRITING_TASK_TYPE } from './query.js';
import { loadWritingById } from './repository.js';

function _detailedErrorMessage(error) {
  return error.message || 'AI精批生成失败';
}

function _writingInputChars(row) {
  return String(row.full_text || '').length;
}

export async function requestDetailedFeedback({ row, requestedByUserId, onBeforeQueue = null }) {
  const feedback = safeJsonParse(row?.feedback, null);
  if (!feedback) {
    throw new ConflictError('当前作文还没有可用反馈，暂时无法生成详细反馈');
  }

  const currentStatus = await getDetailedFeedbackStatus(row);
  if (currentStatus === 'ready' || currentStatus === 'pending' || currentStatus === 'running') {
    return buildFeedbackResponse(row);
  }

  const payload = {
    requestedByUserId,
    source: row.source || 'self',
    writingType: normalizeWritingType(row.selected_type || feedback?.aiAnalysis?.type || 'general'),
  };
  const startedAt = Date.now();

  if (typeof onBeforeQueue === 'function') {
    await onBeforeQueue();
  }

  await markWritingTaskQueued({
    writingId: row.id,
    taskType: WRITING_TASK_TYPE.DETAILED_FEEDBACK,
    queueName: 'detailed_feedback',
    payload,
  });
  recordFeedbackGenerationOutcome('detailed', 'queued', {
    writingId: row.id,
    requestedByUserId,
  });

  await markWritingTaskRunning({
    writingId: row.id,
    taskType: WRITING_TASK_TYPE.DETAILED_FEEDBACK,
    queueName: 'detailed_feedback',
    attempts: 1,
    payload,
  });

  try {
    const detailedResult = await generateDetailedFeedbackResult(row);
    await markWritingTaskSuccess({
      writingId: row.id,
      taskType: WRITING_TASK_TYPE.DETAILED_FEEDBACK,
      queueName: 'detailed_feedback',
      attempts: 1,
      payload,
      result: detailedResult,
    });
    recordFeedbackGenerationOutcome('detailed', 'succeeded', {
      writingId: row.id,
      durationMs: Date.now() - startedAt,
      inputChars: _writingInputChars(row),
    });
  } catch (error) {
    await markWritingTaskFailed({
      writingId: row.id,
      taskType: WRITING_TASK_TYPE.DETAILED_FEEDBACK,
      queueName: 'detailed_feedback',
      attempts: 1,
      payload,
      errorMessage: _detailedErrorMessage(error),
    });
    recordFeedbackGenerationOutcome('detailed', 'failed', {
      writingId: row.id,
      durationMs: Date.now() - startedAt,
      errorMessage: _detailedErrorMessage(error),
      inputChars: _writingInputChars(row),
    });
    throw error;
  }

  const latest = await loadWritingById(row.id);
  return buildFeedbackResponse(latest);
}
