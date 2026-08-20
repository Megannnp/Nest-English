import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { sanitizeQuestionAnalysisPatch } from '../utils/writingFeedback.js';

test('feedback whitelist patch only keeps question-analysis related fields', () => {
  const patch = sanitizeQuestionAnalysisPatch({
    totalScore: 18,
    tier: 'A',
    summary: '不该允许',
    questionAnalysis: {
      type: 'speech',
      status: 'ready',
      overview: '演讲稿题目分析',
      structure: {
        greeting: 'Hello everyone',
        bodyPoints: ['环保', '行动'],
        callToAction: 'Join us',
      },
    },
    analysisMeta: {
      status: 'ready',
      queueState: 'idle',
      retryCount: 2,
      lastError: null,
    },
  });

  assert.equal('totalScore' in patch, false);
  assert.equal('tier' in patch, false);
  assert.equal('summary' in patch, false);
  assert.equal(patch.status, 'ready');
  assert.equal(patch.questionAnalysis.type, 'speech');
  assert.equal(patch.analysisMeta.queueState, 'idle');
});

test('feedback whitelist rejects unrelated payloads', () => {
  const patch = sanitizeQuestionAnalysisPatch({
    totalScore: 20,
    categories: [{ name: '内容', score: 5 }],
  });

  assert.equal(patch, null);
});
