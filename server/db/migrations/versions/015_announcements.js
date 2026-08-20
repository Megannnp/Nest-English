export default {
  version: '015',
  name: 'announcements',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title        VARCHAR(200) NOT NULL,
        body         TEXT NOT NULL,
        file_name    VARCHAR(255) DEFAULT NULL,
        file_key     VARCHAR(500) DEFAULT NULL,
        file_size    INT UNSIGNED DEFAULT NULL,
        file_url     TEXT DEFAULT NULL,
        is_published TINYINT(1) NOT NULL DEFAULT 1,
        created_by   VARCHAR(64) NOT NULL,
        created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_published_created (is_published, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_messages (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id     VARCHAR(64) NOT NULL,
        role        ENUM('teacher','student','parent') NOT NULL,
        content     TEXT NOT NULL,
        status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        reply       TEXT DEFAULT NULL,
        replied_at  DATETIME DEFAULT NULL,
        replied_by  VARCHAR(64) DEFAULT NULL,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user    (user_id),
        INDEX idx_status  (status),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
