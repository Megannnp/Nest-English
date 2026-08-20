import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSupplementalFeedbackResponse,
  isDetailedFeedbackReady,
} from '../services/feedback/dto.js';
import { persistSupplementalFeedback } from '../services/feedback/repository.js';
import {
  buildFeedbackStatusSnapshot,
  getQuickFeedbackStatus,
  getSupplementalFeedbackStatus,
} from '../services/feedback/status.js';

test('buildSupplementalFeedbackResponse prefers feedback JSON status over task fallback', () => {
  const response = buildSupplementalFeedbackResponse(
    { analysisMeta: { supplementalStatus: 'running' } },
    { status: 'failed', errorMessage: 'previous failure' }
  );

  assert.equal(response.status, 'running');
  assert.equal(response.errorMessage, 'previous failure');
});

test('getQuickFeedbackStatus does not mark empty feedback objects as ready', () => {
  assert.equal(getQuickFeedbackStatus({}), 'failed');
  assert.equal(getQuickFeedbackStatus({ status: 'ready' }), 'failed');
  assert.equal(getQuickFeedbackStatus({ totalScore: null }), 'failed');
  assert.equal(getQuickFeedbackStatus({ totalScore: '' }), 'failed');
  assert.equal(getQuickFeedbackStatus({ totalScore: 0 }), 'ready');
  assert.equal(getQuickFeedbackStatus({ totalScore: '0' }), 'ready');
  assert.equal(getQuickFeedbackStatus({ summary: '基础反馈已完成' }), 'ready');
});

test('feedback status snapshot does not treat empty quick feedback as ready', () => {
  const row = {
    id: 'writing-quick-empty',
    feedback: JSON.stringify({}),
    teacher_comment: null,
  };

  const status = buildFeedbackStatusSnapshot(row, {
    quickTaskStatus: 'success',
  });

  assert.equal(status.quickFeedbackStatus, 'failed');
});

test('buildSupplementalFeedbackResponse falls back to task status when feedback has no marker', () => {
  const response = buildSupplementalFeedbackResponse(
    { status: 'ready', summary: '基础反馈已完成' },
    { status: 'failed', errorMessage: '补齐失败' }
  );

  assert.equal(response.status, 'failed');
  assert.equal(response.errorMessage, '补齐失败');
});

test('getSupplementalFeedbackStatus does not treat empty deepReview shell as ready', () => {
  assert.equal(
    getSupplementalFeedbackStatus({
      summary: '基础反馈已完成',
      aiEvaluation: {
        deepReview: {
          language: { grammarIssues: [] },
          content: { contentLogic: [] },
          structure: { structure: [] },
        },
      },
    }),
    'not_started'
  );

  assert.equal(
    getSupplementalFeedbackStatus({
      aiEvaluation: {
        deepReview: {
          grammar: [{ title: '主谓一致', detail: 'He go 应改为 He goes。' }],
        },
      },
    }),
    'not_started'
  );

  assert.equal(
    getSupplementalFeedbackStatus({
      aiEvaluation: {
        deepReview: {
          grammar: [{ title: '主谓一致', detail: 'He go 应改为 He goes。' }],
        },
      },
      correctedSampleEssay: {
        text: 'He goes to school every day.',
      },
    }),
    'ready'
  );
});

test('getSupplementalFeedbackStatus rejects ready marker when sample essays are missing', () => {
  assert.equal(
    getSupplementalFeedbackStatus({
      analysisMeta: { supplementalStatus: 'ready' },
      aiEvaluation: {
        deepReview: {
          grammar: [{ title: '主谓一致', detail: 'He go 应改为 He goes。' }],
        },
      },
    }),
    'failed'
  );
});

test('persistSupplementalFeedback rejects full feedback without sample essays', async () => {
  await assert.rejects(
    persistSupplementalFeedback({
      row: {
        id: 'writing-1',
        selected_type: 'general',
        feedback: JSON.stringify({
          totalScore: 12,
          maxScore: 15,
          summary: '基础反馈已完成',
        }),
      },
      fullFeedback: {
        totalScore: 12,
        maxScore: 15,
        summary: '完整精批内容存在，但缺少范文。',
        aiEvaluation: {
          deepReview: {
            grammar: [{ title: '主谓一致', detail: 'He go 应改为 He goes。' }],
          },
        },
      },
      aiAnalysis: null,
    }),
    /完整精批缺少范文内容/
  );
});

test('isDetailedFeedbackReady treats supplemental ready as detailed-ready for status API compatibility', () => {
  assert.equal(isDetailedFeedbackReady('not_requested', {
    supplementalFeedbackStatus: 'ready',
  }), true);
  assert.equal(isDetailedFeedbackReady('ready', {
    supplementalFeedbackStatus: 'not_started',
  }), true);
  assert.equal(isDetailedFeedbackReady('not_requested', {
    supplementalFeedbackStatus: 'running',
  }), false);
});
