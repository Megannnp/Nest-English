import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const redisState = { counts: new Map() };

const fakeRedis = {
  async eval(_script, { keys }) {
    const key = keys[0];
    const next = (redisState.counts.get(key) || 0) + 1;
    redisState.counts.set(key, next);
    return next;
  },
  async ttl() {
    return 60;
  },
};

mock.module('../services/redisClient.js', {
  namedExports: {
    getSharedRedisClient: async () => fakeRedis,
  },
});

const { consumeGuestAIBudget } = await import('../middleware/aiGuestBudget.js');

function makeRequest(ip = '203.0.113.70') {
  return {
    ip,
    socket: { remoteAddress: ip },
    headers: {},
  };
}

test.beforeEach(() => {
  redisState.counts.clear();
  process.env.GUEST_AI_ANALYZE_TAGS_MAX = '2';
});

test.afterEach(() => {
  delete process.env.GUEST_AI_ANALYZE_TAGS_MAX;
});

test('redis guest AI budget allows exactly the configured limit', async () => {
  const req = makeRequest();

  const first = await consumeGuestAIBudget(req, 'analyze_tags');
  const second = await consumeGuestAIBudget(req, 'analyze_tags');
  const third = await consumeGuestAIBudget(req, 'analyze_tags');

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.limit, 2);
});
