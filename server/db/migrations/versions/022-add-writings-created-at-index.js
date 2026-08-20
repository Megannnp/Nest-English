export default {
  version: '009',
  name: 'add-writings-created-at-index',
  async up({ pool }) {
    // writings list queries sort/filter by created_at DESC; without an index this
    // becomes a full-table scan as the table grows.
    await pool.query(`
      ALTER TABLE writings
        ADD INDEX IF NOT EXISTS idx_writings_created_at (created_at DESC)
    `).catch(async () => {
      // MySQL < 8.0 doesn't support IF NOT EXISTS on indexes; fall back gracefully.
      const [rows] = await pool.query(
        `SELECT COUNT(1) AS cnt
           FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = 'writings'
            AND index_name = 'idx_writings_created_at'`
      );
      if (rows[0].cnt === 0) {
        await pool.query(
          'ALTER TABLE writings ADD INDEX idx_writings_created_at (created_at DESC)'
        );
      }
    });

    // Also index user_id + created_at for per-student sorted queries.
    await pool.query(`
      ALTER TABLE writings
        ADD INDEX IF NOT EXISTS idx_writings_user_created (user_id, created_at DESC)
    `).catch(async () => {
      const [rows] = await pool.query(
        `SELECT COUNT(1) AS cnt
           FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = 'writings'
            AND index_name = 'idx_writings_user_created'`
      );
      if (rows[0].cnt === 0) {
        await pool.query(
          'ALTER TABLE writings ADD INDEX idx_writings_user_created (user_id, created_at DESC)'
        );
      }
    });
  },
};
