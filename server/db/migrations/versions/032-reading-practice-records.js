export default {
  version: '032',
  name: 'reading-practice-records',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_practice_records (
        id             VARCHAR(64)  PRIMARY KEY,
        user_id        VARCHAR(64)  NOT NULL,
        mode           VARCHAR(24)  NOT NULL,
        genre          VARCHAR(32)  DEFAULT NULL,
        question_type  VARCHAR(32)  DEFAULT NULL,
        passage_ids    JSON         DEFAULT NULL,
        correct_count  INT          NOT NULL DEFAULT 0,
        total_count    INT          NOT NULL DEFAULT 0,
        score          DECIMAL(5,2) DEFAULT NULL,
        answers_json   JSON         DEFAULT NULL,
        wrong_items_json JSON       DEFAULT NULL,
        duration_ms    INT          DEFAULT NULL,
        created_at     BIGINT       NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_rpr_user_created (user_id, created_at),
        INDEX idx_rpr_user_type (user_id, question_type),
        INDEX idx_rpr_user_genre (user_id, genre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
