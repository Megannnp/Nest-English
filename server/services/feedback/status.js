import { safeJsonParse } from '../../utils/writingFeedback.js';

function mapQuickTaskStatus(taskStatus) {
  const normalizedTaskStatus = String(taskStatus || '').toLowerCase();
  if (normalizedTaskStatus === 'success') return 'ready';
  if (normalizedTaskStatus === 'pending' || normalizedTaskStatus === 'running') return 'running';
  if (normalizedTaskStatus === 'failed' || normalizedTaskStatus === 'dead_letter') return 'failed';
  return 'not_started';
}

function _hasMainDeepReview(dr) {
  return Boolean(
    (Array.isArray(dr?.grammar) && dr.grammar.length) ||
    (Array.isArray(dr?.contentLogic) && dr.contentLogic.length) ||
    (Array.isArray(dr?.structure) && dr.structure.length)
  );
}

function _hasLegacyDeepReview(dr) {
  const lang = dr?.language || {};
  const content = dr?.content || {};
  const struct = dr?.structure || {};
  return Boolean(
    (Array.isArray(lang.grammarIssues) && lang.grammarIssues.length) ||
    (Array.isArray(content.contentLogic) && content.contentLogic.length) ||
    (Array.isArray(struct.structure) && struct.structure.length) ||
    String(lang.annotatedText || '').trim()
  );
}

function _hasDeepReviewContent(deepReview) {
  return _hasMainDeepReview(deepReview) || _hasLegacyDeepReview(deepReview);
}

export function hasDetailedFeedback(feedback) {
  if (!feedback || typeof feedback !== 'object') return false;
  // Only fields that are exclusively produced by the supplemental pass count here.
  // phraseSuggestions and sentencePatterns are also returned by quick feedback on
  // some essay types, so including them would make the legacy 'ready' fallback fire
  // incorrectly and block users from requesting the full supplemental pass.
  const deepReview = feedback?.aiEvaluation?.deepReview || {};
  return Boolean(
    _hasDeepReviewContent(deepReview) ||
    hasSupplementalSampleEssay(feedback) ||
    feedback?.annotatedText
  );
}

function _hasEssayText(...paths) {
  return paths.some((p) => String(p?.text || '').trim());
}

export function hasSupplementalSampleEssay(feedback) {
  if (!feedback || typeof feedback !== 'object') return false;
  const ev = feedback?.aiEvaluation;
  return _hasEssayText(
    feedback?.correctedSampleEssay,
    feedback?.excellentSampleEssay,
    feedback?.sampleEssay,
    ev?.correctedSampleEssay,
    ev?.excellentSampleEssay,
    ev?.sampleEssay
  );
}

export function hasCompleteSupplementalFeedback(feedback) {
  return hasDetailedFeedback(feedback) && hasSupplementalSampleEssay(feedback);
}

function hasNumericScore(value) {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}

function _hasFeedbackArrayContent(fb, ...keys) {
  return keys.some((k) => Array.isArray(fb?.[k]) && fb[k].length > 0);
}

export function hasUsableQuickFeedback(feedback) {
  if (!feedback || typeof feedback !== 'object') return false;
  return Boolean(
    String(feedback?.summary || '').trim() ||
    hasNumericScore(feedback?.totalScore) ||
    _hasFeedbackArrayContent(feedback, 'categories', 'weaknesses', 'improvements', 'grammarIssues')
  );
}

export function getQuickFeedbackStatus(feedback) {
  if (!feedback) return 'not_started';
  const normalized = String(feedback?.status || '').trim().toLowerCase();
  if (normalized === 'failed') return 'failed';
  if (normalized === 'pending') return 'running';
  if (!hasUsableQuickFeedback(feedback)) return 'failed';
  return 'ready';
}

export function getTeacherCommentStatus(teacherComment) {
  return teacherComment ? 'ready' : 'empty';
}

/**
 * Derives the supplemental-feedback status from the feedback payload.
 * Status values: 'not_started' | 'running' | 'ready' | 'failed'
 */
export function getSupplementalFeedbackStatus(feedback) {
  if (!feedback) return 'not_started';
  const supplementalStatus = String(feedback?.analysisMeta?.supplementalStatus || '').trim().toLowerCase();
  if (supplementalStatus === 'running') return 'running';
  if (supplementalStatus === 'ready') {
    return hasCompleteSupplementalFeedback(feedback) ? 'ready' : 'failed';
  }
  if (supplementalStatus === 'failed') return 'failed';
  // Legacy: if detailed content is already present treat as ready
  if (hasCompleteSupplementalFeedback(feedback)) return 'ready';
  return 'not_started';
}

function _normalizeDetailedTaskStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'success' || s === 'ready') return 'ready';
  if (s === 'pending') return 'pending';
  if (s === 'running') return 'running';
  if (s === 'failed' || s === 'dead_letter') return 'failed';
  return 'not_requested';
}

function _normalizeSupplementalFromRow(fromRow) {
  const s = String(fromRow || '').trim().toLowerCase();
  if (s === 'running') return 'running';
  if (s === 'ready') return 'ready';
  if (s === 'failed') return 'failed';
  return 'not_started';
}

export function buildFeedbackStatusSnapshot(row, options = {}) {
  const {
    detailedTaskStatus = null,
    quickTaskStatus = null,
    // supplementalStatus: raw SQL-extracted value used when row.feedback is not
    // available (list view). The full feedback JSON parse takes precedence when present.
    supplementalStatus: supplementalStatusFromRow = null,
    feedbackOverride = undefined,
  } = options;
  const parsedFeedback = safeJsonParse(row?.feedback, null);
  const feedback = feedbackOverride !== undefined ? feedbackOverride : parsedFeedback;
  const teacherComment = safeJsonParse(row?.teacher_comment, null);
  const quickTaskStatusMapped = mapQuickTaskStatus(quickTaskStatus);
  const quickFeedbackStatus = feedback
    ? getQuickFeedbackStatus(feedback)
    : (quickTaskStatusMapped === 'ready' ? 'failed' : quickTaskStatusMapped);
  // Prefer the full feedback-JSON parse (detail view). Fall back to the
  // SQL-extracted scalar value passed by the list-view mapper.
  const supplementalFeedbackStatus = parsedFeedback
    ? getSupplementalFeedbackStatus(parsedFeedback)
    : _normalizeSupplementalFromRow(supplementalStatusFromRow);

  return {
    quickFeedbackStatus,
    teacherCommentStatus: getTeacherCommentStatus(teacherComment),
    detailedFeedbackStatus: _normalizeDetailedTaskStatus(detailedTaskStatus),
    supplementalFeedbackStatus,
  };
}

export { mapQuickTaskStatus };
