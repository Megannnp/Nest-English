async function getColumnSet(pool, tableName) {
  const [dbRows] = await pool.query('SELECT DATABASE() AS name');
  const database = dbRows?.[0]?.name;
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
  `, [database, tableName]);

  return new Set(columns.map((item) => item.COLUMN_NAME));
}

async function hasIndex(pool, tableName, indexName) {
  const [dbRows] = await pool.query('SELECT DATABASE() AS name');
  const database = dbRows?.[0]?.name;
  const [rows] = await pool.query(`
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    LIMIT 1
  `, [database, tableName, indexName]);
  return rows.length > 0;
}

async function addMissingColumns(pool, tableName, definitions) {
  const existing = await getColumnSet(pool, tableName);
  const clauses = definitions
    .filter(([name]) => !existing.has(name))
    .map(([, definition]) => `ADD COLUMN ${definition}`);

  if (clauses.length) {
    await pool.query(`ALTER TABLE ${tableName} ${clauses.join(',\n      ')}`);
  }
}

async function addUniqueIndexIfMissing(pool, tableName, indexName, columnsSql) {
  if (await hasIndex(pool, tableName, indexName)) return;
  await pool.query(`ALTER TABLE ${tableName} ADD UNIQUE KEY ${indexName} (${columnsSql})`);
}

async function assertNoDuplicateScopes(pool, tableName, columns, label) {
  const columnSql = columns.join(', ');
  const [rows] = await pool.query(`
    SELECT ${columnSql}, COUNT(*) AS duplicate_count
    FROM ${tableName}
    GROUP BY ${columnSql}
    HAVING COUNT(*) > 1
    LIMIT 5
  `);

  if (rows.length) {
    throw new Error(`${label}存在重复 scope，无法添加唯一约束：${JSON.stringify(rows)}`);
  }
}

export default {
  version: '051',
  name: 'question-bank-constraints',
  async up({ pool }) {
    await addMissingColumns(pool, 'categories', [
      ['system_scope', "system_scope VARCHAR(64) NOT NULL DEFAULT '__none__'"],
      ['parent_scope', "parent_scope VARCHAR(64) NOT NULL DEFAULT '__root__'"],
    ]);
    await pool.query(`
      UPDATE categories
      SET system_scope = COALESCE(system_id, '__none__'),
          parent_scope = COALESCE(parent_id, '__root__')
    `);
    await assertNoDuplicateScopes(
      pool,
      'categories',
      ['module_id', 'system_scope', 'parent_scope', 'code'],
      '题库分类'
    );
    await addUniqueIndexIfMissing(
      pool,
      'categories',
      'uniq_categories_normalized_scope_code',
      'module_id, system_scope, parent_scope, code'
    );

    await addMissingColumns(pool, 'difficulties', [
      ['module_scope', "module_scope VARCHAR(64) NOT NULL DEFAULT '__all__'"],
      ['system_scope', "system_scope VARCHAR(64) NOT NULL DEFAULT '__all__'"],
    ]);
    await pool.query(`
      UPDATE difficulties
      SET module_scope = COALESCE(module_id, '__all__'),
          system_scope = COALESCE(system_id, '__all__')
    `);
    await assertNoDuplicateScopes(
      pool,
      'difficulties',
      ['module_scope', 'system_scope', 'level'],
      '题库难度'
    );
    await addUniqueIndexIfMissing(
      pool,
      'difficulties',
      'uniq_difficulties_normalized_scope_level',
      'module_scope, system_scope, level'
    );
  },
};
