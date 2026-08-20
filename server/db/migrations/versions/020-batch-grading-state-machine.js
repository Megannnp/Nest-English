export default {
  version: '020',
  name: 'batch-grading-state-machine',
  async up({ pool }) {
    await pool.query(`
      ALTER TABLE batch_grading_items
      ADD COLUMN error_code VARCHAR(64) DEFAULT ''
    `).catch((error) => {
      if (!/Duplicate column name/i.test(error.message)) throw error;
    });

    await pool.query(`
      UPDATE batch_grading_jobs
      SET status = 'canceled'
      WHERE status = 'cancelled'
    `);

    await pool.query(`
      UPDATE batch_grading_items
      SET status = 'canceled',
          error_code = CASE WHEN COALESCE(error_code, '') = '' THEN 'user_canceled' ELSE error_code END
      WHERE status = 'cancelled'
    `);
  },
};
