export const BASE_SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id          VARCHAR(64) PRIMARY KEY,
      account_code VARCHAR(6) DEFAULT NULL,
      nick_name   VARCHAR(128) NOT NULL,
      email       VARCHAR(128) UNIQUE NOT NULL,
      phone       VARCHAR(20) UNIQUE,
      password    VARCHAR(256) NOT NULL,
      role        VARCHAR(16) NOT NULL DEFAULT 'student',
      real_name   VARCHAR(128) DEFAULT '',
      class_id    VARCHAR(64) DEFAULT NULL,
      class_name  VARCHAR(128) DEFAULT '',
      preferences JSON DEFAULT NULL,
      created_at  BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS classes (
      id           VARCHAR(64) PRIMARY KEY,
      class_name   VARCHAR(128) NOT NULL,
      class_code   VARCHAR(32) UNIQUE NOT NULL,
      password     VARCHAR(256) NOT NULL,
      teacher_id   VARCHAR(64) NOT NULL,
      teacher_name VARCHAR(128) NOT NULL,
      created_at   BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS class_students (
      class_id   VARCHAR(64) NOT NULL,
      student_id VARCHAR(64) NOT NULL,
      joined_at  BIGINT NOT NULL,
      PRIMARY KEY (class_id, student_id),
      FOREIGN KEY (class_id)   REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id)   ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS questions (
      id          VARCHAR(64) PRIMARY KEY,
      user_id     VARCHAR(64) NULL,
      title       VARCHAR(256) DEFAULT '',
      type        VARCHAR(32)  DEFAULT '',
      themes      VARCHAR(512) DEFAULT '[]',
      theme       VARCHAR(50) DEFAULT '',
      composition_size VARCHAR(10) DEFAULT '',
      default_score INT DEFAULT NULL,
      prompt_text TEXT,
      normalized_title VARCHAR(255) DEFAULT '',
      prompt_fingerprint VARCHAR(128) DEFAULT '',
      classification_mode VARCHAR(20) DEFAULT '',
      type_confidence VARCHAR(20) DEFAULT '',
      theme_confidence VARCHAR(20) DEFAULT '',
      needs_review TINYINT(1) NOT NULL DEFAULT 0,
      is_disabled TINYINT(1) NOT NULL DEFAULT 0,
      source_type VARCHAR(20) NOT NULL DEFAULT 'user',
      source_year VARCHAR(16) DEFAULT '',
      source_region VARCHAR(64) DEFAULT '',
      source_paper VARCHAR(64) DEFAULT '',
      source_label VARCHAR(128) DEFAULT '',
      created_at  BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS writings (
      id                   VARCHAR(64) PRIMARY KEY,
      user_id              VARCHAR(64) NOT NULL,
      user_name            VARCHAR(128) NOT NULL,
      class_name           VARCHAR(128) DEFAULT '',
      question_id          VARCHAR(64)  DEFAULT NULL,
      assignment_id        VARCHAR(64)  DEFAULT NULL,
      writing_title        VARCHAR(256) DEFAULT '',
      prompt_text          LONGTEXT,
      selected_type        VARCHAR(32)  DEFAULT '',
      selected_themes      VARCHAR(512) DEFAULT '[]',
      text_snippet         TEXT,
      full_text            LONGTEXT,
      word_count           INT DEFAULT 0,
      max_score            INT NOT NULL,
      feedback             LONGTEXT,
      teacher_comment      TEXT,
      image_data           LONGTEXT,
      submitted_by_teacher VARCHAR(64) DEFAULT NULL,
      source               VARCHAR(20) DEFAULT 'self',
      version_group_id     VARCHAR(64) DEFAULT NULL,
      version_no           INT         NOT NULL DEFAULT 1,
      previous_writing_id  VARCHAR(64) DEFAULT NULL,
      created_at           BIGINT NOT NULL,
      FOREIGN KEY (user_id)      REFERENCES users(id)     ON DELETE CASCADE,
      FOREIGN KEY (question_id)  REFERENCES questions(id) ON DELETE SET NULL,
      INDEX idx_writings_version_group (version_group_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS writing_tasks (
      id            VARCHAR(64) PRIMARY KEY,
      writing_id    VARCHAR(64) NOT NULL,
      task_type     VARCHAR(32) NOT NULL,
      status        VARCHAR(16) NOT NULL,
      queue_name    VARCHAR(32) DEFAULT '',
      payload       LONGTEXT,
      result        LONGTEXT,
      error_message TEXT,
      attempts      INT NOT NULL DEFAULT 0,
      created_at    BIGINT NOT NULL,
      updated_at    BIGINT NOT NULL,
      started_at    BIGINT DEFAULT NULL,
      finished_at   BIGINT DEFAULT NULL,
      UNIQUE KEY uniq_writing_task_type (writing_id, task_type),
      FOREIGN KEY (writing_id) REFERENCES writings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS assignments (
      id               VARCHAR(64) PRIMARY KEY,
      class_id         VARCHAR(64) NOT NULL,
      teacher_id       VARCHAR(64) NOT NULL,
      teacher_name     VARCHAR(128) NOT NULL,
      title            VARCHAR(256) NOT NULL,
      prompt_text      LONGTEXT,
      question_id      VARCHAR(64) DEFAULT NULL,
      question_title   VARCHAR(256) DEFAULT '',
      selected_type    VARCHAR(32) DEFAULT '',
      selected_type_mix VARCHAR(1024) DEFAULT '[]',
      selected_themes  VARCHAR(512) DEFAULT '[]',
      max_score        INT NOT NULL,
      due_at           BIGINT DEFAULT NULL,
      allow_late       TINYINT(1) NOT NULL DEFAULT 0,
      status           VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at       BIGINT NOT NULL,
      updated_at       BIGINT NOT NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS assignment_tasks (
      id               VARCHAR(64) PRIMARY KEY,
      assignment_id    VARCHAR(64) NOT NULL,
      student_id       VARCHAR(64) NOT NULL,
      class_id         VARCHAR(64) NOT NULL,
      status           VARCHAR(20) NOT NULL DEFAULT 'pending',
      writing_id       VARCHAR(64) DEFAULT NULL,
      latest_score     DECIMAL(10,2) DEFAULT NULL,
      submitted_at     BIGINT DEFAULT NULL,
      graded_at        BIGINT DEFAULT NULL,
      viewed_at        BIGINT DEFAULT NULL,
      created_at       BIGINT NOT NULL,
      updated_at       BIGINT NOT NULL,
      UNIQUE KEY uniq_assignment_student (assignment_id, student_id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (writing_id) REFERENCES writings(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
];
