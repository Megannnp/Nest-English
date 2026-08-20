const JOB_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS batch_grading_jobs (
    id                 VARCHAR(64) PRIMARY KEY,
    teacher_id         VARCHAR(64) NOT NULL,
    class_id           VARCHAR(64) DEFAULT NULL,
    assignment_id      VARCHAR(64) DEFAULT NULL,
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
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const ITEM_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS batch_grading_items (
    id                 VARCHAR(64) PRIMARY KEY,
    job_id             VARCHAR(64) NOT NULL,
    writing_id         VARCHAR(64) NOT NULL,
    student_name       VARCHAR(128) DEFAULT '',
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
    UNIQUE KEY uniq_batch_grading_job_writing (job_id, writing_id),
    FOREIGN KEY (job_id) REFERENCES batch_grading_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (writing_id) REFERENCES writings(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

export default {
  version: '014',
  name: 'ensure batch grading jobs',
  async up({ pool }) {
    await pool.query(JOB_TABLE_SQL);
    await pool.query(ITEM_TABLE_SQL);
  },
};
