async function ensureIndex(pool, tableName, indexName, columnsSql) {
  await pool.query(`
    ALTER TABLE ${tableName}
      ADD INDEX IF NOT EXISTS ${indexName} ${columnsSql}
  `).catch(async () => {
    const [rows] = await pool.query(
      `SELECT COUNT(1) AS cnt
         FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = ?
          AND index_name = ?`,
      [tableName, indexName]
    );
    if (rows[0].cnt === 0) {
      await pool.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} ${columnsSql}`);
    }
  });
}

export default {
  version: '034',
  name: 'grammar-practice-record-indexes',
  async up({ pool }) {
    await ensureIndex(pool, 'grammar_practice_records', 'idx_gpr_user_created', '(user_id, created_at)');
    await ensureIndex(pool, 'grammar_practice_records', 'idx_gpr_user_point', '(user_id, grammar_point)');
  },
};
