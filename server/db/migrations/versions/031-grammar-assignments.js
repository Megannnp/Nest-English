export default {
  version: '031',
  name: 'grammar-assignments',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grammar_assignments (
        id            VARCHAR(64)  PRIMARY KEY,
        teacher_id    VARCHAR(64)  NOT NULL,
        class_id      VARCHAR(64)  NOT NULL,
        title         VARCHAR(128) NOT NULL,
        grammar_point VARCHAR(128) NOT NULL,
        quiz_type     VARCHAR(16)  NOT NULL,
        stage         VARCHAR(40)  NOT NULL DEFAULT '',
        difficulty    VARCHAR(40)  NOT NULL DEFAULT '',
        due_at        BIGINT       DEFAULT NULL,
        allow_late    TINYINT(1)   NOT NULL DEFAULT 1,
        status        VARCHAR(16)  NOT NULL DEFAULT 'published',
        created_at    BIGINT       NOT NULL,
        updated_at    BIGINT       NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        INDEX idx_ga_teacher_class (teacher_id, class_id),
        INDEX idx_ga_class_due (class_id, due_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grammar_assignment_submissions (
        id            VARCHAR(64) PRIMARY KEY,
        assignment_id VARCHAR(64) NOT NULL,
        student_id    VARCHAR(64) NOT NULL,
        correct_count INT         NOT NULL DEFAULT 0,
        total_count   INT         NOT NULL DEFAULT 0,
        submitted_at  BIGINT      NOT NULL,
        FOREIGN KEY (assignment_id) REFERENCES grammar_assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_gas_assignment_student (assignment_id, student_id),
        INDEX idx_gas_student (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
