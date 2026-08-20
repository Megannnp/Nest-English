import assert from 'node:assert/strict';
import test from 'node:test';

import { csrfProtection } from '../middleware/csrfProtection.js';

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runMiddleware(req) {
  const res = createResponse();
  let nextCalled = false;
  csrfProtection(req, res, () => {
    nextCalled = true;
  });
  return { nextCalled, res };
}

test('csrfProtection allows safe methods', () => {
  const result = runMiddleware({
    method: 'GET',
    headers: {
      cookie: 'nest_token=token',
    },
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.res.statusCode, 200);
});

test('csrfProtection allows bearer authenticated unsafe requests', () => {
  const result = runMiddleware({
    method: 'POST',
    headers: {
      authorization: 'Bearer token',
      cookie: 'nest_token=token',
    },
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.res.statusCode, 200);
});

test('csrfProtection rejects cookie authenticated unsafe requests without matching token', () => {
  const result = runMiddleware({
    method: 'POST',
    headers: {
      cookie: 'nest_token=token; nest_csrf=csrf-token',
      'x-csrf-token': 'wrong-token',
    },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
  assert.match(result.res.body.msg, /CSRF/);
});

test('csrfProtection allows cookie authenticated unsafe requests with matching token', () => {
  const result = runMiddleware({
    method: 'POST',
    headers: {
      cookie: 'nest_token=token; nest_csrf=csrf-token',
      'x-csrf-token': 'csrf-token',
    },
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.res.statusCode, 200);
});
