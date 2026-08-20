/**
 * Migration 029: active membership state created from paid orders.
 */
export default {
  version: '029',
  name: 'membership-accounts',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS membership_accounts (
        user_id              VARCHAR(64) PRIMARY KEY,
        tier                 VARCHAR(32) NOT NULL,
        plan_code            VARCHAR(64) NOT NULL,
        cycle_months         INT NOT NULL DEFAULT 1,
        status               VARCHAR(24) NOT NULL DEFAULT 'active',
        started_at           BIGINT NOT NULL,
        expires_at           BIGINT NOT NULL,
        current_period_start BIGINT NOT NULL,
        current_period_end   BIGINT NOT NULL,
        next_reset_at        BIGINT DEFAULT NULL,
        monthly_quotas       JSON DEFAULT NULL,
        source_order_id      VARCHAR(64) NOT NULL,
        updated_at           BIGINT NOT NULL,
        INDEX idx_membership_status_expires (status, expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (source_order_id) REFERENCES payment_orders(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
