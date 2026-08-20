export default {
  version: '033',
  name: 'reading-analyses',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_analyses (
        id                    VARCHAR(64) PRIMARY KEY,
        user_id               VARCHAR(64) NOT NULL,
        passage_text          MEDIUMTEXT  NOT NULL,
        questions_text        MEDIUMTEXT  DEFAULT NULL,
        result_json           JSON        DEFAULT NULL,
        status                VARCHAR(24) NOT NULL DEFAULT 'success',
        entitlement_ledger_id VARCHAR(64) DEFAULT NULL,
        source_id             VARCHAR(128) DEFAULT NULL,
        created_at            BIGINT      NOT NULL,
        updated_at            BIGINT      NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_ra_user_created (user_id, created_at),
        INDEX idx_ra_status_created (status, created_at),
        INDEX idx_ra_source (source_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
