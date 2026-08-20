export default {
  version: '052',
  name: 'parent-binding-codes',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parent_binding_codes (
        id              VARCHAR(64) PRIMARY KEY,
        student_user_id VARCHAR(64) NOT NULL,
        code            VARCHAR(16) NOT NULL,
        expires_at      BIGINT      NOT NULL,
        used_at         BIGINT      DEFAULT NULL,
        created_at      BIGINT      NOT NULL,
        updated_at      BIGINT      NOT NULL,
        FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_parent_binding_code (code),
        INDEX idx_pbc_student_active (student_user_id, used_at, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
