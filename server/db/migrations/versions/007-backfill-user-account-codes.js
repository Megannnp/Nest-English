import { backfillUserAccountCodes } from '../backfills.js';

async function createUserAccountCode(pool) {
  while (true) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const [rows] = await pool.query('SELECT id FROM users WHERE account_code = ? LIMIT 1', [code]);
    if (!rows.length) return code;
  }
}

export default {
  version: '007',
  name: 'backfill-user-account-codes',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const DB_CONFIG = { database: rows?.[0]?.name };
    await backfillUserAccountCodes(pool, DB_CONFIG, () => createUserAccountCode(pool));
  },
};
