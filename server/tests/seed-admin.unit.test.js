import assert from 'node:assert/strict';
import test from 'node:test';

import { seedAdmin } from '../scripts/seed-admin.js';

function createPool(existingRows = []) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('WHERE email = ? LIMIT 1')) return [existingRows];
      if (sql.includes('WHERE account_code = ? LIMIT 1')) return [[]];
      return [{ affectedRows: 1 }];
    },
    async end() {
      calls.push({ sql: 'END', params: [] });
    },
  };
}

function silentLogger() {
  return { log() {} };
}

test('seed admin does not reset an existing password by default', async () => {
  const dbPool = createPool([{ id: 'admin_1' }]);

  await seedAdmin({
    dbPool,
    env: {},
    hashPassword: async () => 'new-hash',
    logger: silentLogger(),
  });

  assert.equal(dbPool.calls.some((call) => String(call.sql).includes('password = ?')), false);
  assert.equal(dbPool.calls.some((call) => String(call.sql).includes('SET is_admin = 1')), true);
});

test('seed admin resets an existing password only when explicitly requested', async () => {
  const dbPool = createPool([{ id: 'admin_1' }]);

  await seedAdmin({
    dbPool,
    env: { ADMIN_RESET_PASSWORD: '1', ADMIN_PASSWORD: 'ResetAdmin2026!' },
    hashPassword: async (password) => `hash:${password}`,
    logger: silentLogger(),
  });

  const resetCall = dbPool.calls.find((call) => String(call.sql).includes('password = ?'));
  assert.ok(resetCall);
  assert.deepEqual(resetCall.params, ['hash:ResetAdmin2026!', 'admin@nest.local']);
});

test('seed admin requires ADMIN_PASSWORD when resetting an existing password', async () => {
  const dbPool = createPool([{ id: 'admin_1' }]);

  await assert.rejects(
    seedAdmin({
      dbPool,
      env: { ADMIN_RESET_PASSWORD: '1' },
      hashPassword: async () => 'hash',
      logger: silentLogger(),
    }),
    /必须设置 ADMIN_PASSWORD/
  );
});
