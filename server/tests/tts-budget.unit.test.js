import './testSetup.js';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mock, test } from 'node:test';

const state = {
  asserted: [],
  recorded: [],
  consumed: [],
  synthesized: [],
};

mock.module('../middleware/authMiddleware.js', {
  namedExports: {
    requireAuth: (req, _res, next) => {
      req.user = { id: 'user-1', role: req.url.startsWith('/admin') ? 'admin' : 'student', is_admin: req.url.startsWith('/admin') ? 1 : 0 };
      next();
    },
    requireAdmin: (_req, _res, next) => next(),
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

mock.module('../services/pointsService.js', {
  namedExports: {
    consumeEntitlement: async (payload) => {
      state.consumed.push(payload);
      return { consumed: true, consumedBuckets: [{ id: 'bucket-1', amount: 1 }] };
    },
    refundEntitlement: async () => {},
  },
});

mock.module('../services/ttsPublicAudioRepository.js', {
  namedExports: {
    buildTtsPublicAudioUrl: (key) => `/api/tts/public/${key}`,
    isTtsPublicAudioReferenced: async () => false,
  },
});

mock.module('../services/ttsService.js', {
  namedExports: {
    getAudioFilePath: (key) => `/tmp/${key}.mp3`,
    getPublicAudioFilePath: (key) => `/tmp/${key}.mp3`,
    isTTSConfigured: () => true,
    publishPublicAudio: (key) => `public-${key}`.slice(0, 32).padEnd(32, '0'),
    synthesizeSpeech: async (text) => {
      state.synthesized.push(text);
      return `${state.synthesized.length}`.repeat(64).slice(0, 64);
    },
  },
});

const { default: ttsRouter } = await import('../routes/tts.js');

function createReq({ url, body }) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.url = url;
  req.originalUrl = `/api/tts${url}`;
  req.headers = {};
  req.body = body;
  req.requestId = 'req-tts-budget-1';
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
    sendFile() {
      return this;
    },
  };
}

async function handle(req) {
  const res = createRes();
  await new Promise((resolve, reject) => {
    ttsRouter.handle(req, res, (error) => error ? reject(error) : resolve());
    setImmediate(resolve);
  });
  return res;
}

test.beforeEach(() => {
  state.asserted = [];
  state.recorded = [];
  state.consumed = [];
  state.synthesized = [];
});

test('POST /tts checks admin budget and records user TTS usage', async () => {
  const res = await handle(createReq({
    url: '/',
    body: { text: 'Read this sentence.' },
  }));

  assert.equal(res.statusCode, 200);
  assert.equal(state.consumed.length, 1);
  assert.equal(state.asserted.length, 1);
  assert.equal(state.asserted[0].feature, 'tts');
  assert.equal(state.recorded.length, 1);
  assert.equal(state.recorded[0].feature, 'tts');
  assert.equal(state.recorded[0].source, 'req-tts-budget-1');
});

test('POST /tts/admin/generate records budget usage for each generated audio part', async () => {
  const res = await handle(createReq({
    url: '/admin/generate',
    body: { englishText: 'Hello', chineseText: '你好', ipaText: '' },
  }));

  assert.equal(res.statusCode, 200);
  assert.equal(state.synthesized.length, 2);
  assert.deepEqual(state.asserted.map((item) => item.feature), ['tts', 'tts']);
  assert.deepEqual(state.recorded.map((item) => item.feature), ['tts', 'tts']);
});
