export default {
  version: '037',
  name: 'module-assignments',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS module_assignments (
        id          VARCHAR(64)  PRIMARY KEY,
        module_type VARCHAR(32)  NOT NULL,
        teacher_id  VARCHAR(64)  NOT NULL,
        class_id    VARCHAR(64)  NOT NULL,
        title       VARCHAR(128) NOT NULL,
        topic       VARCHAR(128) NOT NULL DEFAULT '',
        due_at      BIGINT       DEFAULT NULL,
        allow_late  TINYINT(1)   NOT NULL DEFAULT 1,
        status      VARCHAR(16)  NOT NULL DEFAULT 'published',
        created_at  BIGINT       NOT NULL,
        updated_at  BIGINT       NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        INDEX idx_ma_teacher_module (teacher_id, module_type),
        INDEX idx_ma_class_module (class_id, module_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
