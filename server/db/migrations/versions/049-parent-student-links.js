export default {
  version: '049',
  name: 'parent-student-links',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parent_student_links (
        id              VARCHAR(64) PRIMARY KEY,
        parent_user_id  VARCHAR(64) NOT NULL,
        student_user_id VARCHAR(64) NOT NULL,
        status          VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at      BIGINT      NOT NULL,
        updated_at      BIGINT      NOT NULL,
        FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_parent_student (parent_user_id, student_user_id),
        INDEX idx_psl_parent_status (parent_user_id, status),
        INDEX idx_psl_student_status (student_user_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
