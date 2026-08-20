/**
 * Unit tests for learningEventService.js
 *
 * Key contract: recordLearningEvent must NEVER throw — failures are swallowed.
 */
import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

// ── db + logger mocks ─────────────────────────────────────────────────────────
const runStub = { run: null };
const dbMock = { prepare: () => runStub };
const logErrorCalls = [];

mock.module('../db/database.js', { defaultExport: dbMock });
mock.module('../utils/logger.js', {
  namedExports: { logError: (...args) => logErrorCalls.push(args) },
});
// nanoid can be a real import — it's pure and has no side effects.

const { recordLearningEvent, getRecentLearningEvents } = await import('../services/learningEventService.js');
const { normalizeLearningModule } = await import('../utils/learningModules.js');

// ── tests ─────────────────────────────────────────────────────────────────────
test('records a grammar quiz_complete event without throwing', async () => {
  let insertedArgs = null;
  runStub.run = (...args) => { insertedArgs = args; };

  await recordLearningEvent({
    userId: 'u1',
    module: 'grammar',
    eventType: 'quiz_complete',
    score: 80,
    metadata: { grammarPoint: '定语从句' },
  });

  assert.ok(insertedArgs, 'db.prepare().run() should have been called');
  // args: id, userId, module, eventType, score, durationMs, metadata, created_at
  assert.equal(insertedArgs[1], 'u1');
  assert.equal(insertedArgs[2], 'grammar');
  assert.equal(insertedArgs[3], 'quiz_complete');
  assert.equal(insertedArgs[4], 80);
  assert.equal(insertedArgs[5], null);
  assert.ok(insertedArgs[6].includes('定语从句'));
});

test('records a writing submission event', async () => {
  let insertedArgs = null;
  runStub.run = (...args) => { insertedArgs = args; };

  await recordLearningEvent({
    userId: 'u2',
    module: 'writing',
    eventType: 'submission',
    metadata: { writingId: 'w-abc', wordCount: 250 },
  });

  assert.equal(insertedArgs[2], 'writing');
  assert.equal(insertedArgs[3], 'submission');
  assert.equal(insertedArgs[4], null);   // no score for submissions
});

test('normalizes legacy vocab events to vocabulary', async () => {
  let insertedArgs = null;
  runStub.run = (...args) => { insertedArgs = args; };

  assert.equal(normalizeLearningModule('vocab'), 'vocabulary');

  await recordLearningEvent({
    userId: 'u-vocab',
    module: 'vocab',
    eventType: 'practice_complete',
  });

  assert.equal(insertedArgs[2], 'vocabulary');
});

test('swallows DB errors without throwing', async () => {
  runStub.run = () => { throw new Error('DB connection lost'); };
  logErrorCalls.length = 0;

  // Must NOT throw
  await assert.doesNotReject(() =>
    recordLearningEvent({ userId: 'u3', module: 'grammar', eventType: 'quiz_complete' })
  );

  assert.ok(logErrorCalls.length > 0, 'logError should have been called');
  assert.ok(logErrorCalls[0][0] === 'learning_event_write_failed');
});

test('getRecentLearningEvents maps rows to camelCase', async () => {
  const fakeRows = [
    { id: 'ev1', module: 'grammar', event_type: 'quiz_complete', score: 75, duration_ms: null, metadata: '{"grammarPoint":"虚拟语气"}', created_at: 1700000000000 },
  ];
  runStub.all = () => fakeRows;
  // Patch prepare to return an object with .all()
  const origPrepare = dbMock.prepare;
  dbMock.prepare = () => ({ all: () => fakeRows });

  const events = await getRecentLearningEvents({ userId: 'u1' });
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, 'quiz_complete');
  assert.equal(events[0].score, 75);
  assert.deepEqual(events[0].metadata, { grammarPoint: '虚拟语气' });

  dbMock.prepare = origPrepare;
});
