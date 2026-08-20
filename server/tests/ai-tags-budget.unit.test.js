import './testSetup.js';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mock, test } from 'node:test';

const state = {
  asserted: [],
  recorded: [],
  providerCalls: 0,
};

mock.module('../middleware/authMiddleware.js', {
  namedExports: {
    optionalAuth: (req, _res, next) => {
      req.user = req.headers.authorization ? { id: 'user-1', role: 'student' } : null;
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

mock.module('../services/aiTagAnalysisService.js', {
  namedExports: {
    analyzeTagsWithAI: async () => {
      state.providerCalls += 1;
      return { result: { type: 'general', tags: [] } };
    },
    buildHeuristicTagAnalysis: () => ({ type: 'general', tags: [] }),
  },
});

const { resetGuestAIBudgetForTests } = await import('../middleware/aiGuestBudget.js');
const { default: tagsRouter } = await import('../routes/aiRoutes/tags.js');

function createReq({ authorization = '' } = {}) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.url = '/analyze-tags';
  req.headers = authorization ? { authorization } : {};
  req.ip = '203.0.113.50';
  req.socket = { remoteAddress: req.ip };
  req.body = { title: '题目', content: 'This is a valid writing prompt content.', requirements: '' };
  req.requestId = 'req-tags-1';
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

async function handle(req) {
  const res = createRes();
  await new Promise((resolve, reject) => {
    tagsRouter.handle(req, res, (error) => error ? reject(error) : resolve());
    setImmediate(resolve);
  });
  return res;
}

test.beforeEach(() => {
  state.asserted = [];
  state.recorded = [];
  state.providerCalls = 0;
  resetGuestAIBudgetForTests();
  process.env.GUEST_AI_ANALYZE_TAGS_MAX = '1';
});

test.afterEach(() => {
  delete process.env.GUEST_AI_ANALYZE_TAGS_MAX;
});

test('analyze-tags consumes guest budget before calling the AI provider', async () => {
  const first = await handle(createReq());
  const second = await handle(createReq());

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 429);
  assert.equal(state.providerCalls, 1);
});

test('analyze-tags checks admin budget and records successful usage', async () => {
  const res = await handle(createReq({ authorization: 'Bearer token' }));

  assert.equal(res.statusCode, 200);
  assert.equal(state.asserted.length, 1);
  assert.equal(state.asserted[0].feature, 'analyze_tags');
  assert.equal(state.asserted[0].user.id, 'user-1');
  assert.equal(state.recorded.length, 1);
  assert.equal(state.recorded[0].feature, 'analyze_tags');
  assert.equal(state.recorded[0].source, 'req-tags-1');
});

