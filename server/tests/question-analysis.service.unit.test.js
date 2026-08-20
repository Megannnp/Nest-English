import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { getQuestionAnalysisQueueStateFromTask } from '../services/questionAnalysisQueueService.js';
import {
  buildQuestionAnalysisPrompt,
  generateQuestionAnalysisResult,
  mergeQuestionAnalysis,
  sanitizeQuestionAnalysisResult,
  validateQuestionAnalysis,
} from '../services/questionAnalysisService.js';

test('question-analysis prompt includes type-specific contract hints', () => {
  const prompt = buildQuestionAnalysisPrompt('summary');
  assert.match(prompt, /summaryRules/);
  assert.match(prompt, /概要述评输出要求/);
});

test('question-analysis merge keeps nested continuation structures', () => {
  const merged = mergeQuestionAnalysis(
    {
      storyLine: { who: 'Tom', what: 'ran' },
      starters: { para1: { text: 'Hello' } },
    },
    {
      storyLine: { where: 'school' },
      starters: { para2: { text: 'World' } },
    }
  );

  assert.deepEqual(merged.storyLine, { who: 'Tom', what: 'ran', where: 'school' });
  assert.equal(merged.starters.para1.text, 'Hello');
  assert.equal(merged.starters.para2.text, 'World');
});

test('question-analysis validation reports missing continuation fields', () => {
  const validation = validateQuestionAnalysis('continuation', {
    storyLine: { who: 'Tom' },
    emotionLine: { initial: 'sad' },
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.missing.includes('storyLine.when'));
  assert.ok(validation.missing.includes('plotAnalysis.translation'));
});

test('question-analysis sanitize normalizes continuation payload shape', () => {
  const sanitized = sanitizeQuestionAnalysisResult('continuation', {
    themes: '友情',
    storyLine: { who: 'Tom', when: 2024, where: 'school', why: 'help', what: 'race', result: 'won' },
    emotionLine: { initial: 'nervous', changes: ['calm'], tone: 'warm' },
    starters: { para1: { text: 'A', constraints: ['x'] }, para2: { text: 'B' }, relationship: '顺承' },
    plotAnalysis: { originalText: 'abc', translation: '译文', keyLines: [{ sentenceIndex: 1 }] },
    contentAnalysis: {
      plotLogic: { accuracy: 'yes', score: '未知' },
      characterConsistency: { motivation: 'strong', score: '优' },
      themeAlignment: { comment: 'good', score: '良' },
    },
  }, { reason: 'fallback' });

  assert.equal(sanitized.sanitized, true);
  assert.equal(sanitized.data.storyLine.when, '2024');
  assert.equal(sanitized.data.contentAnalysis.plotLogic.score, '中');
  assert.deepEqual(sanitized.data.themes, []);
});

test('question-analysis generator can repair incomplete result into ready payload', async () => {
  const responses = [
    JSON.stringify({
      overview: '整体分析',
      themes: ['环保'],
      reason: '命中演讲稿关键词',
      scenarioAnalysis: { occasion: 'Earth Day' },
    }),
    JSON.stringify({
      type: 'speech',
      overview: '整体分析',
      themes: ['环保'],
      reason: '命中演讲稿关键词',
      scenarioAnalysis: { occasion: 'Earth Day' },
      taskAnalysis: { structureFocus: '三段式' },
      contentAnalysis: { coreMessage: 'protect the earth' },
      structure: { greeting: 'Hello', bodyPoints: ['point 1'], callToAction: 'Join us' },
      toneAnalysis: { appropriateness: '恰当' },
    }),
  ];

  const result = await generateQuestionAnalysisResult({
    type: 'speech',
    title: 'Earth Day Speech',
    promptText: 'Write a speech.',
    studentText: 'We should protect the environment.',
    aiAnalysis: { type: 'speech', themes: ['环保'], reason: 'heuristic' },
  }, {
    callAI: async () => responses.shift(),
    parsePayload: JSON.parse,
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.type, 'speech');
  assert.equal(result.structure.greeting, 'Hello');
  assert.equal(result.meta.schema.valid, true);
});

test('question-analysis queue state follows latest task status', () => {
  assert.equal(getQuestionAnalysisQueueStateFromTask({ status: 'pending' }), 'queued');
  assert.equal(getQuestionAnalysisQueueStateFromTask({ status: 'running' }), 'running');
  assert.equal(getQuestionAnalysisQueueStateFromTask({ status: 'dead_letter' }), 'dead_letter');
  assert.equal(getQuestionAnalysisQueueStateFromTask({ status: 'success' }), 'idle');
});
