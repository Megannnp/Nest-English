import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const state = {
  latestTask: null,
  quickQueued: 0,
  detailedQueued: 0,
  detailedStatus: 'not_started',
};

mock.module('../services/writingTaskService.js', {
  namedExports: {
    WRITING_TASK_TYPE: {
      GRADING: 'grading',
      DETAILED_FEEDBACK: 'detailed_feedback',
      SUPPLEMENTAL_FEEDBACK: 'supplemental_feedback',
    },
    getLatestWritingTaskByType: async () => state.latestTask,
    markWritingTaskFailed: async () => ({}),
    markWritingTaskQueued: async ({ taskType }) => {
      if (taskType === 'grading') state.quickQueued += 1;
      if (taskType === 'detailed_feedback') state.detailedQueued += 1;
      return {};
    },
    markWritingTaskRunning: async () => ({}),
    markWritingTaskSuccess: async () => ({}),
  },
});

mock.module('../services/aiService.js', {
  namedExports: {
    normalizeWritingType: (value) => value || 'general',
  },
});

mock.module('../services/feedback/dto.js', {
  namedExports: {
    buildFeedbackResponse: (row) => ({ writingId: row.id, detailed: true }),
    buildFeedbackStatusResponse: (row) => ({ writingId: row.id, quick: true }),
  },
});

mock.module('../services/feedback/query.js', {
  namedExports: {
    WRITING_TASK_TYPE: {
      GRADING: 'grading',
      DETAILED_FEEDBACK: 'detailed_feedback',
      SUPPLEMENTAL_FEEDBACK: 'supplemental_feedback',
    },
    getDetailedFeedbackStatus: async () => state.detailedStatus,
  },
});

mock.module('../services/feedback/repository.js', {
  namedExports: {
    loadWritingById: async (id) => ({ id, feedback: JSON.stringify({ totalScore: 18, summary: 'ok' }) }),
  },
});

mock.module('../services/feedback/quick/generation.js', {
  namedExports: {
    runQuickFeedbackGeneration: async () => ({}),
  },
});

mock.module('../services/feedback/ai.js', {
  namedExports: {
    generateDetailedFeedbackResult: async () => ({ status: 'ready' }),
  },
});

mock.module('../services/feedback/metrics.js', {
  namedExports: {
    recordFeedbackGenerationOutcome: () => {},
    recordQuickFeedbackOutcome: () => {},
  },
});

const { requestQuickFeedback } = await import('../services/feedback/quick/request.js');
const { requestDetailedFeedback } = await import('../services/feedback/detailedOrchestrator.js');

function resetState() {
  state.latestTask = null;
  state.quickQueued = 0;
  state.detailedQueued = 0;
  state.detailedStatus = 'not_started';
}

test('requestQuickFeedback does not charge when quick feedback is already ready', async () => {
  resetState();
  let charged = 0;

  await requestQuickFeedback({
    row: { id: 'writing-ready', feedback: JSON.stringify({ totalScore: 18, summary: '已生成' }) },
    user: { id: 'student-1' },
    onBeforeQueue: async () => { charged += 1; },
  });

  assert.equal(charged, 0);
  assert.equal(state.quickQueued, 0);
});

test('requestQuickFeedback charges only when a new quick feedback task is queued', async () => {
  resetState();
  let charged = 0;

  await requestQuickFeedback({
    row: { id: 'writing-new', feedback: null, selected_type: 'general' },
    user: { id: 'student-1' },
    onBeforeQueue: async () => { charged += 1; },
  });

  assert.equal(charged, 1);
  assert.equal(state.quickQueued, 1);
});

test('requestDetailedFeedback does not charge when detailed feedback is already running', async () => {
  resetState();
  state.detailedStatus = 'running';
  let charged = 0;

  await requestDetailedFeedback({
    row: { id: 'writing-detailed-running', feedback: JSON.stringify({ totalScore: 18, summary: 'ok' }) },
    requestedByUserId: 'student-1',
    onBeforeQueue: async () => { charged += 1; },
  });

  assert.equal(charged, 0);
  assert.equal(state.detailedQueued, 0);
});

test('requestDetailedFeedback charges only when detailed feedback generation starts', async () => {
  resetState();
  state.detailedStatus = 'not_started';
  let charged = 0;

  await requestDetailedFeedback({
    row: { id: 'writing-detailed-new', feedback: JSON.stringify({ totalScore: 18, summary: 'ok' }) },
    requestedByUserId: 'student-1',
    onBeforeQueue: async () => { charged += 1; },
  });

  assert.equal(charged, 1);
  assert.equal(state.detailedQueued, 1);
});
