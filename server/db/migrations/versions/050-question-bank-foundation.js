async function getColumnSet(pool, tableName) {
  const [dbRows] = await pool.query('SELECT DATABASE() AS name');
  const database = dbRows?.[0]?.name;
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
  `, [database, tableName]);

  return new Set(columns.map((item) => item.COLUMN_NAME));
}

async function addMissingColumns(pool, tableName, definitions) {
  const existing = await getColumnSet(pool, tableName);
  const clauses = definitions
    .filter(([name]) => !existing.has(name))
    .map(([, definition]) => `ADD COLUMN ${definition}`);

  if (clauses.length) {
    await pool.query(`ALTER TABLE ${tableName} ${clauses.join(',\n      ')}`);
  }
}

async function seedRows(pool, tableName, columns, rows) {
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = VALUES(${column})`)
    .join(', ');

  for (const row of rows) {
    await pool.query(
      `INSERT INTO ${tableName} (${columns.join(', ')})
       VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates}`,
      row
    );
  }
}

export default {
  version: '050',
  name: 'question-bank-foundation',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id          VARCHAR(64) PRIMARY KEY,
        code        VARCHAR(64) NOT NULL,
        name        VARCHAR(128) NOT NULL,
        icon        VARCHAR(64) DEFAULT '',
        color       VARCHAR(32) DEFAULT '',
        description VARCHAR(512) DEFAULT '',
        sort_order  INT NOT NULL DEFAULT 0,
        status      VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        UNIQUE KEY uniq_modules_code (code),
        INDEX idx_modules_status_sort (status, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_systems (
        id          VARCHAR(64) PRIMARY KEY,
        parent_id   VARCHAR(64) DEFAULT NULL,
        name        VARCHAR(128) NOT NULL,
        code        VARCHAR(64) NOT NULL,
        description VARCHAR(512) DEFAULT '',
        sort_order  INT NOT NULL DEFAULT 0,
        status      VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        UNIQUE KEY uniq_learning_systems_code (code),
        INDEX idx_learning_systems_parent_sort (parent_id, sort_order),
        FOREIGN KEY (parent_id) REFERENCES learning_systems(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id          VARCHAR(64) PRIMARY KEY,
        module_id   VARCHAR(64) NOT NULL,
        system_id   VARCHAR(64) DEFAULT NULL,
        parent_id   VARCHAR(64) DEFAULT NULL,
        name        VARCHAR(128) NOT NULL,
        code        VARCHAR(64) NOT NULL,
        description VARCHAR(512) DEFAULT '',
        sort_order  INT NOT NULL DEFAULT 0,
        status      VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        UNIQUE KEY uniq_categories_scope_code (module_id, system_id, parent_id, code),
        INDEX idx_categories_module_system (module_id, system_id),
        INDEX idx_categories_parent_sort (parent_id, sort_order),
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
        FOREIGN KEY (system_id) REFERENCES learning_systems(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS difficulties (
        id          VARCHAR(64) PRIMARY KEY,
        module_id   VARCHAR(64) DEFAULT NULL,
        system_id   VARCHAR(64) DEFAULT NULL,
        name        VARCHAR(128) NOT NULL,
        level       INT NOT NULL DEFAULT 0,
        color       VARCHAR(32) DEFAULT '',
        description VARCHAR(512) DEFAULT '',
        sort_order  INT NOT NULL DEFAULT 0,
        status      VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        UNIQUE KEY uniq_difficulties_scope_level (module_id, system_id, level),
        INDEX idx_difficulties_scope_sort (module_id, system_id, sort_order),
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
        FOREIGN KEY (system_id) REFERENCES learning_systems(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id          VARCHAR(64) PRIMARY KEY,
        name        VARCHAR(128) NOT NULL,
        color       VARCHAR(32) DEFAULT '',
        type        VARCHAR(32) NOT NULL DEFAULT 'general',
        description VARCHAR(512) DEFAULT '',
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        UNIQUE KEY uniq_tags_type_name (type, name),
        INDEX idx_tags_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sources (
        id          VARCHAR(64) PRIMARY KEY,
        name        VARCHAR(160) NOT NULL,
        code        VARCHAR(80) NOT NULL,
        source_type VARCHAR(32) NOT NULL DEFAULT 'exam',
        year        VARCHAR(16) DEFAULT '',
        region      VARCHAR(64) DEFAULT '',
        publisher   VARCHAR(128) DEFAULT '',
        description VARCHAR(512) DEFAULT '',
        status      VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        UNIQUE KEY uniq_sources_code (code),
        INDEX idx_sources_type_year (source_type, year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id             VARCHAR(64) PRIMARY KEY,
        module_id      VARCHAR(64) DEFAULT NULL,
        title          VARCHAR(256) NOT NULL,
        material_type  VARCHAR(32) NOT NULL,
        content        LONGTEXT,
        audio_url      VARCHAR(1024) DEFAULT '',
        video_url      VARCHAR(1024) DEFAULT '',
        image_url      VARCHAR(1024) DEFAULT '',
        attachment_url VARCHAR(1024) DEFAULT '',
        word_count     INT DEFAULT NULL,
        duration       INT DEFAULT NULL,
        source_id      VARCHAR(64) DEFAULT NULL,
        source         VARCHAR(256) DEFAULT '',
        status         VARCHAR(16) NOT NULL DEFAULT 'active',
        created_by     VARCHAR(64) DEFAULT NULL,
        updated_by     VARCHAR(64) DEFAULT NULL,
        created_at     BIGINT NOT NULL,
        updated_at     BIGINT NOT NULL,
        INDEX idx_materials_module_type (module_id, material_type),
        INDEX idx_materials_source (source_id),
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL,
        FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_points (
        id          VARCHAR(64) PRIMARY KEY,
        module_id   VARCHAR(64) DEFAULT NULL,
        parent_id   VARCHAR(64) DEFAULT NULL,
        name        VARCHAR(128) NOT NULL,
        description VARCHAR(512) DEFAULT '',
        sort_order  INT NOT NULL DEFAULT 0,
        status      VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        INDEX idx_knowledge_points_module_parent (module_id, parent_id),
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES knowledge_points(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await addMissingColumns(pool, 'questions', [
      ['module_id', 'module_id VARCHAR(64) DEFAULT NULL'],
      ['system_id', 'system_id VARCHAR(64) DEFAULT NULL'],
      ['category_id', 'category_id VARCHAR(64) DEFAULT NULL'],
      ['difficulty_id', 'difficulty_id VARCHAR(64) DEFAULT NULL'],
      ['question_type', 'question_type VARCHAR(64) DEFAULT NULL'],
      ['content', 'content LONGTEXT'],
      ['material_id', 'material_id VARCHAR(64) DEFAULT NULL'],
      ['answer', 'answer LONGTEXT'],
      ['analysis', 'analysis LONGTEXT'],
      ['estimated_time', 'estimated_time INT DEFAULT NULL'],
      ['score', 'score DECIMAL(10,2) DEFAULT NULL'],
      ['source_id', 'source_id VARCHAR(64) DEFAULT NULL'],
      ['is_official', 'is_official TINYINT(1) NOT NULL DEFAULT 0'],
      ['status', "status VARCHAR(20) NOT NULL DEFAULT 'active'"],
      ['created_by', 'created_by VARCHAR(64) DEFAULT NULL'],
      ['updated_by', 'updated_by VARCHAR(64) DEFAULT NULL'],
      ['updated_at', 'updated_at BIGINT DEFAULT NULL'],
    ]);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_tags (
        question_id VARCHAR(64) NOT NULL,
        tag_id      VARCHAR(64) NOT NULL,
        created_at  BIGINT NOT NULL,
        PRIMARY KEY (question_id, tag_id),
        INDEX idx_question_tags_tag (tag_id),
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_materials (
        question_id VARCHAR(64) NOT NULL,
        material_id VARCHAR(64) NOT NULL,
        role        VARCHAR(32) NOT NULL DEFAULT 'primary',
        sort_order  INT NOT NULL DEFAULT 0,
        created_at  BIGINT NOT NULL,
        PRIMARY KEY (question_id, material_id),
        INDEX idx_question_materials_material (material_id),
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_knowledge_points (
        question_id        VARCHAR(64) NOT NULL,
        knowledge_point_id VARCHAR(64) NOT NULL,
        created_at         BIGINT NOT NULL,
        PRIMARY KEY (question_id, knowledge_point_id),
        INDEX idx_qkp_point (knowledge_point_id),
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS writing_questions (
        question_id      VARCHAR(64) PRIMARY KEY,
        prompt           LONGTEXT,
        requirements     JSON DEFAULT NULL,
        sample_answer    LONGTEXT,
        scoring_rubric   JSON DEFAULT NULL,
        min_words        INT DEFAULT NULL,
        max_words        INT DEFAULT NULL,
        updated_at       BIGINT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_questions (
        question_id    VARCHAR(64) PRIMARY KEY,
        stem           LONGTEXT,
        options        JSON DEFAULT NULL,
        correct_answer LONGTEXT,
        explanation    LONGTEXT,
        updated_at     BIGINT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS listening_questions (
        question_id    VARCHAR(64) PRIMARY KEY,
        stem           LONGTEXT,
        options        JSON DEFAULT NULL,
        transcript     LONGTEXT,
        timeline       JSON DEFAULT NULL,
        correct_answer LONGTEXT,
        explanation    LONGTEXT,
        updated_at     BIGINT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS translation_questions (
        question_id      VARCHAR(64) PRIMARY KEY,
        source_language  VARCHAR(32) NOT NULL DEFAULT 'en',
        target_language  VARCHAR(32) NOT NULL DEFAULT 'zh',
        source_text      LONGTEXT,
        reference_answer LONGTEXT,
        scoring_rubric   JSON DEFAULT NULL,
        updated_at       BIGINT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS speaking_questions (
        question_id      VARCHAR(64) PRIMARY KEY,
        prompt           LONGTEXT,
        sample_answer    LONGTEXT,
        scoring_rubric   JSON DEFAULT NULL,
        prep_time        INT DEFAULT NULL,
        response_time    INT DEFAULT NULL,
        updated_at       BIGINT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grammar_questions (
        question_id    VARCHAR(64) PRIMARY KEY,
        stem           LONGTEXT,
        options        JSON DEFAULT NULL,
        correct_answer LONGTEXT,
        explanation    LONGTEXT,
        grammar_focus  VARCHAR(128) DEFAULT '',
        updated_at     BIGINT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vocabulary_questions (
        question_id    VARCHAR(64) PRIMARY KEY,
        stem           LONGTEXT,
        options        JSON DEFAULT NULL,
        target_word    VARCHAR(128) DEFAULT '',
        correct_answer LONGTEXT,
        explanation    LONGTEXT,
        updated_at     BIGINT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS phonetics_questions (
        question_id     VARCHAR(64) PRIMARY KEY,
        phoneme         VARCHAR(64) DEFAULT '',
        sample_text     VARCHAR(512) DEFAULT '',
        audio_url       VARCHAR(1024) DEFAULT '',
        scoring_rules   JSON DEFAULT NULL,
        updated_at      BIGINT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_collections (
        id          VARCHAR(64) PRIMARY KEY,
        teacher_id  VARCHAR(64) NOT NULL,
        title       VARCHAR(160) NOT NULL,
        description VARCHAR(512) DEFAULT '',
        status      VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        INDEX idx_question_collections_teacher (teacher_id, status),
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_questions (
        collection_id VARCHAR(64) NOT NULL,
        question_id   VARCHAR(64) NOT NULL,
        sort_order    INT NOT NULL DEFAULT 0,
        created_at    BIGINT NOT NULL,
        PRIMARY KEY (collection_id, question_id),
        INDEX idx_collection_questions_question (question_id),
        FOREIGN KEY (collection_id) REFERENCES question_collections(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await addMissingColumns(pool, 'assignments', [
      ['description', 'description TEXT'],
      ['start_time', 'start_time BIGINT DEFAULT NULL'],
      ['end_time', 'end_time BIGINT DEFAULT NULL'],
    ]);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_questions (
        assignment_id VARCHAR(64) NOT NULL,
        question_id   VARCHAR(64) NOT NULL,
        score         DECIMAL(10,2) DEFAULT NULL,
        sort_order    INT NOT NULL DEFAULT 0,
        created_at    BIGINT NOT NULL,
        PRIMARY KEY (assignment_id, question_id),
        INDEX idx_assignment_questions_question (question_id),
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_answers (
        id            VARCHAR(64) PRIMARY KEY,
        assignment_id VARCHAR(64) DEFAULT NULL,
        question_id   VARCHAR(64) NOT NULL,
        student_id    VARCHAR(64) NOT NULL,
        answer        LONGTEXT,
        score         DECIMAL(10,2) DEFAULT NULL,
        feedback      LONGTEXT,
        submitted_at  BIGINT DEFAULT NULL,
        created_at    BIGINT NOT NULL,
        updated_at    BIGINT NOT NULL,
        INDEX idx_student_answers_student (student_id, submitted_at),
        INDEX idx_student_answers_assignment (assignment_id, question_id),
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_generation_logs (
        id              VARCHAR(64) PRIMARY KEY,
        user_id         VARCHAR(64) DEFAULT NULL,
        module_id       VARCHAR(64) DEFAULT NULL,
        system_id       VARCHAR(64) DEFAULT NULL,
        prompt          LONGTEXT,
        model           VARCHAR(128) DEFAULT '',
        generation_type VARCHAR(32) NOT NULL DEFAULT 'question',
        result_json     JSON DEFAULT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'generated',
        reviewed_by     VARCHAR(64) DEFAULT NULL,
        reviewed_at     BIGINT DEFAULT NULL,
        created_at      BIGINT NOT NULL,
        updated_at      BIGINT NOT NULL,
        INDEX idx_ai_generation_logs_user_created (user_id, created_at),
        INDEX idx_ai_generation_logs_module (module_id, system_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL,
        FOREIGN KEY (system_id) REFERENCES learning_systems(id) ON DELETE SET NULL,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_generated_questions (
        generation_log_id VARCHAR(64) NOT NULL,
        question_id       VARCHAR(64) NOT NULL,
        created_at        BIGINT NOT NULL,
        PRIMARY KEY (generation_log_id, question_id),
        FOREIGN KEY (generation_log_id) REFERENCES ai_generation_logs(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const now = Date.now();
    await seedRows(pool, 'modules', [
      'id', 'code', 'name', 'icon', 'color', 'description', 'sort_order', 'status', 'created_at', 'updated_at',
    ], [
      ['module-writing', 'writing', '写作', 'pen-tool', '#2563eb', '写作训练与批改题库', 10, 'active', now, now],
      ['module-reading', 'reading', '阅读', 'book-open', '#16a34a', '阅读理解与语篇题库', 20, 'active', now, now],
      ['module-grammar', 'grammar', '语法', 'braces', '#7c3aed', '语法知识与练习题库', 30, 'active', now, now],
      ['module-vocabulary', 'vocabulary', '词汇', 'badge-a', '#ea580c', '词汇理解与运用题库', 40, 'active', now, now],
      ['module-listening', 'listening', '听力', 'headphones', '#0891b2', '听力材料与题库', 50, 'active', now, now],
      ['module-phonetics', 'phonetics', '音标', 'audio-lines', '#db2777', '语音音素与发音题库', 60, 'active', now, now],
      ['module-speaking', 'speaking', '口语', 'mic', '#059669', '口语表达与测评题库', 70, 'active', now, now],
      ['module-translation', 'translation', '翻译', 'languages', '#4f46e5', '翻译训练题库', 80, 'active', now, now],
    ]);

    await seedRows(pool, 'learning_systems', [
      'id', 'parent_id', 'name', 'code', 'description', 'sort_order', 'status', 'created_at', 'updated_at',
    ], [
      ['system-k12', null, '基础教育', 'k12', '', 10, 'active', now, now],
      ['system-primary', 'system-k12', '小学', 'primary', '', 11, 'active', now, now],
      ['system-junior', 'system-k12', '初中', 'junior', '', 12, 'active', now, now],
      ['system-senior', 'system-k12', '高中', 'senior', '', 13, 'active', now, now],
      ['system-college', null, '大学英语', 'college-english', '', 20, 'active', now, now],
      ['system-college-general', 'system-college', '综合大学英语', 'college-general', '', 21, 'active', now, now],
      ['system-cet4', 'system-college', 'CET4', 'cet4', '', 22, 'active', now, now],
      ['system-cet6', 'system-college', 'CET6', 'cet6', '', 23, 'active', now, now],
      ['system-english-major', null, '英语专业', 'english-major', '', 30, 'active', now, now],
      ['system-tem4', 'system-english-major', 'TEM4', 'tem4', '', 31, 'active', now, now],
      ['system-tem8', 'system-english-major', 'TEM8', 'tem8', '', 32, 'active', now, now],
      ['system-domestic-entrance', null, '国内升学', 'domestic-entrance', '', 40, 'active', now, now],
      ['system-postgraduate', 'system-domestic-entrance', '考研', 'postgraduate', '', 41, 'active', now, now],
      ['system-doctoral', 'system-domestic-entrance', '考博', 'doctoral', '', 42, 'active', now, now],
      ['system-international', null, '国际考试', 'international-exams', '', 50, 'active', now, now],
      ['system-ielts', 'system-international', 'IELTS', 'ielts', '', 51, 'active', now, now],
      ['system-toefl', 'system-international', 'TOEFL', 'toefl', '', 52, 'active', now, now],
      ['system-gre', 'system-international', 'GRE', 'gre', '', 53, 'active', now, now],
      ['system-gmat', 'system-international', 'GMAT', 'gmat', '', 54, 'active', now, now],
      ['system-sat', 'system-international', 'SAT', 'sat', '', 55, 'active', now, now],
      ['system-pte', 'system-international', 'PTE', 'pte', '', 56, 'active', now, now],
    ]);

    await seedRows(pool, 'difficulties', [
      'id', 'module_id', 'system_id', 'name', 'level', 'color', 'description', 'sort_order', 'status', 'created_at', 'updated_at',
    ], [
      ['difficulty-k12-easy', null, 'system-k12', '简单', 1, '#22c55e', '', 10, 'active', now, now],
      ['difficulty-k12-medium', null, 'system-k12', '中等', 2, '#f59e0b', '', 20, 'active', now, now],
      ['difficulty-k12-hard', null, 'system-k12', '困难', 3, '#ef4444', '', 30, 'active', now, now],
      ['difficulty-ielts-band5', null, 'system-ielts', 'Band 5', 5, '#38bdf8', '', 50, 'active', now, now],
      ['difficulty-ielts-band6', null, 'system-ielts', 'Band 6', 6, '#22c55e', '', 60, 'active', now, now],
      ['difficulty-ielts-band7', null, 'system-ielts', 'Band 7', 7, '#f59e0b', '', 70, 'active', now, now],
      ['difficulty-ielts-band8', null, 'system-ielts', 'Band 8', 8, '#ef4444', '', 80, 'active', now, now],
    ]);

    await seedRows(pool, 'tags', [
      'id', 'name', 'color', 'type', 'description', 'created_at', 'updated_at',
    ], [
      ['tag-environment', '环境', '#16a34a', 'topic', '', now, now],
      ['tag-education', '教育', '#2563eb', 'topic', '', now, now],
      ['tag-technology', '科技', '#7c3aed', 'topic', '', now, now],
      ['tag-grammar', '语法', '#ea580c', 'skill', '', now, now],
      ['tag-high-frequency', '高频', '#dc2626', 'meta', '', now, now],
      ['tag-official', '官方真题', '#0f766e', 'source', '', now, now],
      ['tag-ai-generated', 'AI生成', '#9333ea', 'source', '', now, now],
    ]);
  },
};
