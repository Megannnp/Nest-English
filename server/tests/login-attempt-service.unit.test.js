import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  __resetLoginAttemptStoreForTests,
  clearLoginFailures,
  getLoginAttemptStatus,
  recordLoginFailure,
} from '../services/loginAttemptService.js';

describe('loginAttemptService', () => {
  afterEach(() => {
    delete process.env.LOGIN_MAX_FAILED_ATTEMPTS;
    delete process.env.LOGIN_ATTEMPT_WINDOW_MS;
    delete process.env.LOGIN_ATTEMPT_LOCK_MS;
    __resetLoginAttemptStoreForTests();
  });

  it('blocks login after max failures in window', async () => {
    process.env.LOGIN_MAX_FAILED_ATTEMPTS = '3';
    process.env.LOGIN_ATTEMPT_WINDOW_MS = '60000';
    process.env.LOGIN_ATTEMPT_LOCK_MS = '120000';
    const now = Date.now();

    const first = await recordLoginFailure('teacher@example.com', '127.0.0.1', now);
    const second = await recordLoginFailure('teacher@example.com', '127.0.0.1', now + 1000);
    const third = await recordLoginFailure('teacher@example.com', '127.0.0.1', now + 2000);
    const blocked = await getLoginAttemptStatus('teacher@example.com', '127.0.0.1', now + 3000);

    assert.equal(first.blocked, false);
    assert.equal(second.blocked, false);
    assert.equal(third.blocked, true);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0);
  });

  it('clears failures after successful login reset', async () => {
    process.env.LOGIN_MAX_FAILED_ATTEMPTS = '3';
    const now = Date.now();
    await recordLoginFailure('teacher@example.com', '127.0.0.1', now);
    await recordLoginFailure('teacher@example.com', '127.0.0.1', now + 1000);

    await clearLoginFailures('teacher@example.com', '127.0.0.1');
    const status = await getLoginAttemptStatus('teacher@example.com', '127.0.0.1', now + 2000);

    assert.equal(status.allowed, true);
    assert.equal(status.attemptsLeft, 3);
  });

  it('uses a short default lock for normal password mistakes', async () => {
    const now = Date.now();
    let result;
    for (let i = 0; i < 10; i += 1) {
      result = await recordLoginFailure('teacher@example.com', '127.0.0.1', now + i);
    }

    assert.equal(result.blocked, true);
    assert.equal(result.retryAfterSeconds, 60);
  });
});
