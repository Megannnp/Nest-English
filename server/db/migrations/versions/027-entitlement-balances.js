/**
 * Migration 027: entitlement balances credited by point redemptions.
 */
export default {
  version: '027',
  name: 'entitlement-balances',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entitlement_accounts (
        user_id    VARCHAR(64) NOT NULL,
        unit       VARCHAR(64) NOT NULL,
        balance    INT NOT NULL DEFAULT 0,
        total_added INT NOT NULL DEFAULT 0,
        total_used  INT NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, unit),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS entitlement_ledger (
        id            VARCHAR(64) PRIMARY KEY,
        user_id       VARCHAR(64) NOT NULL,
        unit          VARCHAR(64) NOT NULL,
        delta_amount  INT NOT NULL,
        balance_after INT NOT NULL,
        reason        VARCHAR(64) NOT NULL,
        source_type   VARCHAR(64) NOT NULL,
        source_id     VARCHAR(128) NOT NULL,
        metadata      JSON DEFAULT NULL,
        created_at    BIGINT NOT NULL,
        UNIQUE KEY uniq_entitlement_source (user_id, unit, source_type, source_id),
        INDEX idx_entitlement_user_created (user_id, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
