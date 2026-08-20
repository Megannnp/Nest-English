export default {
  version: '057',
  name: 'speaking-progress-records',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS speaking_progress_records (
        id             VARCHAR(64)  PRIMARY KEY,
        user_id        VARCHAR(64)  NOT NULL,
        question_id    VARCHAR(64)  DEFAULT NULL,
        activity_type  VARCHAR(32)  NOT NULL,
        transcript     LONGTEXT,
        score          DECIMAL(5,2) DEFAULT NULL,
        duration_ms    INT          DEFAULT NULL,
        feedback       TEXT,
        metadata_json  JSON         DEFAULT NULL,
        created_at     BIGINT       NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL,
        INDEX idx_spr_user_created (user_id, created_at),
        INDEX idx_spr_user_activity (user_id, activity_type),
        INDEX idx_spr_question (question_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
