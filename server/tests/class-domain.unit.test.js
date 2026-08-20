import './testSetup.js';
import bcrypt from 'bcryptjs';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStudentStats,
  toRosterBindingValidationError,
  verifyClassPassword,
} from '../services/classDomain.js';
import { ValidationError } from '../utils/appError.js';

test('class domain upgrades legacy plain-text password to bcrypt hash after successful check', async () => {
  const result = await verifyClassPassword('demo-pass', 'demo-pass');
  assert.equal(result.valid, true);
  assert.equal(typeof result.upgradedHash, 'string');
  assert.match(result.upgradedHash, /^\$2[aby]\$/);
  assert.equal(await bcrypt.compare('demo-pass', result.upgradedHash), true);
});

test('class domain accepts bcrypt password without creating another upgraded hash', async () => {
  const hash = await bcrypt.hash('secure-pass', 4);
  const result = await verifyClassPassword(hash, 'secure-pass');
  assert.equal(result.valid, true);
  assert.equal(result.upgradedHash, null);
});

test('class domain maps roster binding sentinel errors into user-facing validation errors', () => {
  const error = toRosterBindingValidationError(new Error('ROSTER_ALREADY_LINKED'));
  assert.ok(error instanceof ValidationError);
  assert.match(error.message, /已绑定到其他账号/);

  const unchanged = new Error('OTHER_FAILURE');
  assert.equal(toRosterBindingValidationError(unchanged), unchanged);
});

test('class domain builds student trend stats and tolerates malformed weaknesses payloads', () => {
  const stats = buildStudentStats([
    { total_score: 10, max_score: 20, created_at: 1 },
    { total_score: 12, max_score: 20, created_at: 2 },
    { total_score: 16, max_score: 20, weaknesses: '["grammar"]', created_at: 3 },
  ]);
  assert.equal(stats.total, 3);
  assert.equal(stats.avgScore, 63);
  assert.equal(stats.trend, 'up');
  assert.deepEqual(stats.weaknesses, ['grammar']);

  const malformed = buildStudentStats([
    { total_score: 0, max_score: 20, created_at: 1 },
    { total_score: 15, max_score: 20, weaknesses: '{bad-json', created_at: 2 },
  ]);
  assert.equal(malformed.avgScore, 75);
  assert.equal(malformed.trend, 'stable');
  assert.deepEqual(malformed.weaknesses, []);
});
