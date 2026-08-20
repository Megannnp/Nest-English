export async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function runVersionedMigrations(pool, migrations = []) {
  await ensureMigrationTable(pool);
  const [rows] = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.version));

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    await migration.up({ pool });
    await pool.query(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
      [migration.version, migration.name, Date.now()]
    );
  }
}
