export default {
  version: '053',
  name: 'learning-favorites-and-reading-course-progress',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_favorites (
        id            VARCHAR(64)  PRIMARY KEY,
        user_id       VARCHAR(64)  NOT NULL,
        module        VARCHAR(32)  NOT NULL,
        favorite_type VARCHAR(32)  NOT NULL,
        title         VARCHAR(256) DEFAULT '',
        content       LONGTEXT,
        metadata_json JSON         DEFAULT NULL,
        created_at    BIGINT       NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_lf_user_module_created (user_id, module, created_at),
        INDEX idx_lf_user_type_created (user_id, favorite_type, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_course_progress (
        id           VARCHAR(64) PRIMARY KEY,
        user_id      VARCHAR(64) NOT NULL,
        node_id      VARCHAR(128) NOT NULL,
        status       VARCHAR(32) NOT NULL DEFAULT 'completed',
        quiz_correct INT DEFAULT 0,
        quiz_total   INT DEFAULT 0,
        completed_at BIGINT DEFAULT NULL,
        updated_at   BIGINT NOT NULL,
        UNIQUE KEY uq_rcp_user_node (user_id, node_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_rcp_user_updated (user_id, updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
