const JOB_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS exam_import_jobs (
    id                 VARCHAR(64) PRIMARY KEY,
    uploader_id        VARCHAR(64) NOT NULL,
    status             VARCHAR(24) NOT NULL DEFAULT 'pending',
    queue_name         VARCHAR(32) DEFAULT '',
    payload            LONGTEXT,
    error_message      TEXT,
    total_count        INT NOT NULL DEFAULT 0,
    processed_count    INT NOT NULL DEFAULT 0,
    success_count      INT NOT NULL DEFAULT 0,
    failed_count       INT NOT NULL DEFAULT 0,
    created_at         BIGINT NOT NULL,
    updated_at         BIGINT NOT NULL,
    started_at         BIGINT DEFAULT NULL,
    finished_at        BIGINT DEFAULT NULL,
    last_heartbeat_at  BIGINT DEFAULT NULL,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const ITEM_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS exam_import_items (
    id                 VARCHAR(64) PRIMARY KEY,
    job_id             VARCHAR(64) NOT NULL,
    file_name          VARCHAR(512) DEFAULT '',
    file_path          VARCHAR(1024) DEFAULT '',
    file_ext           VARCHAR(16) DEFAULT '',
    year               VARCHAR(16) DEFAULT '',
    region             VARCHAR(64) DEFAULT '',
    paper              VARCHAR(64) DEFAULT '',
    answer_file_path   VARCHAR(1024) DEFAULT '',
    sort_order         INT NOT NULL DEFAULT 0,
    status             VARCHAR(24) NOT NULL DEFAULT 'pending',
    attempts           INT NOT NULL DEFAULT 0,
    result             LONGTEXT,
    error_code         VARCHAR(64) DEFAULT '',
    error_message      TEXT,
    created_at         BIGINT NOT NULL,
    updated_at         BIGINT NOT NULL,
    started_at         BIGINT DEFAULT NULL,
    finished_at        BIGINT DEFAULT NULL,
    last_heartbeat_at  BIGINT DEFAULT NULL,
    UNIQUE KEY uniq_exam_import_job_file (job_id, file_name),
    FOREIGN KEY (job_id) REFERENCES exam_import_jobs(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

export default {
  version: '060',
  name: 'ensure exam import jobs',
  async up({ pool }) {
    await pool.query(JOB_TABLE_SQL);
    await pool.query(ITEM_TABLE_SQL);
  },
};