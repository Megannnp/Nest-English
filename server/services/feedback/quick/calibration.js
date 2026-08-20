import { extractContinuationStarters } from '../../../utils/continuationStarters.js';
import { normalizeWritingType } from '../../aiService.js';

const RUBRIC_BANDS = {
  15: [{ label: '第五档', min: 13, max: 15 }, { label: '第四档', min: 10, max: 12 }, { label: '第三档', min: 7, max: 9 }, { label: '第二档', min: 4, max: 6 }, { label: '第一档', min: 1, max: 3 }, { label: '0分', min: 0, max: 0 }],
  20: [{ label: '第五档', min: 17, max: 20 }, { label: '第四档', min: 13, max: 16 }, { label: '第三档', min: 9, max: 12 }, { label: '第二档', min: 5, max: 8 }, { label: '第一档', min: 1, max: 4 }, { label: '0分', min: 0, max: 0 }],
  25: [{ label: '第七档', min: 22, max: 25 }, { label: '第六档', min: 18, max: 21 }, { label: '第五档', min: 14, max: 17 }, { label: '第四档', min: 10, max: 13 }, { label: '第三档', min: 6, max: 9 }, { label: '第二档', min: 2, max: 5 }, { label: '第一档', min: 0, max: 1 }],
  100: [{ label: '优秀', min: 90, max: 100 }, { label: '良好', min: 80, max: 89 }, { label: '中等', min: 70, max: 79 }, { label: '及格', min: 60, max: 69 }, { label: '不及格', min: 0, max: 59 }],
};

function resolveRubricBaseMax(max) {
  if (RUBRIC_BANDS[max]) return max;
  if (max >= 60) return 100;
  if (max >= 21) return 25;
  if (max >= 17) return 20;
  return 15;
}

function scaleBandRange(band, targetMax, baseMax) {
  if (targetMax === baseMax) return { min: band.min, max: band.max };
  if (band.min === 0 && band.max === 0) return { min: 0, max: 0 };

  return {
    min: Math.max(0, Math.min(targetMax, Math.round((band.min / baseMax) * targetMax))),
    max: Math.max(0, Math.min(targetMax, Math.round((band.max / baseMax) * targetMax))),
  };
}

function splitParagraphs(text = '') {
  return String(text || '')
    .split(/\n\s*\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function countWords(text = '') {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function getTierLabel(maxScore, score) {
  const baseMax = resolveRubricBaseMax(maxScore);
  const bands = RUBRIC_BANDS[baseMax] || RUBRIC_BANDS[15];
  const matchedBand = bands.find((band) => {
    const range = scaleBandRange(band, maxScore, baseMax);
    return score >= range.min && score <= range.max;
  });
  if (!matchedBand) return '';
  const range = scaleBandRange(matchedBand, maxScore, baseMax);
  return `${matchedBand.label}（${range.min} - ${range.max}分）`;
}

function collectQuickResultIssueText(quickResult = {}) {
  return [
    quickResult?.summary || '',
    ...(Array.isArray(quickResult?.mainProblems) ? quickResult.mainProblems : []),
    ...(Array.isArray(quickResult?.weaknesses) ? quickResult.weaknesses : []),
  ].join(' ');
}

function looksOffTopicOrIncomplete(quickResult = {}) {
  return /偏题|脱节|未完成|未成文|照抄|无关|离题|严重脱离/i.test(
    collectQuickResultIssueText(quickResult)
  );
}

function looksStructurallyWeak(quickResult = {}) {
  return /结构混乱|层次混乱|逻辑混乱|衔接很差|衔接较差|情节断裂|内容单薄|内容空泛|语言问题严重到影响理解/i.test(
    collectQuickResultIssueText(quickResult)
  );
}

function resolveContinuationWritingType(row, quickResult) {
  return normalizeWritingType(
    quickResult?.writingType || quickResult?.type || row?.selected_type || 'general'
  );
}

function resolveContinuationTextContext(row) {
  const fullText = String(row?.full_text || row?.text_snippet || '').trim();
  return {
    fullText,
    paragraphs: splitParagraphs(fullText),
    wordCount: Number(row?.word_count || countWords(fullText)),
  };
}

function resolveContinuationCalibrationContext(row, quickResult) {
  const { fullText, paragraphs, wordCount } = resolveContinuationTextContext(row);
  return {
    writingType: resolveContinuationWritingType(row, quickResult),
    maxScore: Number(row?.max_score || quickResult?.maxScore || 25),
    currentScore: Number(quickResult?.totalScore),
    fullText,
    paragraphs,
    wordCount,
    starters: extractContinuationStarters(row?.prompt_text || ''),
  };
}

function shouldSkipUpwardCalibration(context, quickResult) {
  return (
    context.writingType !== 'continuation'
    || !Number.isFinite(context.currentScore)
    || context.currentScore >= 14
    || context.paragraphs.length < 2
    || context.wordCount < 110
    || context.starters.length < 2
    || looksOffTopicOrIncomplete(quickResult)
  );
}

/**
 * Downward ceiling guard: caps inflated continuation scores when the essay
 * exhibits clear structural or content red flags. Only fires for scores ≥ 14
 * (where the upward guard never touches) and returns a score ≤ currentScore.
 *
 * Rules are intentionally conservative — the cap only triggers when there is
 * an unambiguous disqualifying signal, not merely because signals are absent.
 */
function resolveContinuationCeilingScore(context, quickResult) {
  const { currentScore, wordCount, paragraphs } = context;

  // Off-topic or seriously incomplete essays cannot reach 第五档 (14+).
  if (looksOffTopicOrIncomplete(quickResult)) {
    return Math.min(currentScore, 13);
  }

  // A single-paragraph submission cannot reach 第六档 (18+) for 25-max
  // because 续写structurally requires two paragraphs.
  if (paragraphs.length < 2 && currentScore >= 18) {
    return 17;
  }

  // Severe structural weakness at high scores (18+): cap at 16 (第五档 top).
  if (looksStructurallyWeak(quickResult) && currentScore >= 18) {
    return Math.min(currentScore, 16);
  }

  // Very short essay (< 80 words) with no positive signal: cap at base 第五档 (14).
  if (wordCount < 80 && !hasAnyPositiveSignal(quickResult) && currentScore >= 16) {
    return 14;
  }

  return currentScore; // no downward adjustment needed
}

/**
 * Returns true when the AI feedback contains at least one affirmative signal,
 * preventing pure-negative essays from being lifted by word-count alone.
 */
function hasAnyPositiveSignal(quickResult = {}) {
  const text = collectQuickResultIssueText(quickResult);
  return (
    /亮点|做到了|表达自然|流畅|情感|衔接(?!很差|较差)/i.test(text)
    || (Array.isArray(quickResult?.highlights) && quickResult.highlights.length > 0)
  );
}

function canRaiseToUpperFifthBand(context, quickResult) {
  return !looksStructurallyWeak(quickResult)
    && hasAnyPositiveSignal(quickResult)  // must have positive evidence, not just absence of negatives
    && context.currentScore >= 12         // was 10 – only near-band-boundary scores are eligible
    && context.wordCount >= 120;
}

function canRaiseToBaseFifthBand(context) {
  return context.currentScore >= 11      // was 10
    && context.wordCount >= 120;
}

function resolveUpperFifthBandFloor(wordCount) {
  return wordCount >= 135 ? 16 : 15;    // was 17 : 16 – cap the maximum lift by one point
}

function resolveContinuationFloorScore(context, quickResult) {
  if (canRaiseToUpperFifthBand(context, quickResult)) {
    return resolveUpperFifthBandFloor(context.wordCount);
  }
  if (canRaiseToBaseFifthBand(context)) {
    return 15;
  }
  return 14;
}

function buildCalibratedContinuationResult(quickResult, context, floorScore) {
  return {
    ...quickResult,
    totalScore: floorScore,
    maxScore: context.maxScore,
    tier: getTierLabel(context.maxScore, floorScore) || quickResult?.tier || '',
  };
}

export function calibrateQuickScoreForContinuation(row, quickResult = {}) {
  const context = resolveContinuationCalibrationContext(row, quickResult);

  // ── Upward calibration ──────────────────────────────────────────────────
  // Lift structurally sound essays to the minimum 第五档 floor (14–16)
  // when the AI under-scored them despite adequate length and quality signals.
  if (!shouldSkipUpwardCalibration(context, quickResult)) {
    const floorScore = resolveContinuationFloorScore(context, quickResult);
    if (floorScore > context.currentScore) {
      return buildCalibratedContinuationResult(quickResult, context, floorScore);
    }
  }

  // ── Downward calibration ────────────────────────────────────────────────
  // Cap inflated scores when unambiguous quality red flags are present.
  // Only fires for scores ≥ 14 (the upward guard never touches those).
  if (context.writingType === 'continuation' && Number.isFinite(context.currentScore) && context.currentScore >= 14) {
    const ceilingScore = resolveContinuationCeilingScore(context, quickResult);
    if (ceilingScore < context.currentScore) {
      return buildCalibratedContinuationResult(quickResult, context, ceilingScore);
    }
  }

  return quickResult;
}
