export default {
  version: '039',
  name: 'writing-version-history',
  async up({ pool }) {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writings' AND COLUMN_NAME = 'version_group_id'`
    );
    if (cols.length === 0) {
      await pool.query(`
        ALTER TABLE writings
          ADD COLUMN version_group_id    VARCHAR(64) DEFAULT NULL,
          ADD COLUMN version_no          INT         NOT NULL DEFAULT 1,
          ADD COLUMN previous_writing_id VARCHAR(64) DEFAULT NULL
      `);
    }

    await pool.query(
      'UPDATE writings SET version_group_id = id WHERE version_group_id IS NULL'
    );

    await pool.query(`
      ALTER TABLE writings
        ADD INDEX IF NOT EXISTS idx_writings_version_group (version_group_id)
    `).catch(async () => {
      const [rows] = await pool.query(
        `SELECT COUNT(1) AS cnt
           FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = 'writings'
            AND index_name = 'idx_writings_version_group'`
      );
      if (rows[0].cnt === 0) {
        await pool.query(
          'ALTER TABLE writings ADD INDEX idx_writings_version_group (version_group_id)'
        );
      }
    });
  },
};
