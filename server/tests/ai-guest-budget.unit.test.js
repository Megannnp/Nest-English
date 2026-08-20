import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  consumeAIBudgetForIdentity,
  consumeGuestAIBudget,
  enforceGuestAIBudget,
  resetGuestAIBudgetForTests,
} from '../middleware/aiGuestBudget.js';

function makeRequest(ip = '203.0.113.10') {
  return {
    headers: { 'x-forwarded-for': ip },
    ip,
    socket: { remoteAddress: ip },
  };
}

test.beforeEach(() => {
  resetGuestAIBudgetForTests();
  delete process.env.GUEST_AI_ANALYZE_TAGS_MAX;
  delete process.env.GUEST_AI_ANALYZE_TAGS_WINDOW_MS;
  delete process.env.GUEST_AI_GRAMMAR_ANALYZE_MAX;
  delete process.env.GUEST_AI_GRAMMAR_ANALYZE_WINDOW_MS;
  delete process.env.GUEST_AI_GRAMMAR_QUIZ_MAX;
  delete process.env.GUEST_AI_GRAMMAR_QUIZ_WINDOW_MS;
  delete process.env.GUEST_AI_GRAMMAR_PRACTICE_MAX;
  delete process.env.GUEST_AI_GRAMMAR_PRACTICE_WINDOW_MS;
});

test('guest AI budget blocks anonymous use after scope limit', async () => {
  process.env.GUEST_AI_ANALYZE_TAGS_MAX = '2';
  process.env.GUEST_AI_ANALYZE_TAGS_WINDOW_MS = '1000';
  const req = makeRequest();

  assert.equal((await consumeGuestAIBudget(req, 'analyze_tags', 1000)).allowed, true);
  assert.equal((await consumeGuestAIBudget(req, 'analyze_tags', 1100)).allowed, true);

  const blocked = await consumeGuestAIBudget(req, 'analyze_tags', 1200);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.limit, 2);
  assert.equal(blocked.retryAfterMs, 800);
});

test('guest AI budget resets after the configured window', async () => {
  process.env.GUEST_AI_ANALYZE_TAGS_MAX = '1';
  process.env.GUEST_AI_ANALYZE_TAGS_WINDOW_MS = '500';
  const req = makeRequest('198.51.100.8');

  assert.equal((await consumeGuestAIBudget(req, 'analyze_tags', 1000)).allowed, true);
  assert.equal((await consumeGuestAIBudget(req, 'analyze_tags', 1200)).allowed, false);
  assert.equal((await consumeGuestAIBudget(req, 'analyze_tags', 1500)).allowed, true);
});

test('guest AI budget isolates different visitor identities', async () => {
  process.env.GUEST_AI_ANALYZE_TAGS_MAX = '1';
  const firstVisitor = makeRequest('203.0.113.20');
  const secondVisitor = makeRequest('203.0.113.21');

  assert.equal((await consumeGuestAIBudget(firstVisitor, 'analyze_tags', 1000)).allowed, true);
  assert.equal((await consumeGuestAIBudget(firstVisitor, 'analyze_tags', 1001)).allowed, false);
  assert.equal((await consumeGuestAIBudget(secondVisitor, 'analyze_tags', 1002)).allowed, true);
});

test('guest AI budget middleware bypasses authenticated users', async () => {
  process.env.GUEST_AI_ANALYZE_TAGS_MAX = '1';
  const middleware = enforceGuestAIBudget('analyze_tags');
  const req = {
    ...makeRequest('203.0.113.30'),
    user: { id: 'teacher-1', role: 'teacher' },
  };
  let nextCalled = false;

  await middleware(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('grammar analyzer has an explicit guest budget limit', async () => {
  const req = makeRequest('203.0.113.32');

  let lastBudget = null;
  for (let i = 0; i < 12; i += 1) {
    lastBudget = await consumeGuestAIBudget(req, 'grammar_analyze', 1000 + i);
    assert.equal(lastBudget.allowed, true);
  }

  const blocked = await consumeGuestAIBudget(req, 'grammar_analyze', 2000);
  assert.equal(lastBudget.limit, 12);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.limit, 12);
});

test('grammar practice defaults to one guest generation', async () => {
  const req = makeRequest('203.0.113.33');

  const first = await consumeGuestAIBudget(req, 'grammar_practice', 1000);
  const second = await consumeGuestAIBudget(req, 'grammar_practice', 1001);

  assert.equal(first.allowed, true);
  assert.equal(first.limit, 1);
  assert.equal(second.allowed, false);
  assert.equal(second.limit, 1);
});

test('grammar quiz has its own guest budget scope', async () => {
  const req = makeRequest('203.0.113.34');

  let lastBudget = null;
  for (let i = 0; i < 6; i += 1) {
    lastBudget = await consumeGuestAIBudget(req, 'grammar_quiz', 1000 + i);
    assert.equal(lastBudget.allowed, true);
  }

  const blocked = await consumeGuestAIBudget(req, 'grammar_quiz', 2000);
  const analyzeStillAvailable = await consumeGuestAIBudget(req, 'grammar_analyze', 2001);

  assert.equal(lastBudget.limit, 6);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.limit, 6);
  assert.equal(analyzeStillAvailable.allowed, true);
});

test('speaking ASR budget is keyed by identity rather than request IP', async () => {
  const first = await consumeAIBudgetForIdentity('user-42', 'speaking_asr', 1000);
  const second = await consumeAIBudgetForIdentity('user-43', 'speaking_asr', 1000);
  const third = await consumeAIBudgetForIdentity('user-42', 'speaking_asr', 1001);

  assert.equal(first.allowed, true);
  assert.equal(first.limit, 30);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, true);
  assert.equal(third.remaining, 28);
});

test('guest AI budget middleware returns 429 after anonymous budget is used', async () => {
  process.env.GUEST_AI_ANALYZE_TAGS_MAX = '1';
  const middleware = enforceGuestAIBudget('analyze_tags');
  const req = makeRequest('203.0.113.31');
  const headers = {};
  const res = {
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      headers[name] = value;
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

  await middleware(req, res, () => {});  // first — passes
  await middleware(req, res, () => {});  // second — blocked

  assert.equal(res.statusCode, 429);
  assert.equal(res.body.code, 429);
  assert.match(res.body.msg, /访客 AI 试用次数已用完/);
  assert.ok(headers['Retry-After']);
});
