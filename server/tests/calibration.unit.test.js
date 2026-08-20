import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { calibrateQuickScoreForContinuation } from '../services/feedback/quick/calibration.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

// extractContinuationStarters requires English sentences with ≥3-char words
// ending in punctuation. Two lines separated by \n (not \n\n) work well.
const VALID_PROMPT =
  'She noticed the old man struggling with his bag.\n' +
  'He smiled and thanked her warmly for her help.';

/** Two-paragraph full text with ~N words (one blank line between paragraphs). */
function twoParaText(wordCount = 130) {
  const half = Math.ceil(wordCount / 2);
  return `${'Word '.repeat(half).trim()}\n\n${'Word '.repeat(wordCount - half).trim()}`;
}

function makeRow({
  type = 'continuation',
  maxScore = 25,
  wordCount = null,
  fullText = null,
  promptText = VALID_PROMPT,
} = {}) {
  const defaultText = fullText ?? twoParaText(wordCount ?? 130);
  return {
    selected_type: type,
    max_score: maxScore,
    full_text: defaultText,
    word_count: wordCount ?? defaultText.split(/\s+/).filter(Boolean).length,
    prompt_text: promptText,
  };
}

function makeQuickResult({
  score = 12,
  maxScore = 25,
  summary = '',
  mainProblems = [],
  weaknesses = [],
  highlights = [],
  writingType = 'continuation',
  tier = '',
} = {}) {
  return { totalScore: score, maxScore, writingType, summary, mainProblems, weaknesses, highlights, tier };
}

// ─── skip conditions ───────────────────────────────────────────────────────────

test('calibrateQuickScoreForContinuation: skips non-continuation types', () => {
  // writingType must also be non-continuation so resolveContinuationWritingType sees 'letter'
  const row = makeRow({ type: 'letter' });
  const qr = makeQuickResult({ score: 10, writingType: 'letter' });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.equal(result.totalScore, 10, 'score should be unchanged for non-continuation type');
});

test('calibrateQuickScoreForContinuation: skips upward calibration when score already >= 14', () => {
  const row = makeRow({ fullText: twoParaText(130) });
  const qr = makeQuickResult({ score: 14 });
  const result = calibrateQuickScoreForContinuation(row, qr);
  // No red flags → no downward cap either
  assert.equal(result.totalScore, 14);
});

test('calibrateQuickScoreForContinuation: skips upward calibration when word count < 110', () => {
  const row = makeRow({ fullText: twoParaText(100), wordCount: 100 });
  const qr = makeQuickResult({ score: 10 });
  // Upward skipped (too short); downward doesn't fire (score < 14)
  assert.equal(calibrateQuickScoreForContinuation(row, qr), qr);
});

test('calibrateQuickScoreForContinuation: skips upward calibration when only one paragraph', () => {
  const row = makeRow({ fullText: 'Word '.repeat(130).trim() }); // no blank line
  const qr = makeQuickResult({ score: 10 });
  assert.equal(calibrateQuickScoreForContinuation(row, qr), qr);
});

test('calibrateQuickScoreForContinuation: skips upward calibration when looks off-topic', () => {
  const row = makeRow();
  const qr = makeQuickResult({ score: 10, summary: '内容偏题，与原文关联度不足。' });
  assert.equal(calibrateQuickScoreForContinuation(row, qr), qr);
});

// ─── upward calibration ────────────────────────────────────────────────────────

test('calibrateQuickScoreForContinuation: raises score 11 to minimum 第五档 floor (14)', () => {
  const row = makeRow();
  const qr = makeQuickResult({ score: 11, summary: '整体较完整。' });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.ok(result.totalScore >= 14, `expected >= 14, got ${result.totalScore}`);
});

test('calibrateQuickScoreForContinuation: raises score 10 to absolute floor (14)', () => {
  // score 10 < 11 → canRaiseToBaseFifthBand is false → floor falls through to 14
  const row = makeRow();
  const qr = makeQuickResult({ score: 10, summary: '整体较弱。' });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.equal(result.totalScore, 14);
});

test('calibrateQuickScoreForContinuation: raises to 15 with positive signal + score >= 12 + words >= 120', () => {
  const row = makeRow({ fullText: twoParaText(125), wordCount: 125 });
  const qr = makeQuickResult({
    score: 12,
    summary: '情感表达流畅，结构清楚。',
    highlights: ['语言流畅'],
  });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.ok(result.totalScore >= 15, `expected >= 15, got ${result.totalScore}`);
});

test('calibrateQuickScoreForContinuation: raises to 16 when word count >= 135 + strong signal', () => {
  const row = makeRow({ fullText: twoParaText(140), wordCount: 140 });
  const qr = makeQuickResult({
    score: 12,
    summary: '情感表达流畅，结构完整。',
    highlights: ['表达自然'],
  });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.ok(result.totalScore >= 15, `expected >= 15, got ${result.totalScore}`);
});

test('calibrateQuickScoreForContinuation: does not raise to upper floor when structurally weak', () => {
  const row = makeRow();
  const qr = makeQuickResult({ score: 12, summary: '结构混乱，层次不清，衔接较差。', highlights: ['流畅'] });
  const result = calibrateQuickScoreForContinuation(row, qr);
  // looksStructurallyWeak → canRaiseToUpperFifthBand false, falls to base floor
  assert.ok(result.totalScore <= 15, `expected <= 15, got ${result.totalScore}`);
});

test('calibrateQuickScoreForContinuation: does not raise to upper floor without positive signal', () => {
  const row = makeRow();
  const qr = makeQuickResult({ score: 12, summary: '表达平淡，内容单一。', highlights: [] });
  const result = calibrateQuickScoreForContinuation(row, qr);
  // No positive signal → canRaiseToUpperFifthBand false
  assert.ok(result.totalScore <= 15, `expected <= 15, got ${result.totalScore}`);
});

test('calibrateQuickScoreForContinuation: raised result includes tier label', () => {
  const row = makeRow();
  const qr = makeQuickResult({ score: 11, summary: '整体完整。' });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.ok(typeof result.tier === 'string' && result.tier.length > 0, `tier should be set, got '${result.tier}'`);
  assert.ok(result.tier.includes('第五档'), `expected 第五档 in tier, got '${result.tier}'`);
});

// ─── downward calibration ──────────────────────────────────────────────────────

test('calibrateQuickScoreForContinuation: caps off-topic essay from 17 to <= 13', () => {
  const row = makeRow({ fullText: twoParaText(150), wordCount: 150 });
  const qr = makeQuickResult({ score: 17, summary: '内容脱节，严重脱离原文。' });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.ok(result.totalScore <= 13, `expected <= 13, got ${result.totalScore}`);
});

test('calibrateQuickScoreForContinuation: caps single-paragraph essay scoring 20 to <= 17', () => {
  const singleParaText = 'Word '.repeat(150).trim(); // no blank line → 1 paragraph
  const row = makeRow({ fullText: singleParaText, wordCount: 150 });
  const qr = makeQuickResult({ score: 20 });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.ok(result.totalScore <= 17, `expected <= 17, got ${result.totalScore}`);
});

test('calibrateQuickScoreForContinuation: caps structurally weak essay at 16 when score is 20', () => {
  const row = makeRow({ fullText: twoParaText(150), wordCount: 150 });
  const qr = makeQuickResult({ score: 20, weaknesses: ['结构混乱，衔接很差，逻辑混乱'] });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.ok(result.totalScore <= 16, `expected <= 16, got ${result.totalScore}`);
});

test('calibrateQuickScoreForContinuation: caps very short (< 80 words) essay with no signal from 17 to 14', () => {
  // ~70 words, two paragraphs; no positive signal in summary
  const shortText = `${'Word '.repeat(35).trim()}\n\n${'Word '.repeat(35).trim()}`;
  const row = makeRow({ fullText: shortText, wordCount: 70 });
  const qr = makeQuickResult({ score: 17, summary: '内容简单，表达平淡，缺乏层次。', highlights: [] });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.ok(result.totalScore <= 14, `expected <= 14, got ${result.totalScore}`);
});

test('calibrateQuickScoreForContinuation: does not cap when no quality red flags at 16', () => {
  const row = makeRow({ fullText: twoParaText(150), wordCount: 150 });
  const qr = makeQuickResult({ score: 16, summary: '整体表现较好。', highlights: ['语言流畅'] });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.equal(result.totalScore, 16, 'no downward cap should apply for a clean 16-point essay');
});

test('calibrateQuickScoreForContinuation: downward-capped result includes updated tier label', () => {
  const row = makeRow({ fullText: twoParaText(150), wordCount: 150 });
  const qr = makeQuickResult({ score: 20, summary: '内容脱节，严重脱离原文。', tier: '第六档' });
  const result = calibrateQuickScoreForContinuation(row, qr);
  assert.ok(result.totalScore <= 13);
  assert.ok(typeof result.tier === 'string' && result.tier.length > 0, 'tier should be updated after cap');
  assert.ok(!result.tier.includes('第六档'), 'original inflated tier should be overwritten');
});
