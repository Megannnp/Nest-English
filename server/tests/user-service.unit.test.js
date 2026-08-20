import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { toSafeUser } from '../services/userMapper.js';
import { updateCurrentUserProfile } from '../services/userService.js';

test('toSafeUser normalizes preferences and hides password', () => {
  const user = toSafeUser({
    id: 'u1',
    account_code: '654321',
    email: 'user@example.com',
    phone: '13800000000',
    password: 'secret',
    role: 'student',
    real_name: '学生',
    class_id: 'c1',
    class_name: '一班',
    preferences: '{"compact":true}',
    created_at: 123,
  });

  assert.equal(user.id, 'u1');
  assert.equal(user.accountCode, '654321');
  assert.deepEqual(user.preferences, { compact: true });
  assert.equal('password' in user, false);
});

test('updateCurrentUserProfile rejects realName changes before DB access', async () => {
  await assert.rejects(() => updateCurrentUserProfile({
    userId: 'u1',
    payload: { realName: '新名字' },
  }), /姓名在注册后不可修改/);
});
