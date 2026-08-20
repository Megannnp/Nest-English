import { ensureQuestionMetadataColumns } from '../schemaFixups.js';

export default {
  version: '004',
  name: 'ensure-question-metadata-columns',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const DB_CONFIG = { database: rows?.[0]?.name };
    await ensureQuestionMetadataColumns(pool, DB_CONFIG);
  },
};
