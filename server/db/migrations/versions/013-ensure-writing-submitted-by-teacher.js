import { ensureWritingSubmittedByTeacherColumn } from '../schemaFixups.js';

export default {
  version: '013',
  name: 'ensure-writing-submitted-by-teacher',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const DB_CONFIG = { database: rows?.[0]?.name };
    await ensureWritingSubmittedByTeacherColumn(pool, DB_CONFIG);
  },
};
