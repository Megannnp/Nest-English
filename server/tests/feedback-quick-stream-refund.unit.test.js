import './testSetup.js';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mock, test } from 'node:test';

const state = {
  consumed: 0,
  refunded: [],
  asserted: [],
  recorded: [],
  streamingResult: { cancelled: true },
};

mock.module('../middleware/authMiddleware.js', {
  namedExports: {
    requireAuth: (req, _res, next) => {
      req.user = { id: 'user-1', role: 'student' };
      next();
    },
  },
});

mock.module('../routes/feedbackRoutes/access.js', {
  namedExports: {
    loadWritingForFeedbackAccess: async ({ writingId }) => ({
      row: { id: writingId, feedback: JSON.stringify({ totalScore: 18 }) },
      access: { isOwner: true },
    }),
  },
});

mock.module('../services/feedback/ai.js', {
  namedExports: {
    buildQuickFeedbackContext: () => ({
      aiAnalysis: {},
      systemPrompt: 'system',
      userContent: 'user',
    }),
  },
});

mock.module('../services/feedback/metrics.js', {
  namedExports: {
    summarizeInputMetrics: () => ({}),
  },
});

mock.module('../services/feedbackService.js', {
  namedExports: {
    requestDetailedFeedback: async () => ({}),
    requestQuickFeedback: async () => ({}),
    requestSupplementalFeedback: async () => ({}),
  },
});

mock.module('../services/pointsService.js', {
  namedExports: {
    consumeEntitlement: async () => {
      state.consumed += 1;
      return { consumed: true, consumedBuckets: [{ id: 'bucket-1', amount: 1 }] };
    },
    refundEntitlement: async (payload) => {
      state.refunded.push(payload);
    },
  },
});

mock.module('../services/adminControlService.js', {
  namedExports: {
    assertAIBudgetAvailable: async (payload) => {
      state.asserted.push(payload);
    },
    recordAIUsageEvent: async (payload) => {
      state.recorded.push(payload);
    },
  },
});

mock.module('../services/aiProviderService.js', {
  namedExports: {
    classifyAIError: (error) => ({ status: error.status || 500, code: error.errorCode || 'AI_ERROR' }),
    ensureAICircuitAvailable: async () => {},
  },
});

mock.module('../services/aiCompletionService.js', {
  namedExports: {
    executeStreamingCompletion: async () => state.streamingResult,
  },
});

mock.module('../services/sseResponseService.js', {
  namedExports: {
    initSSE: () => {},
    writeSSE: () => {},
    writeSSEError: () => {},
    endSSE: () => {},
  },
});

const { default: feedbackRouter } = await import('../routes/feedbackRoutes/generate.js');

function createReq() {
  const req = new EventEmitter();
  req.method = 'POST';
  req.url = '/writings/writing-1/feedback/quick-stream';
  req.params = {};
  req.body = {};
  req.requestId = 'req-1';
  return req;
}

function createRes() {
  return {
    headersSent: false,
    setHeader() {},
    flushHeaders() {},
    status() { return this; },
    json() { return this; },
    end() { this.headersSent = true; },
  };
}

test('quick feedback stream refunds writing review when client cancels', async () => {
  state.consumed = 0;
  state.refunded = [];
  state.asserted = [];
  state.recorded = [];
  state.streamingResult = { cancelled: true };

  await new Promise((resolve, reject) => {
    feedbackRouter.handle(createReq(), createRes(), (error) => error ? reject(error) : resolve());
    setImmediate(resolve);
  });

  assert.equal(state.consumed, 1);
  assert.equal(state.refunded.length, 1);
  assert.equal(state.refunded[0].userId, 'user-1');
  assert.equal(state.refunded[0].unit, 'writing_review');
  assert.equal(state.refunded[0].metadata.failedFeature, 'quick_feedback_stream_cancelled');
  assert.equal(state.asserted[0].feature, 'grading');
  assert.equal(state.recorded.length, 0);
});

test('quick feedback stream records admin budget usage after successful generation', async () => {
  state.consumed = 0;
  state.refunded = [];
  state.asserted = [];
  state.recorded = [];
  state.streamingResult = { content: 'ok' };

  await new Promise((resolve, reject) => {
    feedbackRouter.handle(createReq(), createRes(), (error) => error ? reject(error) : resolve());
    setImmediate(resolve);
  });

  assert.equal(state.consumed, 1);
  assert.equal(state.refunded.length, 0);
  assert.equal(state.asserted.length, 1);
  assert.equal(state.asserted[0].feature, 'grading');
  assert.equal(state.recorded.length, 1);
  assert.equal(state.recorded[0].feature, 'grading');
  assert.equal(state.recorded[0].source, 'req-1');
});
