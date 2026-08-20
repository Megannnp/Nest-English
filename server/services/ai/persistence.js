import db from '../../db/database.js';
import { optionalTrimmedString } from '../../utils/routeValidation.js';
import {
  buildAuthoritativeGradingPatch,
  finalizeFeedback,
  mergeFeedback,
  safeJsonParse,
  serializeFeedback,
} from '../../utils/writingFeedback.js';
import { markAssignmentTaskGraded } from '../assignmentService.js';
import {
  assertWritingAccess,
  loadWritingOrThrow,
} from '../writingService.js';
import {
  markWritingTaskFailed,
  markWritingTaskRunning,
  markWritingTaskSuccess,
  WRITING_TASK_TYPE,
} from '../writingTaskService.js';
import { parseAIJsonPayload } from './json.js';

export function resolvePersistedWritingText(parsed, row) {
  const extractedText = optionalTrimmedString(parsed?.extractedText, 20000);
  const existingFullText = optionalTrimmedString(row?.full_text, 20000);
  const existingSnippet = optionalTrimmedString(row?.text_snippet, 500);
  const fullText = extractedText || existingFullText || existingSnippet || '';
  const textSnippet = extractedText
    ? extractedText.slice(0, 500)
    : (existingSnippet || fullText.slice(0, 500));
  const wordCount = extractedText
    ? extractedText.split(/\s+/).filter(Boolean).length
    : Number(row?.word_count || 0);

  return {
    textSnippet,
    fullText,
    wordCount,
  };
}

export async function persistAuthoritativeGradingResult({
  user,
  writingId,
  rawContent,
  feedbackMeta,
}) {
  if (!writingId) return { persisted: false, reason: 'missing_writing_id' };

  const row = await loadWritingOrThrow(writingId, '目标写作记录不存在');
  await assertWritingAccess({
    user,
    row,
    allowOwner: true,
    allowTeacher: true,
    forbiddenMessage: '无权限写入该写作的 AI 结果',
  });

  await markWritingTaskRunning({
    writingId,
    taskType: WRITING_TASK_TYPE.GRADING,
    queueName: 'grading',
    attempts: 1,
    payload: {
      writingType: row.selected_type || 'general',
      hasFeedbackMeta: Boolean(feedbackMeta),
    },
  });

  try {
    const parsed = parseAIJsonPayload(rawContent);
    const existingFeedback = safeJsonParse(row.feedback, {}) || {};
    const patch = buildAuthoritativeGradingPatch(parsed, {
      selectedType: row.selected_type,
      aiAnalysis: feedbackMeta?.aiAnalysis || existingFeedback.aiAnalysis || null,
    });
    const mergedFeedback = mergeFeedback(existingFeedback, patch);
    const finalizedFeedback = finalizeFeedback(existingFeedback, mergedFeedback, patch, row.selected_type);
    const { textSnippet, fullText, wordCount } = resolvePersistedWritingText(parsed, row);

    await db.prepare(`
      UPDATE writings
      SET feedback = ?, text_snippet = ?, full_text = ?, word_count = ?
      WHERE id = ?
    `).run(
      serializeFeedback(finalizedFeedback),
      textSnippet,
      fullText,
      wordCount,
      writingId
    );

    await markWritingTaskSuccess({
      writingId,
      taskType: WRITING_TASK_TYPE.GRADING,
      queueName: 'grading',
      attempts: 1,
      payload: {
        writingType: row.selected_type || 'general',
      },
      result: {
        totalScore: finalizedFeedback.totalScore ?? null,
        tier: finalizedFeedback.tier ?? null,
      },
    });

    if (row.assignment_id && row.user_id) {
      await markAssignmentTaskGraded({
        assignmentId: row.assignment_id,
        studentId: row.user_id,
        writingId,
        latestScore: finalizedFeedback.totalScore ?? null,
      });
    }

    return { persisted: true, writingId };
  } catch (error) {
    await markWritingTaskFailed({
      writingId,
      taskType: WRITING_TASK_TYPE.GRADING,
      queueName: 'grading',
      attempts: 1,
      payload: {
        writingType: row.selected_type || 'general',
      },
      errorMessage: error.message,
    });
    throw error;
  }
}
