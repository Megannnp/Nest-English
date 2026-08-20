import './testSetup.js';
import jwt from 'jsonwebtoken';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import db from '../db/database.js';

const { buildClientLearningSourceId, default: usersRouter } = await import('../routes/users.js');

test('buildClientLearningSourceId keeps point ledger source_id within database limit', () => {
  const sourceId = buildClientLearningSourceId('reading', 'x'.repeat(300));

  assert.equal(sourceId.length, 128);
  assert.match(sourceId, /^client:reading:/);
});

test('client learning point event endpoint is disabled', async (t) => {
  // requireAuth re-checks users.is_disabled, so isolate that lookup: without a
  // stub this unit test opens a real MySQL connection and never exits.
  t.mock.method(db, 'prepare', () => ({ get: async () => ({ is_disabled: 0 }) }));

  const req = new EventEmitter();
  req.method = 'POST';
  req.url = '/me/points/learning-events';
  req.headers = {
    authorization: `Bearer ${jwt.sign({ id: 'student-1', role: 'student' }, process.env.JWT_SECRET)}`,
  };
  req.body = { module: 'reading', eventType: 'complete', idempotencyKey: 'fake' };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await new Promise((resolve, reject) => {
    usersRouter.handle(req, res, (error) => error ? reject(error) : resolve());
    setImmediate(resolve);
  });

  assert.equal(res.statusCode, 410);
  assert.match(res.body.msg, /停用/);
});
