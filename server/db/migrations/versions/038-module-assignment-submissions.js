export default {
  version: '038',
  name: 'module-assignment-submissions',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS module_assignment_submissions (
        id            VARCHAR(64) PRIMARY KEY,
        assignment_id VARCHAR(64) NOT NULL,
        student_id    VARCHAR(64) NOT NULL,
        status        VARCHAR(16) NOT NULL DEFAULT 'completed',
        result_json   JSON        DEFAULT NULL,
        completed_at  BIGINT      NOT NULL,
        created_at    BIGINT      NOT NULL,
        updated_at    BIGINT      NOT NULL,
        FOREIGN KEY (assignment_id) REFERENCES module_assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_mas_assignment_student (assignment_id, student_id),
        INDEX idx_mas_student (student_id),
        INDEX idx_mas_assignment_status (assignment_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
