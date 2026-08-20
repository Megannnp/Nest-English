import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { toSafeUser } from '../services/authMapper.js';
import { loginUser, normalizeAuthRole, registerUser } from '../services/authService.js';
import { normalizePrepExamPreference } from '../services/prepExamPreferences.js';
import { emailCodeAuthBodySchema, registerBodySchema } from '../utils/schemas/authSchemas.js';

test('toSafeUser normalizes DB row without leaking password', () => {
  const user = toSafeUser({
    id: 'u1',
    account_code: '123456',
    email: 'user@example.com',
    phone: null,
    password: 'secret',
    role: 'student',
    real_name: '学生',
    class_id: null,
    class_name: '',
    preferences: '{"theme":"light"}',
    created_at: 123,
  });

  assert.equal(user.id, 'u1');
  assert.equal(user.accountCode, '123456');
  assert.deepEqual(user.preferences, { theme: 'light' });
  assert.equal('password' in user, false);
});

test('auth service rejects weak registration passwords before persistence', async () => {
  await assert.rejects(() => registerUser({
    email: 'student@example.com',
    phone: '',
    password: 'weak',
    confirmPassword: 'weak',
    role: 'student',
    realName: '学生',
  }), /密码至少8位/);
});

test('auth service rejects malformed login account before persistence', async () => {
  await assert.rejects(() => loginUser({
    account: 'not-an-account',
    password: 'Password123',
  }), /请输入正确的邮箱或手机号/);
});

test('auth role normalization allows public roles but never public admin', () => {
  assert.equal(normalizeAuthRole('student'), 'student');
  assert.equal(normalizeAuthRole('teacher'), 'teacher');
  assert.equal(normalizeAuthRole('parent'), 'parent');
  assert.equal(normalizeAuthRole('admin'), 'student');
});

test('register schema accepts parent role', () => {
  const parsed = registerBodySchema.parse({
    email: 'parent@example.com',
    phone: '',
    password: 'Password123',
    confirmPassword: 'Password123',
    role: 'parent',
    realName: '张家长',
  });

  assert.equal(parsed.role, 'parent');
});

test('register schema accepts initial prep exam preference', () => {
  const parsed = registerBodySchema.parse({
    email: 'student@example.com',
    phone: '',
    password: 'Password123',
    confirmPassword: 'Password123',
    role: 'student',
    realName: '张学生',
    preferences: { prepExamId: 'ielts' },
  });

  assert.deepEqual(parsed.preferences, { prepExamId: 'ielts' });
});

test('email code auth schema accepts initial prep exam preference', () => {
  const parsed = emailCodeAuthBodySchema.parse({
    email: 'student@example.com',
    code: '123456',
    realName: '张学生',
    role: 'student',
    preferences: { prepExamId: 'toefl' },
  });

  assert.deepEqual(parsed.preferences, { prepExamId: 'toefl' });
});

test('prep exam preference validation rejects unknown targets', () => {
  assert.equal(normalizePrepExamPreference('ielts'), 'ielts');
  assert.throws(() => normalizePrepExamPreference('unknown-exam'), /备考目标无效/);
});
