const TEST_CLASS_PATTERNS = [
  '集成测试%',
  '注册登录主流程%',
  '手动绑定%',
  '待处理%',
  '名单认领%',
];

async function getColumnSet(pool, database, tableName) {
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
  `, [database, tableName]);
  return new Set(columns.map((item) => item.COLUMN_NAME));
}

async function ensureColumn(pool, database, tableName) {
  const existing = await getColumnSet(pool, database, tableName);
  if (existing.has('is_test_data')) return;
  await pool.query(`
    ALTER TABLE ${tableName}
    ADD COLUMN is_test_data TINYINT(1) NOT NULL DEFAULT 0
  `);
}

function classPatternSql(columnName) {
  return TEST_CLASS_PATTERNS.map(() => `${columnName} LIKE ?`).join(' OR ');
}

export default {
  version: '021',
  name: 'ensure-test-data-flags',
  async up({ pool }) {
    const [rows] = await pool.query('SELECT DATABASE() AS name');
    const database = rows?.[0]?.name;

    await ensureColumn(pool, database, 'users');
    await ensureColumn(pool, database, 'classes');
    await ensureColumn(pool, database, 'writings');

    await pool.query(`
      UPDATE users
      SET is_test_data = 1
      WHERE email LIKE '%@example.com'
         OR email LIKE 'teacher-e2e-%'
         OR email LIKE 'student-e2e-%'
         OR email LIKE 'teacher-flow-%'
         OR email LIKE 'student-flow-%'
         OR id LIKE 'teacher-%'
         OR id LIKE 'student-%'
         OR ${classPatternSql('class_name')}
    `, TEST_CLASS_PATTERNS);

    await pool.query(`
      UPDATE classes
      SET is_test_data = 1
      WHERE ${classPatternSql('class_name')}
    `, TEST_CLASS_PATTERNS);

    await pool.query(`
      UPDATE writings w
      LEFT JOIN users u ON u.id = w.user_id
      LEFT JOIN assignments a ON a.id = w.assignment_id
      LEFT JOIN classes c ON c.id = a.class_id
      SET w.is_test_data = 1
      WHERE COALESCE(u.is_test_data, 0) = 1
         OR COALESCE(c.is_test_data, 0) = 1
         OR ${classPatternSql('w.class_name')}
    `, TEST_CLASS_PATTERNS);
  },
};
