import { ensureWritingAssignmentColumns } from '../schemaFixups.js';

export default {
  version: '006',
  name: 'ensure-writing-assignment-columns',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const DB_CONFIG = { database: rows?.[0]?.name };
    await ensureWritingAssignmentColumns(pool, DB_CONFIG);
  },
};
