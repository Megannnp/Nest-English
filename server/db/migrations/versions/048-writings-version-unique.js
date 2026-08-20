export default {
  version: '048',
  name: 'writings-version-unique',
  async up({ pool }) {
    const [rows] = await pool.query(
      `SELECT COUNT(1) AS cnt
         FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'writings'
          AND index_name = 'uniq_writings_version'`
    );
    if (rows[0].cnt === 0) {
      await pool.query(
        'ALTER TABLE writings ADD UNIQUE INDEX uniq_writings_version (version_group_id, version_no)'
      );
    }
  },
};
