import { buildPrompt } from '../../../client/src/writing/core/writingPrompts.js';
import { safeJsonParse } from '../../utils/writingFeedback.js';
import { callVolcengineAI } from '../aiProviderService.js';
import { normalizeWritingType, parseAIJsonPayload } from '../aiService.js';
import { buildIeltsKnowledgeContext } from '../ieltsKnowledgeService.js';
import { ensureValidAuthoritativeGradingFeedback } from './authoritativeValidation.js';
import {
  buildQuickFeedbackContext,
  QUICK_PROMPT_TEXT_LIMIT,
  QUICK_WRITING_TEXT_LIMIT,
} from './quickContext.js';
import { trimMiddle, withTimeout } from './timeout.js';

const SUPPLEMENTAL_FULL_FEEDBACK_TIMEOUT_MS = 55000;

// Mirror the same check used in quickContext.js — a non-null but empty image object
// (e.g. {}) must not count as an image submission.
function getSubmissionMode({ image }) {
  return (image?.ossUrl || (image?.base64 && image?.mediaType)) ? 'image' : 'text';
}

function _toObj(val) {
  return val && typeof val === 'object' ? val : {};
}

function _mergeWritingType(full, quick) {
  return full.writingType || quick.writingType || full.type || quick.type || 'general';
}

function _mergeArrayField(arr, fallback) {
  return Array.isArray(arr) && arr.length ? arr : fallback;
}

function mergeQuickAndFullFeedback(quickFeedback, fullFeedback) {
  const quickResult = _toObj(quickFeedback);
  const fullResult = _toObj(fullFeedback);
  const quickProblems = Array.isArray(quickResult.mainProblems) ? quickResult.mainProblems : [];
  const quickActions = Array.isArray(quickResult.nextActions) ? quickResult.nextActions : [];

  return {
    ...fullResult,
    totalScore: fullResult.totalScore ?? quickResult.totalScore ?? null,
    maxScore: fullResult.maxScore ?? quickResult.maxScore ?? null,
    type: fullResult.type || quickResult.type || 'general',
    writingType: _mergeWritingType(fullResult, quickResult),
    tier: fullResult.tier || quickResult.tier || '',
    summary: fullResult.summary || quickResult.summary || '',
    mainProblems: quickProblems,
    nextActions: quickActions,
    weaknesses: _mergeArrayField(fullResult.weaknesses, quickProblems),
    // Do NOT fall back to quickActions here — that would set improvements = nextActions,
    // causing the overview "改进建议" and the navigation suggestions to duplicate
    // the same quick-phase content. Leave it empty if the full feedback omits it.
    improvements: _mergeArrayField(fullResult.improvements, []),
  };
}

function _buildSupplementalContext(row, feedback) {
  const r = row || {};
  const aiAnalysis = feedback?.aiAnalysis || {};
  const writingType = normalizeWritingType(r.selected_type || aiAnalysis.type || 'general');
  const maxScore = Number(r.max_score || 15);
  const promptText = trimMiddle(r.prompt_text || '', QUICK_PROMPT_TEXT_LIMIT);
  const fullText = trimMiddle(r.full_text || r.text_snippet || '', QUICK_WRITING_TEXT_LIMIT);
  const image = safeJsonParse(r.image_data, null);
  const writingTitle = r.writing_title || '';
  const rawPromptText = r.prompt_text || promptText;
  return { writingType, maxScore, promptText, fullText, image, writingTitle, rawPromptText };
}

export async function generateSupplementalFullFeedback({
  row,
  feedback,
  userContent,
  user = null,
  learningGoal = '',
}) {
  const ctx = _buildSupplementalContext(row, feedback);
  const submissionMode = getSubmissionMode({ image: ctx.image, fullText: ctx.fullText });
  const knowledgeContext = buildIeltsKnowledgeContext({
    user,
    writingType: ctx.writingType,
    writingTitle: ctx.writingTitle,
    promptText: ctx.rawPromptText,
    fullText: ctx.fullText,
    learningGoal,
  });
  const systemPrompt = buildPrompt(ctx.maxScore, ctx.writingType, {
    submissionMode,
    writingTitle: ctx.writingTitle,
    promptText: ctx.rawPromptText,
    knowledgeContext,
  });

  const content = await withTimeout(
    callVolcengineAI(
      process.env.AI_DEFAULT_MODEL,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      12288,
      0.15
    ),
    SUPPLEMENTAL_FULL_FEEDBACK_TIMEOUT_MS,
    `完整反馈生成超时（${Math.round(SUPPLEMENTAL_FULL_FEEDBACK_TIMEOUT_MS / 1000)}s）`
  );

  return parseAIJsonPayload(content);
}

export async function completeSupplementalFeedback({
  row,
  feedback,
  userContent,
  user = null,
  learningGoal = '',
}) {
  const { aiAnalysis, writingType: _writingType } = buildQuickFeedbackContext(row, feedback, () => ({ totalChars: 0, hasImage: false }), {
    user,
    learningGoal,
  });
  const fullParsed = await generateSupplementalFullFeedback({
    row,
    feedback,
    userContent,
    user,
    learningGoal,
  });
  let finalFeedbackPayload = mergeQuickAndFullFeedback(feedback || {}, fullParsed);

  // Validates and repairs all three essay fields (sampleEssay, correctedSampleEssay,
  // excellentSampleEssay) using structured starters from the DB when available.
  // ensureValidAuthoritativeGradingFeedback is a no-op for non-continuation types.
  finalFeedbackPayload = await ensureValidAuthoritativeGradingFeedback(finalFeedbackPayload, row);

  return {
    fullFeedback: finalFeedbackPayload,
    aiAnalysis,
  };
}
