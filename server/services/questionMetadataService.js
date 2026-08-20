import { extractContinuationStarters } from '../utils/continuationStarters.js';
import {
  buildPromptFingerprint,
  ensureThemeArray,
  ensureSingleTheme,
  inferCompositionSize,
  inferDefaultScore,
  normalizeQuestionTitleValue,
} from '../utils/questionMetadata.js';
import {
  normalizeStringArray,
  optionalTrimmedString,
} from '../utils/routeValidation.js';

export function safeJsonParse(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function normalizeThemes(themes) {
  return normalizeStringArray(themes, { maxItems: 10, itemMaxLength: 30 });
}

export function normalizeTheme(theme, fallbackThemes = []) {
  return optionalTrimmedString(ensureSingleTheme(theme, fallbackThemes), 50);
}

export function normalizeCompositionSize(value, fallbackType = '') {
  const normalized = optionalTrimmedString(value, 10);
  if (normalized === 'short' || normalized === 'long') return normalized;
  return inferCompositionSize(fallbackType);
}

export function normalizeDefaultScore(value, fallbackMeta = {}) {
  if (value === null || value === undefined || value === '') {
    return inferDefaultScore(fallbackMeta);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return inferDefaultScore(fallbackMeta);
  }
  return Math.round(parsed);
}

export function normalizeQuestionTitle(title, promptText = '') {
  const trimmedTitle = optionalTrimmedString(title, 200);
  if (trimmedTitle) return trimmedTitle.slice(0, 200);
  const prompt = optionalTrimmedString(promptText, 10000);
  return (prompt.slice(0, 40) + (prompt.length > 40 ? '…' : '')) || '未命名题目';
}

export function normalizeQuestionType(type) {
  return optionalTrimmedString(type, 32);
}

export function normalizePromptText(promptText) {
  return optionalTrimmedString(promptText, 10000);
}

function _toClientQuestionMeta(row) {
  return {
    sourceType: row.source_type || 'user',
    sourceYear: row.source_year || '',
    sourceRegion: row.source_region || '',
    sourcePaper: row.source_paper || '',
    sourceLabel: row.source_label || '',
    normalizedTitle: row.normalized_title || '',
    promptFingerprint: row.prompt_fingerprint || '',
    classificationMode: row.classification_mode || '',
    typeConfidence: row.type_confidence || '',
    themeConfidence: row.theme_confidence || '',
    isSystem: (row.source_type || 'user') === 'system',
  };
}

export function toClientQuestion(row) {
  const meta = _toClientQuestionMeta(row);
  const promptText = row.prompt_text || row.content || '';
  const type = row.type || row.question_type || '';
  return {
    id: row.id,
    title: row.title,
    type,
    themes: safeJsonParse(row.themes, row.theme ? [row.theme] : []),
    theme: row.theme || '',
    compositionSize: row.composition_size || inferCompositionSize(type),
    defaultScore: row.default_score ?? row.score ?? null,
    promptText,
    moduleId: row.module_id || '',
    systemId: row.system_id || '',
    questionType: row.question_type || '',
    createdAt: row.created_at,
    ...meta,
    needsReview: Boolean(row.needs_review),
    isDisabled: Boolean(row.is_disabled),
    continuationStarters: safeJsonParse(row.continuation_starters, null),
  };
}

export function buildQuestionInsertMeta({
  title,
  promptText,
  type,
  themes,
  theme,
  compositionSize,
  defaultScore,
  sourceYear,
  sourceRegion,
  sourcePaper,
  sourceLabel,
  classificationMode,
  typeConfidence,
  themeConfidence,
  needsReview,
}) {
  const normalizedPromptText = normalizePromptText(promptText);
  const normalizedType = normalizeQuestionType(type);
  const themeValue = normalizeTheme(theme, themes);
  const themesArray = ensureThemeArray(themeValue, normalizeThemes(themes));
  const compositionSizeValue = normalizeCompositionSize(compositionSize, normalizedType);
  const defaultScoreValue = normalizeDefaultScore(defaultScore, {
    sourceRegion,
    sourcePaper,
    type: normalizedType,
  });
  const displayTitle = normalizeQuestionTitle(title, normalizedPromptText);

  let continuationStarters = null;
  if (normalizedType === 'continuation') {
    const starters = extractContinuationStarters(normalizedPromptText);
    if (starters.length === 2) {
      continuationStarters = JSON.stringify({ para1: starters[0], para2: starters[1] });
    }
  }

  return {
    title: displayTitle,
    type: normalizedType,
    themes: themesArray,
    theme: themeValue,
    compositionSize: compositionSizeValue,
    defaultScore: defaultScoreValue,
    promptText: normalizedPromptText,
    normalizedTitle: normalizeQuestionTitleValue(displayTitle),
    promptFingerprint: buildPromptFingerprint(normalizedPromptText),
    classificationMode: optionalTrimmedString(classificationMode, 20) || 'runtime_mode',
    typeConfidence: optionalTrimmedString(typeConfidence, 20) || 'medium',
    themeConfidence: optionalTrimmedString(themeConfidence, 20) || 'medium',
    needsReview: needsReview ? 1 : 0,
    sourceYear: optionalTrimmedString(sourceYear, 16) || '',
    sourceRegion: optionalTrimmedString(sourceRegion, 64) || '',
    sourcePaper: optionalTrimmedString(sourcePaper, 64) || '',
    sourceLabel: optionalTrimmedString(sourceLabel, 128) || '',
    continuationStarters,
  };
}
