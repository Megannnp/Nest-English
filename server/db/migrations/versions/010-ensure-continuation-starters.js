import { backfillQuestionMetadata } from '../backfills.js';
import { ensureQuestionMetadataColumns } from '../schemaFixups.js';

export default {
  version: '010',
  name: 'ensure-continuation-starters',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const DB_CONFIG = { database: rows?.[0]?.name };
    await ensureQuestionMetadataColumns(pool, DB_CONFIG);
    await backfillQuestionMetadata(pool);
  },
};
