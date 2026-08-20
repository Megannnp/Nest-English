export default {
  version: '045',
  name: 'system-question-disabled',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const database = rows?.[0]?.name;
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'questions'
    `, [database]);
    const existing = new Set(columns.map((item) => item.COLUMN_NAME));
    if (!existing.has('is_disabled')) {
      await pool.query(`
        ALTER TABLE questions
        ADD COLUMN is_disabled TINYINT(1) NOT NULL DEFAULT 0 AFTER needs_review
      `);
    }
  },
};
