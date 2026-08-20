import db from '../db/database.js';
import { buildPromptFingerprint } from '../utils/questionMetadata.js';
import { safeJsonParse } from '../utils/writingFeedback.js';

function isReusableQuestionAnalysis(feedback) {
  const status = String(
    feedback?.analysisMeta?.status ||
    feedback?.questionAnalysis?.status ||
    ''
  ).trim().toLowerCase();

  return status === 'ready' && Boolean(feedback?.questionAnalysis?.overview);
}

function buildReusablePayload(feedback, source = 'writing_cache') {
  return {
    ...feedback.questionAnalysis,
    meta: feedback.questionAnalysis?.meta || feedback.analysisMeta?.timings || null,
    reused: true,
    reuseSource: source,
  };
}

async function findReusableByQuestionId(questionId) {
  if (!questionId) return null;
  const rows = await db.prepare(`
    SELECT feedback
    FROM writings
    WHERE question_id = ?
      AND feedback IS NOT NULL
      AND JSON_EXTRACT(feedback, '$.questionAnalysis') IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 8
  `).all(questionId);

  for (const row of rows) {
    const feedback = safeJsonParse(row.feedback, null);
    if (isReusableQuestionAnalysis(feedback)) {
      return buildReusablePayload(feedback, 'question_id');
    }
  }
  return null;
}

async function findReusableByPromptFingerprint(promptText = '', type = '') {
  const fingerprint = buildPromptFingerprint(promptText);
  if (!fingerprint) return null;

  const rows = await db.prepare(`
    SELECT w.feedback
    FROM writings w
    LEFT JOIN questions q ON q.id = w.question_id
    WHERE w.feedback IS NOT NULL
      AND JSON_EXTRACT(w.feedback, '$.questionAnalysis') IS NOT NULL
      AND (
        (q.prompt_fingerprint IS NOT NULL AND q.prompt_fingerprint <> '' AND q.prompt_fingerprint = ?)
        OR w.prompt_text = ?
      )
      AND (w.selected_type = ? OR ? = '' OR w.selected_type IS NULL OR w.selected_type = '')
    ORDER BY w.created_at DESC
    LIMIT 12
  `).all(fingerprint, String(promptText || ''), String(type || ''), String(type || ''));

  for (const row of rows) {
    const feedback = safeJsonParse(row.feedback, null);
    if (isReusableQuestionAnalysis(feedback)) {
      return buildReusablePayload(feedback, 'prompt_fingerprint');
    }
  }
  return null;
}

export async function findReusableQuestionAnalysis({ questionId, promptText, type }) {
  const reusableByQuestionId = await findReusableByQuestionId(questionId);
  if (reusableByQuestionId) return reusableByQuestionId;

  if (!promptText) return null;
  return findReusableByPromptFingerprint(promptText, type);
}
