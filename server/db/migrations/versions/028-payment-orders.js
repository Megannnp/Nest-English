/**
 * Migration 028: payment orders for manual QR and future provider callbacks.
 */
export default {
  version: '028',
  name: 'payment-orders',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id             VARCHAR(64) PRIMARY KEY,
        user_id        VARCHAR(64) NOT NULL,
        product_code   VARCHAR(64) NOT NULL,
        product_type   VARCHAR(32) NOT NULL,
        product_label  VARCHAR(128) NOT NULL,
        amount_cents   INT NOT NULL,
        currency       VARCHAR(8) NOT NULL DEFAULT 'CNY',
        payment_method VARCHAR(32) NOT NULL,
        status         VARCHAR(24) NOT NULL DEFAULT 'pending',
        provider       VARCHAR(32) DEFAULT '',
        provider_order_id VARCHAR(128) DEFAULT '',
        qr_url         VARCHAR(1024) DEFAULT '',
        proof_note     VARCHAR(512) DEFAULT '',
        created_at     BIGINT NOT NULL,
        paid_at        BIGINT DEFAULT NULL,
        confirmed_at   BIGINT DEFAULT NULL,
        confirmed_by   VARCHAR(64) DEFAULT '',
        updated_at     BIGINT NOT NULL,
        INDEX idx_payment_user_created (user_id, created_at),
        INDEX idx_payment_status_created (status, created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
