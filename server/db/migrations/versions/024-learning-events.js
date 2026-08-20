/**
 * Migration 024: cross-module learning events
 *
 * Provides a unified time-series log of learning activity across all modules
 * (writing, grammar, and future additions).  Each row is a single event emitted
 * by a module when a meaningful learning action completes.
 *
 * Columns:
 *   module      — which product area emitted the event ('writing' | 'grammar')
 *   event_type  — what happened ('submission' | 'feedback_received' | 'quiz_complete')
 *   score       — normalised 0-100 value when applicable (quiz score, writing score)
 *   duration_ms — time-on-task in milliseconds (optional, for future instrumentation)
 *   metadata    — module-specific JSON payload (grammar_point, quiz_type, writing_id…)
 */
export default {
  version: '024',
  name: 'learning-events',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_events (
        id          VARCHAR(64)   PRIMARY KEY,
        user_id     VARCHAR(64)   NOT NULL,
        module      VARCHAR(32)   NOT NULL,
        event_type  VARCHAR(64)   NOT NULL,
        score       DECIMAL(5,2)  DEFAULT NULL,
        duration_ms INT           DEFAULT NULL,
        metadata    JSON          DEFAULT NULL,
        created_at  BIGINT        NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_le_user_module   (user_id, module),
        INDEX idx_le_user_created  (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
