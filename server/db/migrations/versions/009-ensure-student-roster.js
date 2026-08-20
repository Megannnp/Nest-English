export default {
  version: '009',
  name: 'ensure-student-roster',
  async up({ pool }) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN student_no VARCHAR(32) DEFAULT '' AFTER real_name
    `).catch((error) => {
      if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_roster (
        id           VARCHAR(64) PRIMARY KEY,
        class_id     VARCHAR(64) NOT NULL,
        student_no   VARCHAR(32) NOT NULL,
        student_name VARCHAR(128) NOT NULL,
        user_id      VARCHAR(64) DEFAULT NULL,
        status       VARCHAR(16) NOT NULL DEFAULT 'pending',
        created_at   BIGINT NOT NULL,
        updated_at   BIGINT NOT NULL,
        UNIQUE KEY uniq_student_roster_class_student_no (class_id, student_no),
        UNIQUE KEY uniq_student_roster_user_id (user_id),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
