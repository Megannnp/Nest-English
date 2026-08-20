import './testSetup.js';
import jwt from 'jsonwebtoken';
import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import { clearUserStateCache, optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const SECRET = process.env.JWT_SECRET;

function tokenFor(id, extra = {}) {
  return jwt.sign({ id, role: 'student', email: 'a@b.c', ...extra }, SECRET, { expiresIn: '7d' });
}

function makeReq(token) {
  return { headers: { authorization: `Bearer ${token}` } };
}

function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

/** Stubs users.is_disabled lookups and counts how many actually hit the db. */
function stubUserRow(t, row) {
  const calls = [];
  t.mock.method(db, 'prepare', (sql) => ({
    get: async (...args) => {
      calls.push([sql, ...args]);
      return typeof row === 'function' ? row(...args) : row;
    },
  }));
  return calls;
}

test.beforeEach(() => clearUserStateCache());

test('requireAuth admits a user whose account is active', async (t) => {
  stubUserRow(t, { is_disabled: 0 });
  const req = makeReq(tokenFor(1));
  const res = makeRes();
  let nextErr = 'not-called';

  await requireAuth(req, res, (err) => { nextErr = err; });

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, null);
  assert.equal(req.user.id, 1);
});

test('requireAuth rejects a valid token whose account was disabled', async (t) => {
  stubUserRow(t, { is_disabled: 1 });
  const req = makeReq(tokenFor(1));
  const res = makeRes();
  let nextCalled = false;

  await requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.errorCode, 'AUTH_ACCOUNT_DISABLED');
  assert.equal(req.user, undefined);
});

test('requireAuth rejects a token whose user row no longer exists', async (t) => {
  stubUserRow(t, null);
  const req = makeReq(tokenFor(999));
  const res = makeRes();

  await requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.errorCode, 'AUTH_ACCOUNT_DISABLED');
});

test('account state is cached, so repeat requests do not re-query per request', async (t) => {
  const calls = stubUserRow(t, { is_disabled: 0 });

  for (let i = 0; i < 5; i += 1) {
    await requireAuth(makeReq(tokenFor(7)), makeRes(), () => {});
  }

  assert.equal(calls.length, 1);
});

test('cache is keyed per user, so one user does not mask another', async (t) => {
  stubUserRow(t, (id) => ({ is_disabled: id === 2 ? 1 : 0 }));

  const activeRes = makeRes();
  await requireAuth(makeReq(tokenFor(1)), activeRes, () => {});
  const disabledRes = makeRes();
  await requireAuth(makeReq(tokenFor(2)), disabledRes, () => {});

  assert.equal(activeRes.statusCode, null);
  assert.equal(disabledRes.statusCode, 403);
});

test('requireAuth surfaces lookup failures instead of admitting the request', async (t) => {
  t.mock.method(db, 'prepare', () => { throw new Error('db unavailable'); });
  const req = makeReq(tokenFor(1));
  const res = makeRes();
  let forwarded = null;

  await requireAuth(req, res, (err) => { forwarded = err; });

  assert.match(forwarded.message, /db unavailable/);
  assert.equal(res.statusCode, null);
  assert.equal(req.user, undefined);
});

test('requireAuth still rejects an unsigned/forged token before any db lookup', async (t) => {
  const calls = stubUserRow(t, { is_disabled: 0 });
  const forged = jwt.sign({ id: 1, role: 'student' }, 'wrong-secret');
  const res = makeRes();

  await requireAuth(makeReq(forged), res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.errorCode, 'AUTH_TOKEN_INVALID');
  assert.equal(calls.length, 0);
});

test('optionalAuth degrades a disabled account to anonymous rather than 403', async (t) => {
  stubUserRow(t, { is_disabled: 1 });
  const req = makeReq(tokenFor(1));
  const res = makeRes();
  let nextCalled = false;

  await optionalAuth(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
  assert.equal(req.user, null);
});

test('optionalAuth keeps identity for an active account', async (t) => {
  stubUserRow(t, { is_disabled: 0 });
  const req = makeReq(tokenFor(3));
  await optionalAuth(req, makeRes(), () => {});

  assert.equal(req.user.id, 3);
});
