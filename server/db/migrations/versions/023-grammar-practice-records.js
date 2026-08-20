export default {
  version: '023',
  name: 'grammar-practice-records',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grammar_practice_records (
        id           VARCHAR(64)  PRIMARY KEY,
        user_id      VARCHAR(64)  NOT NULL,
        grammar_point VARCHAR(128) NOT NULL,
        quiz_type    VARCHAR(16)  NOT NULL,
        stage        VARCHAR(16)  NOT NULL,
        difficulty   VARCHAR(16)  NOT NULL,
        correct_count INT         NOT NULL DEFAULT 0,
        total_count  INT          NOT NULL DEFAULT 0,
        created_at   BIGINT       NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
