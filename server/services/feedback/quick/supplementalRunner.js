import { logError } from '../../../utils/logger.js';
import { safeJsonParse } from '../../../utils/writingFeedback.js';
import { buildQuickFeedbackContext, completeSupplementalFeedback } from '../ai.js';
import { summarizeInputMetrics } from '../metrics.js';
import {
  loadWritingById,
  persistSupplementalFeedback,
  persistSupplementalFeedbackStatus,
} from '../repository.js';
// Note: persistSupplementalFeedback already sets supplementalStatus:'ready' atomically,
// so we only need persistSupplementalFeedbackStatus for the failure path.

export async function runSupplementalFullFeedbackGeneration({ writingId }) {
  const row = await loadWritingById(writingId);
  if (!row) return;

  const feedback = safeJsonParse(row.feedback, null);
  const { userContent } = buildQuickFeedbackContext(row, feedback, summarizeInputMetrics);

  try {
    const { fullFeedback, aiAnalysis } = await completeSupplementalFeedback({
      row,
      feedback,
      userContent,
    });

    // Re-read the row so we merge into the latest feedback — grading or
    // question analysis may have run concurrently during the AI call and
    // written scores/tier/weaknesses that would be lost if we merge into
    // the pre-call snapshot.
    const freshRow = await loadWritingById(writingId);

    // persistSupplementalFeedback atomically merges the new content and sets
    // analysisMeta.supplementalStatus = 'ready' in the same DB write.
    await persistSupplementalFeedback({
      row: freshRow || row,
      fullFeedback,
      aiAnalysis,
    });
  } catch (error) {
    logError('supplemental_full_feedback_failed', {
      writingId,
      message: error?.message || '完整反馈补充失败',
    });
    // Write the failed status so the orchestrator stops gating and the UI
    // can surface the failure instead of showing a permanent 'running' state.
    try {
      const freshRow = await loadWritingById(writingId);
      await persistSupplementalFeedbackStatus({ row: freshRow || row, status: 'failed' });
    } catch {
      // Best-effort — if this also fails the next request will time out naturally.
    }
    throw error;
  }
}
