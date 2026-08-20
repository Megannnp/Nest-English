export default {
  version: '035',
  name: 'grammar-course-progress',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grammar_course_progress (
        id             VARCHAR(64)  PRIMARY KEY,
        user_id        VARCHAR(64)  NOT NULL,
        node_id        VARCHAR(128) NOT NULL,
        status         VARCHAR(16)  NOT NULL DEFAULT 'completed',
        quiz_correct   INT          NOT NULL DEFAULT 0,
        quiz_total     INT          NOT NULL DEFAULT 0,
        last_viewed_at BIGINT       NULL,
        completed_at   BIGINT       NULL,
        UNIQUE KEY uq_gcp_user_node (user_id, node_id),
        INDEX idx_gcp_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
