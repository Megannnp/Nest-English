import { hasSupplementalSampleEssay } from './status.js';
import db from '../../db/database.js';
import {
  buildAuthoritativeGradingPatch,
  finalizeFeedback,
  mergeFeedback,
  safeJsonParse,
  serializeFeedback,
} from '../../utils/writingFeedback.js';

export async function loadWritingById(writingId) {
  return db.prepare('SELECT * FROM writings WHERE id = ?').get(writingId);
}

export async function persistSupplementalFeedback({
  row,
  fullFeedback,
  aiAnalysis,
}) {
  const existingFeedback = safeJsonParse(row?.feedback, {}) || {};
  const patch = buildAuthoritativeGradingPatch(fullFeedback, {
    selectedType: row?.selected_type,
    aiAnalysis: aiAnalysis || existingFeedback.aiAnalysis || null,
  });
  const mergedFeedback = mergeFeedback(existingFeedback, patch);
  const finalizedFeedback = finalizeFeedback(existingFeedback, mergedFeedback, patch, row?.selected_type);
  if (!hasSupplementalSampleEssay(finalizedFeedback)) {
    throw new Error('完整精批缺少范文内容');
  }
  finalizedFeedback.analysisMeta = {
    ...(finalizedFeedback.analysisMeta || {}),
    queueState: 'idle',
    supplementalStatus: 'ready',
  };

  await db.prepare('UPDATE writings SET feedback = ? WHERE id = ?')
    .run(serializeFeedback(finalizedFeedback), row.id);
}

/**
 * Patches the feedback JSON on a writing row with a new supplementalStatus value
 * ('running' | 'ready' | 'failed') so the orchestrator can gate repeated requests.
 */
export async function persistSupplementalFeedbackStatus({ row, status }) {
  const existing = safeJsonParse(row?.feedback, null) || {};
  const updated = {
    ...existing,
    analysisMeta: {
      ...(existing.analysisMeta || {}),
      supplementalStatus: status,
    },
  };
  await db.prepare('UPDATE writings SET feedback = ? WHERE id = ?')
    .run(JSON.stringify(updated), row.id);
}

export async function saveTeacherCommentFeedback({ row, commentPayload }) {
  await db.prepare('UPDATE writings SET teacher_comment = ? WHERE id = ?')
    .run(JSON.stringify(commentPayload), row.id);

  return loadWritingById(row.id);
}
