import { ensureWritingTaskRuntimeColumns } from '../schemaFixups.js';

export default {
  version: '005',
  name: 'ensure-writing-task-runtime-columns',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const DB_CONFIG = { database: rows?.[0]?.name };
    await ensureWritingTaskRuntimeColumns(pool, DB_CONFIG);
  },
};
