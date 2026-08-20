import './testSetup.js';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mock, test } from 'node:test';

const state = {
  asserted: [],
  recorded: [],
  ocrCalls: 0,
  questionCalls: 0,
};

mock.module('../middleware/authMiddleware.js', {
  namedExports: {
    optionalAuth: (req, _res, next) => {
      req.user = req.headers.authorization ? { id: 'user-1', role: 'student' } : null;
      next();
    },
    requireAuth: (req, _res, next) => {
      req.user = { id: 'user-1', role: 'student' };
      next();
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
    recordAIFailure: async () => {},
    recordAISuccess: async () => {},
  },
});

mock.module('../services/aiOcrService.js', {
  namedExports: {
    recognizeTextFromImage: async () => {
      state.ocrCalls += 1;
      return { text: 'recognized text', detectedName: '' };
    },
  },
});

mock.module('../services/aiTagAnalysisService.js', {
  namedExports: {
    normalizeWritingType: (value) => value || 'general',
  },
});

mock.module('../services/questionAnalysisCacheService.js', {
  namedExports: {
    findReusableQuestionAnalysis: async () => null,
  },
});

mock.module('../services/questionAnalysisService.js', {
  namedExports: {
    generateQuestionAnalysisResult: async () => {
      state.questionCalls += 1;
      return { status: 'ready', type: 'general' };
    },
  },
});

const { default: ocrRouter } = await import('../routes/aiRoutes/ocr.js');
const { default: questionAnalysisRouter } = await import('../routes/aiRoutes/questionAnalysis.js');

function createReq({ url, body, authorization = 'Bearer token' }) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.url = url;
  req.headers = authorization ? { authorization } : {};
  req.ip = '203.0.113.60';
  req.socket = { remoteAddress: req.ip };
  req.body = body;
  req.requestId = 'req-ai-budget-1';
  return req;
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function handle(router, req) {
  const res = createRes();
  await new Promise((resolve, reject) => {
    router.handle(req, res, (error) => error ? reject(error) : resolve());
    setImmediate(resolve);
  });
  return res;
}

test.beforeEach(() => {
  state.asserted = [];
  state.recorded = [];
  state.ocrCalls = 0;
  state.questionCalls = 0;
});

test('OCR endpoint checks admin budget and records successful usage', async () => {
  const res = await handle(ocrRouter, createReq({
    url: '/recognize-text',
    body: {
      type: 'student_writing',
      image: { base64: 'abc', mediaType: 'image/png' },
    },
  }));

  assert.equal(res.statusCode, 200);
  assert.equal(state.ocrCalls, 1);
  assert.equal(state.asserted.length, 1);
  assert.equal(state.asserted[0].feature, 'recognize_text');
  assert.equal(state.recorded.length, 1);
  assert.equal(state.recorded[0].feature, 'recognize_text');
});

test('question-analysis endpoint checks admin budget and records generated usage', async () => {
  const res = await handle(questionAnalysisRouter, createReq({
    url: '/question-analysis',
    body: {
      type: 'general',
      title: 'Essay',
      promptText: 'Write about your school.',
      studentText: '',
    },
  }));

  assert.equal(res.statusCode, 200);
  assert.equal(state.questionCalls, 1);
  assert.equal(state.asserted.length, 1);
  assert.equal(state.asserted[0].feature, 'question_analysis');
  assert.equal(state.recorded.length, 1);
  assert.equal(state.recorded[0].feature, 'question_analysis');
});

