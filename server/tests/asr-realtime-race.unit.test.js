import './testSetup.js';
import jwt from 'jsonwebtoken';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mock, test } from 'node:test';

class FakeWebSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = FakeWebSocket.CONNECTING;
  }
  send() {}
  close() {}
}
FakeWebSocket.CONNECTING = 0;
FakeWebSocket.OPEN = 1;
FakeWebSocket.CLOSING = 2;
FakeWebSocket.CLOSED = 3;

mock.module('ws', {
  defaultExport: FakeWebSocket,
  namedExports: { WebSocketServer: class {} },
});

let resolveBudgetCheck;
let adminBudgetError = null;
mock.module('../middleware/aiGuestBudget.js', {
  namedExports: {
    consumeAIBudgetForIdentity: () => new Promise((resolve) => { resolveBudgetCheck = resolve; }),
  },
});

mock.module('../services/adminControlService.js', {
  namedExports: {
    assertAIBudgetAvailable: async () => {
      if (adminBudgetError) throw adminBudgetError;
    },
    recordAIUsageEvent: async () => {},
  },
});

const { handleAsrClient } = await import('../services/asrRealtimeService.js');

function makeAuthedRequest(userId) {
  process.env.JWT_SECRET ||= 'test-secret';
  const token = jwt.sign({ id: userId, role: 'student' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
  return { headers: { cookie: `nest_token=${token}` } };
}

function makeOpenClientSocket() {
  const clientWs = new FakeWebSocket();
  clientWs.readyState = FakeWebSocket.OPEN;
  const sent = [];
  clientWs.send = (payload) => sent.push(JSON.parse(payload));
  return { clientWs, sent };
}

test.beforeEach(() => {
  process.env.VOLCENGINE_ASR_APP_KEY = 'test-app-key';
  process.env.VOLCENGINE_ASR_ACCESS_KEY = 'test-access-key';
  resolveBudgetCheck = null;
  adminBudgetError = null;
});

test('a start frame sent while the budget check is in flight is not dropped', async () => {
  const req = makeAuthedRequest('user-race-1');
  const { clientWs, sent } = makeOpenClientSocket();

  const handlerPromise = handleAsrClient(clientWs, req);

  // Simulate the client sending its 'start' frame immediately on open —
  // before the (still-pending, mocked) budget check resolves.
  clientWs.emit('message', Buffer.from(JSON.stringify({ type: 'start', language: 'en-US' })), false);

  await Promise.resolve();
  assert.ok(resolveBudgetCheck, 'budget check should already be in flight');
  resolveBudgetCheck({ allowed: true, limit: 30, remaining: 29, retryAfterMs: 0 });
  await handlerPromise;

  // If the 'start' frame had been lost, a subsequent audio chunk would be
  // rejected as "语音识别尚未开始" instead of being forwarded upstream.
  clientWs.emit('message', Buffer.from([1, 2, 3]), true);

  assert.ok(
    !sent.some((msg) => msg.type === 'error' && msg.message?.includes('尚未开始')),
    `expected no "not started" error, got: ${JSON.stringify(sent)}`,
  );
  clientWs.emit('close');
});

test('a client disconnect while the budget check is in flight releases the reserved connection slot', async () => {
  process.env.ASR_MAX_ACTIVE_CONNECTIONS_PER_USER = '1';

  const req = makeAuthedRequest('user-race-2');
  const { clientWs } = makeOpenClientSocket();

  const handlerPromise = handleAsrClient(clientWs, req);

  clientWs.emit('close');
  await Promise.resolve();
  resolveBudgetCheck({ allowed: true, limit: 30, remaining: 29, retryAfterMs: 0 });
  await handlerPromise;

  // The slot should be free again — a fresh connection for the same user
  // must be accepted, not rejected as "too many connections".
  const { clientWs: secondClientWs, sent: secondSent } = makeOpenClientSocket();
  resolveBudgetCheck = null;
  const secondHandlerPromise = handleAsrClient(secondClientWs, makeAuthedRequest('user-race-2'));
  await Promise.resolve();
  resolveBudgetCheck({ allowed: true, limit: 30, remaining: 28, retryAfterMs: 0 });
  await secondHandlerPromise;

  assert.ok(
    !secondSent.some((msg) => msg.type === 'error' && msg.message?.includes('连接过多')),
    `expected the reservation to have been released, got: ${JSON.stringify(secondSent)}`,
  );
  secondClientWs.emit('close');

  delete process.env.ASR_MAX_ACTIVE_CONNECTIONS_PER_USER;
});

test('an ASR admin budget check failure closes the session instead of opening upstream', async () => {
  adminBudgetError = new Error('budget database unavailable');
  const { clientWs, sent } = makeOpenClientSocket();
  let closed = null;
  clientWs.close = (code, reason) => { closed = { code, reason }; };

  await handleAsrClient(clientWs, makeAuthedRequest('user-budget-fail'));

  assert.equal(resolveBudgetCheck, null);
  assert.equal(closed.code, 1011);
  assert.match(closed.reason, /budget check failed/i);
  assert.ok(
    sent.some((msg) => msg.type === 'error' && msg.message?.includes('预算检查失败')),
    `expected budget failure error, got: ${JSON.stringify(sent)}`,
  );
});
