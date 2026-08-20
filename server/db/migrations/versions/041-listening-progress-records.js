export default {
  version: '041',
  name: 'listening-progress-records',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS listening_progress_records (
        id             VARCHAR(64)  PRIMARY KEY,
        user_id        VARCHAR(64)  NOT NULL,
        activity_type  VARCHAR(32)  NOT NULL,
        score          DECIMAL(5,2) DEFAULT NULL,
        accuracy       DECIMAL(5,2) DEFAULT NULL,
        duration_ms    INT          DEFAULT NULL,
        metadata_json  JSON         DEFAULT NULL,
        created_at     BIGINT       NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_lpr_user_created (user_id, created_at),
        INDEX idx_lpr_user_activity (user_id, activity_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
