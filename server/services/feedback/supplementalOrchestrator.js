import { ConflictError } from '../../utils/appError.js';
import { safeJsonParse } from '../../utils/writingFeedback.js';
import { assertAIBudgetAvailable } from '../adminControlService.js';
import { markWritingTaskQueued } from '../writingTaskService.js';
import { buildFeedbackStatusResponse } from './dto.js';
import { recordFeedbackGenerationOutcome } from './metrics.js';
import { getSupplementalFeedbackTaskStatus, WRITING_TASK_TYPE } from './query.js';
import { loadWritingById, persistSupplementalFeedbackStatus } from './repository.js';
import { getQuickFeedbackStatus, getSupplementalFeedbackStatus } from './status.js';

export async function requestSupplementalFeedback({ row, force = false, user = null }) {
  const feedback = safeJsonParse(row?.feedback, null);
  if (!feedback) {
    throw new ConflictError('当前作文还没有可用基础反馈，暂时无法补齐完整精批');
  }

  if (getQuickFeedbackStatus(feedback) !== 'ready') {
    throw new ConflictError('请先等待基础反馈完成，再补齐完整精批');
  }

  const supplementalStatus = getSupplementalFeedbackStatus(feedback);
  const supplementalTaskStatus = await getSupplementalFeedbackTaskStatus(row);
  if (supplementalStatus === 'running' || supplementalTaskStatus === 'pending' || supplementalTaskStatus === 'running') {
    return buildFeedbackStatusResponse(row);
  }
  if (supplementalStatus === 'ready' && !force) {
    return buildFeedbackStatusResponse(row);
  }

  await assertAIBudgetAvailable({ feature: WRITING_TASK_TYPE.SUPPLEMENTAL_FEEDBACK, user });

  await persistSupplementalFeedbackStatus({ row, status: 'running' });

  try {
    await markWritingTaskQueued({
      writingId: row.id,
      taskType: WRITING_TASK_TYPE.SUPPLEMENTAL_FEEDBACK,
      queueName: 'feedback_queue',
      payload: {
        force,
        source: row.source || 'self',
      },
    });
  } catch (queueError) {
    // Roll back the 'running' marker so future requests are not permanently blocked.
    await persistSupplementalFeedbackStatus({ row, status: 'not_started' }).catch(() => {});
    throw queueError;
  }
  recordFeedbackGenerationOutcome('supplemental', 'queued', {
    writingId: row.id,
    force,
    inputChars: String(row.full_text || '').length,
  });

  const latest = await loadWritingById(row.id);
  return buildFeedbackStatusResponse(latest);
}
