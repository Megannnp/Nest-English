/**
 * Migration 044: pending point rewards claimed by users.
 */
export default {
  version: '044',
  name: 'pending-point-rewards',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pending_point_rewards (
        id          VARCHAR(64) PRIMARY KEY,
        user_id     VARCHAR(64) NOT NULL,
        points      INT NOT NULL,
        reason      VARCHAR(64) NOT NULL,
        source_type VARCHAR(64) NOT NULL,
        source_id   VARCHAR(128) NOT NULL,
        label       VARCHAR(128) NOT NULL,
        metadata    JSON DEFAULT NULL,
        status      VARCHAR(16) NOT NULL DEFAULT 'pending',
        ledger_id   VARCHAR(64) DEFAULT NULL,
        created_at  BIGINT NOT NULL,
        claimed_at  BIGINT DEFAULT NULL,
        UNIQUE KEY uniq_pending_point_source (user_id, source_type, source_id),
        INDEX idx_pending_point_user_status (user_id, status, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (ledger_id) REFERENCES point_ledger(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
