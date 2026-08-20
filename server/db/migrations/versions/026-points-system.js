/**
 * Migration 026: points accounts, ledger, check-ins, and redemptions.
 */
export default {
  version: '026',
  name: 'points-system',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS point_accounts (
        user_id      VARCHAR(64) PRIMARY KEY,
        balance      INT NOT NULL DEFAULT 0,
        total_earned INT NOT NULL DEFAULT 0,
        total_spent  INT NOT NULL DEFAULT 0,
        updated_at   BIGINT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS point_ledger (
        id            VARCHAR(64) PRIMARY KEY,
        user_id       VARCHAR(64) NOT NULL,
        delta_points  INT NOT NULL,
        balance_after INT NOT NULL,
        reason        VARCHAR(64) NOT NULL,
        source_type   VARCHAR(64) NOT NULL,
        source_id     VARCHAR(128) NOT NULL,
        metadata      JSON DEFAULT NULL,
        created_at    BIGINT NOT NULL,
        UNIQUE KEY uniq_point_source (user_id, source_type, source_id),
        INDEX idx_point_user_created (user_id, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS point_redemptions (
        id            VARCHAR(64) PRIMARY KEY,
        user_id       VARCHAR(64) NOT NULL,
        reward_code   VARCHAR(64) NOT NULL,
        reward_label  VARCHAR(128) NOT NULL,
        points_spent  INT NOT NULL,
        quantity      INT NOT NULL,
        unit          VARCHAR(32) NOT NULL,
        ledger_id     VARCHAR(64) NOT NULL,
        created_at    BIGINT NOT NULL,
        INDEX idx_redemption_user_created (user_id, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (ledger_id) REFERENCES point_ledger(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
