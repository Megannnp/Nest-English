import './testSetup.js';
import jwt from 'jsonwebtoken';
import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';

import { createApp } from '../app.js';
import { setDatabaseReadyForTests } from '../db/database.js';
import { stubAuthUserLookup } from './helpers/stubAuthUserLookup.js';

function createToken(overrides = {}) {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign({
    id: 'teacher-test',
    role: 'teacher',
    name: '测试教师',
    realName: '测试教师',
    ...overrides,
  }, secret);
}

const canBindLocalPort = await new Promise((resolve) => {
  const probe = net.createServer();
  probe.once('error', () => resolve(false));
  probe.listen(0, '127.0.0.1', () => {
    probe.close(() => resolve(true));
  });
});

async function withServer(t, run) {
  if (!canBindLocalPort) {
    t.skip('当前沙箱环境不允许监听本地端口，接口测试在本机可正常执行');
    return;
  }

  setDatabaseReadyForTests(true);
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

test('GET /api/health returns request id header', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('x-request-id'));
  });
});

test('GET /api/health/metrics requires teacher auth and returns observability metrics', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health/metrics`, {
      headers: {
        Authorization: `Bearer ${createToken()}`,
      },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.code, 200);
    assert.equal(body.msg, 'ok');
    assert.ok(body.metrics);
    assert.ok(body.metrics.ai);
    assert.ok(body.metrics.feedback);
    assert.ok(body.metrics.questionAnalysis);
    assert.equal(body.requester.role, 'teacher');
  });
});

test('GET /api/health/metrics rejects missing auth', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health/metrics`);
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.match(body.msg, /未提供认证令牌|认证/);
  });
});

test('GET /api/health/metrics rejects non-teacher auth', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health/metrics`, {
      headers: {
        Authorization: `Bearer ${createToken({ id: 'student-test', role: 'student' })}`,
      },
    });
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.msg, /教师|权限/);
  });
});

test('GET /api/health/details rejects non-teacher auth', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health/details`, {
      headers: {
        Authorization: `Bearer ${createToken({ id: 'student-test', role: 'student' })}`,
      },
    });
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.msg, /教师|权限/);
  });
});

test('POST /api/auth/register rejects malformed payload before hitting persistence', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bad-email',
        password: '123',
        confirmPassword: '456',
        realName: 'A',
      }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.msg, /邮箱格式不正确|姓名长度需在2到30个字符之间|请确认密码/);
    assert.ok(body.requestId);
  });
});

test('POST /api/tts requires auth before using paid sentence reading quota', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world.' }),
    });
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.match(body.msg, /未登录|登录/);
  });
});

test('POST /api/tts/admin/generate rejects non-admin users before TTS configuration', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/tts/admin/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken({ is_admin: 0 })}`,
      },
      body: JSON.stringify({ englishText: 'Hello world.' }),
    });
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.msg, /管理员权限/);
  });
});

test('POST /api/users/me/points/learning-events is disabled because server records learning events', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/users/me/points/learning-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken({ role: 'student', id: 'student-1' })}`,
      },
      body: JSON.stringify({ module: 'reading', eventType: 'complete' }),
    });
    assert.equal(response.status, 410);
    const body = await response.json();
    assert.match(body.msg, /停用/);
  });
});

test('POST /api/writings rejects invalid maxScore via schema validation', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/writings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken({ role: 'student', id: 'student-1' })}`,
      },
      body: JSON.stringify({
        fullText: 'hello',
        maxScore: 0,
      }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.msg, /maxScore 必须是正整数/);
  });
});

test('POST /api/assignments rejects invalid title via schema validation', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken()}`,
      },
      body: JSON.stringify({
        classId: 'class-1',
        title: '',
        promptText: 'Write something',
        maxScore: 15,
      }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.msg, /title 不能为空/);
  });
});
