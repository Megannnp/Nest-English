/**
 * Migration 030: entitlement buckets split expiring plan quotas from durable packs/redemptions.
 */
export default {
  version: '030',
  name: 'entitlement-buckets',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entitlement_buckets (
        id              VARCHAR(64) PRIMARY KEY,
        user_id         VARCHAR(64) NOT NULL,
        unit            VARCHAR(64) NOT NULL,
        balance         INT NOT NULL DEFAULT 0,
        original_amount INT NOT NULL DEFAULT 0,
        reason          VARCHAR(64) NOT NULL,
        source_type     VARCHAR(64) NOT NULL,
        source_id       VARCHAR(128) NOT NULL,
        expires_at      BIGINT DEFAULT NULL,
        created_at      BIGINT NOT NULL,
        updated_at      BIGINT NOT NULL,
        UNIQUE KEY uniq_entitlement_bucket_source (user_id, unit, source_type, source_id),
        INDEX idx_entitlement_bucket_consume (user_id, unit, expires_at, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      INSERT IGNORE INTO entitlement_buckets
        (id, user_id, unit, balance, original_amount, reason, source_type, source_id,
         expires_at, created_at, updated_at)
      SELECT
        CONCAT('legacy_', LEFT(SHA2(CONCAT(user_id, ':', unit), 256), 32)),
        user_id,
        unit,
        balance,
        balance,
        'legacy_balance',
        'legacy_balance',
        CONCAT('legacy:', LEFT(SHA2(CONCAT(user_id, ':', unit), 256), 32)),
        NULL,
        updated_at,
        updated_at
      FROM entitlement_accounts
      WHERE balance > 0
    `);
  },
};
