export default {
  version: '017',
  name: 'ensure-user-disabled-columns',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const database = rows?.[0]?.name;
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
    `, [database]);
    const existing = new Set(columns.map((item) => item.COLUMN_NAME));
    const alterClauses = [];

    if (!existing.has('is_disabled')) {
      alterClauses.push('ADD COLUMN is_disabled TINYINT(1) NOT NULL DEFAULT 0 AFTER is_admin');
    }
    if (!existing.has('disabled_at')) {
      alterClauses.push('ADD COLUMN disabled_at BIGINT DEFAULT NULL AFTER is_disabled');
    }
    if (!existing.has('disabled_by')) {
      alterClauses.push('ADD COLUMN disabled_by VARCHAR(64) DEFAULT NULL AFTER disabled_at');
    }

    if (alterClauses.length > 0) {
      await pool.query(`ALTER TABLE users ${alterClauses.join(',\n      ')}`);
    }
  },
};
