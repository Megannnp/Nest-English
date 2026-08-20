import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVerificationCodeKey,
  deleteVerificationCode,
  getVerificationCode,
  saveVerificationCode,
} from '../services/verificationCodeStore.js';

test('verification code store falls back in test env and round-trips values', async () => {
  const key = buildVerificationCodeKey('email', 'USER@example.com');
  const payload = {
    code: '123456',
    expiresAt: Date.now() + 60_000,
    type: 'email',
    account: 'user@example.com',
  };

  await saveVerificationCode(key, payload, 60);
  assert.deepEqual(await getVerificationCode(key), payload);
  await deleteVerificationCode(key);
  assert.equal(await getVerificationCode(key), null);
});
