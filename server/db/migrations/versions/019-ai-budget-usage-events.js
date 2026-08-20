export default {
  version: '019',
  name: 'ai-budget-usage-events',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_events (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) DEFAULT NULL,
        role VARCHAR(16) DEFAULT '',
        class_id VARCHAR(64) DEFAULT '',
        feature VARCHAR(64) NOT NULL,
        source VARCHAR(64) DEFAULT '',
        created_at BIGINT NOT NULL,
        INDEX idx_ai_usage_events_created_at (created_at),
        INDEX idx_ai_usage_events_feature (feature),
        INDEX idx_ai_usage_events_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
