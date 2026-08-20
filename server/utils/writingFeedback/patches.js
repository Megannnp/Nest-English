import {
  FEEDBACK_STATUS,
  isPlainObject,
  normalizeFeedbackStatus,
  normalizeWritingType,
  validateAndNormalizeFeedbackSchema,
} from '../feedbackSchema.js';

function _buildAnalysisMetaPatch(meta) {
  return {
    status: meta.status || null,
    degraded: Boolean(meta.degraded),
    errorCode: meta.errorCode || null,
    timings: meta.timings || null,
    retryCount: meta.retryCount || 0,
    lastAttemptAt: meta.lastAttemptAt || null,
    lastSuccessAt: meta.lastSuccessAt || null,
    lastFailureAt: meta.lastFailureAt || null,
    lastError: meta.lastError || null,
    queueState: meta.queueState || 'idle',
  };
}

export function sanitizeQuestionAnalysisPatch(feedback) {
  if (!isPlainObject(feedback)) return null;

  const { normalized } = validateAndNormalizeFeedbackSchema(feedback);
  const patch = {};

  if (normalized.questionAnalysis) {
    patch.questionAnalysis = normalized.questionAnalysis;
  }

  if (normalized.analysisMeta) {
    patch.analysisMeta = _buildAnalysisMetaPatch(normalized.analysisMeta);
  }

  const nextStatus = normalizeFeedbackStatus(
    normalized.questionAnalysis?.status || normalized.analysisMeta?.status || normalized.status
  );
  if (nextStatus) {
    patch.status = nextStatus;
  }

  return Object.keys(patch).length ? patch : null;
}

export function buildAuthoritativeGradingPatch(rawFeedback, options = {}) {
  if (!isPlainObject(rawFeedback)) {
    throw new Error('AI 批改结果格式不正确');
  }

  const {
    analysisMeta: _analysisMeta,
    questionAnalysis: _questionAnalysis,
    status: _status,
    updatedAt: _updatedAt,
    errorCode: _errorCode,
    degraded: _degraded,
    ...rest
  } = rawFeedback;

  const normalizedType = normalizeWritingType(options.selectedType || rawFeedback.writingType || rawFeedback.type);
  const patch = {
    ...rest,
    type: normalizedType || '',
    writingType: normalizedType || '',
    status: FEEDBACK_STATUS.READY,
  };

  if (isPlainObject(options.aiAnalysis)) {
    patch.aiAnalysis = options.aiAnalysis;
  }

  if (Array.isArray(rawFeedback.mainProblems) && !Array.isArray(rawFeedback.weaknesses)) {
    patch.weaknesses = rawFeedback.mainProblems.slice(0, 3);
  }

  // Do NOT copy nextActions → improvements here.
  // buildAuthoritativeGradingPatch is called for both quick and supplemental feedback.
  // During the quick phase the AI does not return improvements, so this fallback would
  // store improvements = nextActions[:3] in the DB. The client then reads improvements
  // as non-empty, flips hasDetailed=true, and the quick diagnostic card never shows.
  // The supplemental pass (buildPrompt) always returns a real improvements array, which
  // overwrites the DB value via mergeFeedback. Leaving improvements absent in quick
  // feedback is the correct behaviour — the UI falls back to nextActions directly.

  return patch;
}
