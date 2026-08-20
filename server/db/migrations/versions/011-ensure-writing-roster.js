import { ensureWritingRosterColumns } from '../schemaFixups.js';

export default {
  version: '011',
  name: 'ensure-writing-roster',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const DB_CONFIG = { database: rows?.[0]?.name };
    await ensureWritingRosterColumns(pool, DB_CONFIG);
  },
};
