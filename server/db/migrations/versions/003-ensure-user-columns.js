import { ensureUserAccountCodeColumn, ensureUserPreferencesColumn } from '../schemaFixups.js';

export default {
  version: '003',
  name: 'ensure-user-columns',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const DB_CONFIG = { database: rows?.[0]?.name };
    await ensureUserAccountCodeColumn(pool, DB_CONFIG);
    await ensureUserPreferencesColumn(pool, DB_CONFIG);
  },
};
