import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let completionQueue = [];
const completionCalls = [];
const failureCalls = [];
const successCalls = [];

mock.module('../utils/logger.js', {
  namedExports: { logError: () => {} },
});
mock.module('../services/aiCompletionService.js', {
  namedExports: {
    executeCompletion: async (payload) => {
      completionCalls.push(payload);
      const next = completionQueue.shift();
      if (next?.throw) throw next.throw;
      return { content: next?.content ?? '' };
    },
  },
});
mock.module('../services/aiProviderService.js', {
  namedExports: {
    classifyAIError: () => ({ status: 503, code: 'AI_UNAVAILABLE' }),
    ensureAICircuitAvailable: async () => {},
    recordAIFailure: async (...args) => { failureCalls.push(args); },
    recordAISuccess: async (...args) => { successCalls.push(args); },
  },
});

const { generateSentenceTree, handleTreeError } = await import('../services/grammar/treeService.js');

test.beforeEach(() => {
  completionQueue = [];
  completionCalls.length = 0;
  failureCalls.length = 0;
  successCalls.length = 0;
});

test('generateSentenceTree parses a clean JSON tree on the first attempt', async () => {
  completionQueue = [{ content: '{"id":"root","role":"主谓宾句","word":"I know.","children":[]}' }];

  const tree = await generateSentenceTree({ sentence: 'I know.', requestId: 'r1' });

  assert.equal(tree.id, 'root');
  assert.equal(completionCalls.length, 1);
  assert.equal(successCalls.length, 1);
});

test('generateSentenceTree strips markdown fences around the JSON tree', async () => {
  completionQueue = [{ content: '```json\n{"id":"root","role":"x","word":"y","children":[]}\n```' }];

  const tree = await generateSentenceTree({ sentence: 'I know.' });

  assert.equal(tree.id, 'root');
});

test('generateSentenceTree retries with the simplified prompt after a non-parse failure', async () => {
  completionQueue = [
    { throw: Object.assign(new Error('network timeout'), { status: 504 }) },
    { content: '{"id":"root","role":"x","word":"y","children":[]}' },
  ];

  const tree = await generateSentenceTree({ sentence: 'I know.', requestId: 'r2' });

  assert.equal(tree.id, 'root');
  assert.equal(completionCalls.length, 2);
  assert.match(completionCalls[1].messages[0].content, /树只有2层/);
  assert.equal(completionCalls[1].max_tokens, 2000);
});

test('generateSentenceTree does not retry and records failure when the first response is unparsable JSON', async () => {
  completionQueue = [{ content: 'not json at all' }];

  await assert.rejects(
    generateSentenceTree({ sentence: 'I know.', requestId: 'r3' }),
    SyntaxError,
  );

  assert.equal(completionCalls.length, 1);
  assert.equal(failureCalls.length, 1);
  assert.equal(failureCalls[0][1], 'grammar_tree');
});

test('handleTreeError maps JSON parse failures to a 502 with a friendly message', () => {
  const result = handleTreeError(new SyntaxError('bad json'));
  assert.deepEqual(result, { status: 502, msg: 'AI 返回格式异常，请重试' });
  assert.equal(failureCalls.length, 0);
});

test('handleTreeError passes through client errors under 500 unchanged', () => {
  const err = Object.assign(new Error('缺少句子'), { status: 400 });
  const result = handleTreeError(err);
  assert.deepEqual(result, { status: 400, msg: '缺少句子' });
  assert.equal(failureCalls.length, 0);
});

test('handleTreeError records the failure and falls back to the classified AI error', () => {
  const err = new Error('upstream exploded');
  const result = handleTreeError(err, { requestId: 'r4', userId: 'u1' });

  assert.equal(result.status, 503);
  assert.equal(result.msg, 'upstream exploded');
  assert.equal(result.errorCode, 'AI_UNAVAILABLE');
  assert.equal(failureCalls.length, 1);
  assert.equal(failureCalls[0][1], 'grammar_tree');
});
