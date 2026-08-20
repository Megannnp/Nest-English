import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import { hasAnyLearningEvent } from '../services/learningEventService.js';

test('hasAnyLearningEvent is true when the user has practised any module', async (t) => {
  const seen = [];
  t.mock.method(db, 'prepare', (sql) => ({
    get: async (...args) => {
      seen.push([sql, ...args]);
      return { found: 1 };
    },
  }));

  assert.equal(await hasAnyLearningEvent({ userId: 'u1' }), true);
  // Must not filter by module: practising reading should suppress the
  // writing-worded onboarding card just the same.
  assert.equal(/\bmodule\b/i.test(seen[0][0]), false);
  assert.equal(seen[0][1], 'u1');
});

test('hasAnyLearningEvent is false for a brand new account', async (t) => {
  t.mock.method(db, 'prepare', () => ({ get: async () => undefined }));

  assert.equal(await hasAnyLearningEvent({ userId: 'u2' }), false);
});

test('hasAnyLearningEvent short-circuits without a user id', async (t) => {
  let queried = false;
  t.mock.method(db, 'prepare', () => { queried = true; return { get: async () => null }; });

  assert.equal(await hasAnyLearningEvent({ userId: '' }), false);
  assert.equal(queried, false);
});

test('hasAnyLearningEvent stops at the first row', async (t) => {
  const seen = [];
  t.mock.method(db, 'prepare', (sql) => ({ get: async () => { seen.push(sql); return null; } }));

  await hasAnyLearningEvent({ userId: 'u3' });

  assert.match(seen[0], /LIMIT 1/i);
});
