import './testSetup.js';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mock, test } from 'node:test';

const state = {
  asserted: [],
  recorded: [],
  completed: 0,
};

mock.module('../middleware/authMiddleware.js', {
  namedExports: {
    requireAuth: (req, _res, next) => {
      req.user = { id: 'user-1', role: 'student' };
      next();
    },
  },
});

mock.module('../services/aiCompletionService.js', {
  namedExports: {
    executeCompletion: async () => {
      state.completed += 1;
      return { content: 'ok' };
    },
    executeStreamingCompletion: async () => ({ content: 'stream ok' }),
    validateCompletionMessages: (messages) => (
      Array.isArray(messages) && messages.length
        ? { valid: true }
        : { valid: false, msg: 'messages 数组不能为空' }
    ),
    validateCompletionUserContent: () => ({ valid: true }),
  },
});

mock.module('../services/aiProviderService.js', {
  namedExports: {
    classifyAIError: (error) => ({ status: error.status || 500, code: error.errorCode || 'AI_ERROR' }),
    ensureAICircuitAvailable: async () => {},
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

const { default: completeRouter } = await import('../routes/aiRoutes/complete.js');

function createReq({ url, body }) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.url = url;
  req.body = body;
  req.requestId = 'req-1';
  return req;
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    ended: false,
    headersSent: false,
    setHeader() {},
    flushHeaders() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      this.headersSent = true;
      this.ended = true;
      return this;
    },
    write() {
      this.headersSent = true;
    },
    end() {
      this.headersSent = true;
      this.ended = true;
    },
  };
}

async function handle(url, body) {
  const req = createReq({ url, body });
  const res = createRes();
  await new Promise((resolve, reject) => {
    completeRouter.handle(req, res, (error) => error ? reject(error) : resolve());
    setImmediate(resolve);
  });
  return res;
}

test('POST /complete checks budget and records successful usage', async () => {
  state.asserted = [];
  state.recorded = [];
  state.completed = 0;

  const res = await handle('/complete', {
    messages: [{ role: 'user', content: 'hello' }],
  });

  assert.equal(res.statusCode, 200);
  assert.equal(state.completed, 1);
  assert.equal(state.asserted.length, 1);
  assert.equal(state.asserted[0].feature, 'complete');
  assert.equal(state.asserted[0].user.id, 'user-1');
  assert.equal(state.recorded.length, 1);
  assert.equal(state.recorded[0].feature, 'complete');
  assert.equal(state.recorded[0].source, 'req-1');
});

