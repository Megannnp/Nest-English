import './testSetup.js';
import jwt from 'jsonwebtoken';
import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';

import { createApp } from '../app.js';
import { resetGuestAIBudgetForTests } from '../middleware/aiGuestBudget.js';
import { stubAuthUserLookup } from './helpers/stubAuthUserLookup.js';

function createToken(overrides = {}) {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign({
    id: 'user-test',
    role: 'student',
    name: '测试用户',
    realName: '测试用户',
    ...overrides,
  }, secret);
}

let canBindLocalPortPromise = null;

function canBindLocalPort() {
  canBindLocalPortPromise ??= new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(0, '127.0.0.1', () => {
      probe.close(() => resolve(true));
    });
  });
  return canBindLocalPortPromise;
}

async function withServer(t, run) {
  if (!await canBindLocalPort()) {
    t.skip('当前沙箱环境不允许监听本地端口，接口测试在本机可正常执行');
    return;
  }
  stubAuthUserLookup(t);
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
}

test('GET /api/health only exposes minimal health payload', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.code, 200);
    assert.equal(body.msg, 'ok');
    assert.equal(typeof body.timestamp, 'number');
    assert.equal(typeof body.ready, 'boolean');
    assert.equal('database' in body, false);
    assert.equal('ai' in body, false);
    assert.equal('questionAnalysisQueue' in body, false);
  });
});

test('POST /api/ai/complete rejects empty messages before hitting provider', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ai/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken()}`,
      },
      body: JSON.stringify({ messages: [] }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.match(body.msg, /messages 数组不能为空/);
  });
});

test('POST /api/ai/analyze-tags rejects fully empty input', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ai/analyze-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: '', content: '', requirements: '' }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, 400);
    assert.match(body.msg, /标题或内容不能都为空/);
  });
});

test('POST /api/ai/recognize-text rejects invalid OCR type before provider call', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ai/recognize-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'invalid_type',
        image: { base64: 'abc', mediaType: 'image/png' },
      }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, 400);
    assert.match(body.msg, /识别类型无效/);
  });
});

test('POST /api/ai/analyze-tags allows guest requests', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ai/analyze-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: '', content: '', requirements: '' }),
    });
    assert.notEqual(response.status, 401);
  });
});

test('POST /api/ai/recognize-text allows guest requests', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ai/recognize-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'invalid_type',
        image: { base64: 'abc', mediaType: 'image/png' },
      }),
    });
    assert.notEqual(response.status, 401);
  });
});

test('POST /api/grammar/analyze does not consume guest budget for authenticated users', async (t) => {
  process.env.GUEST_AI_GRAMMAR_ANALYZE_MAX = '1';
  resetGuestAIBudgetForTests();

  await withServer(t, async (baseUrl) => {
    const headers = {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.77',
      Authorization: `Bearer ${createToken()}`,
    };
    const body = JSON.stringify({
      sentence: 'The scientists who discovered the new element were awarded the Nobel Prize.',
    });

    const first = await fetch(`${baseUrl}/api/grammar/analyze`, {
      method: 'POST',
      headers,
      body,
    });
    const second = await fetch(`${baseUrl}/api/grammar/analyze`, {
      method: 'POST',
      headers,
      body,
    });

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
  });

  delete process.env.GUEST_AI_GRAMMAR_ANALYZE_MAX;
  resetGuestAIBudgetForTests();
});
