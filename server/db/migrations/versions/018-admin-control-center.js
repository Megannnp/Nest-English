export default {
  version: '018',
  name: 'admin-control-center',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_budget_policies (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        scope_type VARCHAR(32) NOT NULL DEFAULT 'global',
        scope_id VARCHAR(64) DEFAULT '',
        feature VARCHAR(64) NOT NULL DEFAULT 'all',
        daily_limit INT DEFAULT NULL,
        monthly_limit INT DEFAULT NULL,
        total_limit INT DEFAULT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        notes TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS integration_accounts (
        id VARCHAR(64) PRIMARY KEY,
        provider VARCHAR(64) NOT NULL,
        display_name VARCHAR(128) NOT NULL,
        account_identifier VARCHAR(256) DEFAULT '',
        secret_ref VARCHAR(256) DEFAULT '',
        notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_operation_logs (
        id VARCHAR(64) PRIMARY KEY,
        admin_id VARCHAR(64) DEFAULT NULL,
        action VARCHAR(64) NOT NULL,
        target_type VARCHAR(64) DEFAULT '',
        target_id VARCHAR(128) DEFAULT '',
        detail JSON DEFAULT NULL,
        created_at BIGINT NOT NULL,
        INDEX idx_admin_operation_logs_created_at (created_at),
        INDEX idx_admin_operation_logs_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(128) PRIMARY KEY,
        setting_value TEXT,
        value_type VARCHAR(20) NOT NULL DEFAULT 'string',
        description VARCHAR(255) DEFAULT '',
        updated_by VARCHAR(64) DEFAULT NULL,
        updated_at BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
