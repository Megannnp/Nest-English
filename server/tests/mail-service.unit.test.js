import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildVerificationEmail, sendVerificationEmail } from '../services/mailService.js';

test('buildVerificationEmail returns stable subject and content', () => {
  const result = buildVerificationEmail({
    code: '123456',
    expiresMinutes: 10,
  });

  assert.equal(result.subject, 'NEST 密码重置验证码');
  assert.match(result.text, /123456/);
  assert.match(result.html, /123456/);
  assert.match(result.html, /10 分钟/);
});

test('sendVerificationEmail skips delivery in test env without smtp config', async () => {
  const result = await sendVerificationEmail({
    to: 'user@example.com',
    code: '123456',
    expiresMinutes: 10,
  });

  assert.deepEqual(result, {
    skipped: true,
    reason: 'smtp_not_configured',
  });
});
