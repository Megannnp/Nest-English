/**
 * Migration 040: Nest Camp course center MVP.
 */
export default {
  version: '040',
  name: 'nest-camp',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id           VARCHAR(64) PRIMARY KEY,
        title        VARCHAR(160) NOT NULL,
        cover_url    VARCHAR(1024) DEFAULT '',
        summary      VARCHAR(512) NOT NULL DEFAULT '',
        description  TEXT,
        suitable_for JSON,
        outline      JSON,
        starts_at    BIGINT DEFAULT NULL,
        price_cents  INT NOT NULL DEFAULT 0,
        currency     VARCHAR(8) NOT NULL DEFAULT 'CNY',
        tags         JSON,
        status       VARCHAR(24) NOT NULL DEFAULT 'published',
        live_url     VARCHAR(1024) DEFAULT '',
        created_at   BIGINT NOT NULL,
        updated_at   BIGINT NOT NULL,
        INDEX idx_courses_status_created (status, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_lessons (
        id          VARCHAR(64) PRIMARY KEY,
        course_id   VARCHAR(64) NOT NULL,
        title       VARCHAR(160) NOT NULL,
        lesson_type VARCHAR(32) NOT NULL DEFAULT 'live',
        starts_at   BIGINT DEFAULT NULL,
        live_url    VARCHAR(1024) DEFAULT '',
        replay_url  VARCHAR(1024) DEFAULT '',
        sort_order  INT NOT NULL DEFAULT 0,
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        INDEX idx_course_lessons_course_sort (course_id, sort_order),
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_materials (
        id          VARCHAR(64) PRIMARY KEY,
        course_id   VARCHAR(64) NOT NULL,
        lesson_id   VARCHAR(64) DEFAULT NULL,
        title       VARCHAR(160) NOT NULL,
        material_type VARCHAR(32) NOT NULL DEFAULT 'pdf',
        url         VARCHAR(1024) DEFAULT '',
        sort_order  INT NOT NULL DEFAULT 0,
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        INDEX idx_course_materials_course_sort (course_id, sort_order),
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id             VARCHAR(64) PRIMARY KEY,
        user_id        VARCHAR(64) NOT NULL,
        course_id      VARCHAR(64) NOT NULL,
        amount_cents   INT NOT NULL DEFAULT 0,
        currency       VARCHAR(8) NOT NULL DEFAULT 'CNY',
        payment_method VARCHAR(32) NOT NULL DEFAULT 'mock',
        status         VARCHAR(24) NOT NULL DEFAULT 'paid',
        created_at     BIGINT NOT NULL,
        paid_at        BIGINT DEFAULT NULL,
        updated_at     BIGINT NOT NULL,
        INDEX idx_orders_user_created (user_id, created_at),
        INDEX idx_orders_course (course_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id          VARCHAR(64) PRIMARY KEY,
        user_id     VARCHAR(64) NOT NULL,
        course_id   VARCHAR(64) NOT NULL,
        source_type VARCHAR(32) NOT NULL DEFAULT 'mock_payment',
        source_id   VARCHAR(64) DEFAULT '',
        status      VARCHAR(24) NOT NULL DEFAULT 'active',
        enrolled_at BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        UNIQUE KEY uq_enrollments_user_course (user_id, course_id),
        INDEX idx_enrollments_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_redemption_codes (
        id          VARCHAR(64) PRIMARY KEY,
        code        VARCHAR(64) NOT NULL,
        course_id   VARCHAR(64) NOT NULL,
        status      VARCHAR(24) NOT NULL DEFAULT 'active',
        max_uses    INT NOT NULL DEFAULT 1,
        used_count  INT NOT NULL DEFAULT 0,
        expires_at  BIGINT DEFAULT NULL,
        created_at  BIGINT NOT NULL,
        updated_at  BIGINT NOT NULL,
        UNIQUE KEY uq_course_redemption_code (code),
        INDEX idx_course_redemption_course (course_id),
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_progress (
        id              VARCHAR(64) PRIMARY KEY,
        user_id         VARCHAR(64) NOT NULL,
        course_id       VARCHAR(64) NOT NULL,
        lesson_id       VARCHAR(64) DEFAULT NULL,
        progress_percent INT NOT NULL DEFAULT 0,
        last_record     VARCHAR(512) DEFAULT '',
        last_studied_at BIGINT DEFAULT NULL,
        updated_at      BIGINT NOT NULL,
        UNIQUE KEY uq_course_progress_user_course (user_id, course_id),
        INDEX idx_course_progress_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const now = Date.now();
    const courses = [
      [
        'camp-writing-foundation',
        '写作进阶营 · 句子到篇章',
        '',
        '围绕审题、句子升级、段落展开和反馈订正，形成一套可持续复用的写作训练节奏。',
        '适合希望从“会写句子”过渡到“写清楚一篇文章”的学习者。课程包含直播讲解、回放复盘、资料包、作业和 AI 练习入口。',
        JSON.stringify(['初高中英语写作基础薄弱的学生', '需要建立审题和段落表达方法的学习者', '希望配合 AI 批改形成订正闭环的用户']),
        JSON.stringify(['第 1 讲：审题与立意', '第 2 讲：句子升级与连接', '第 3 讲：段落展开', '第 4 讲：整篇复盘与个人订正']),
        Date.UTC(2026, 6, 12, 12),
        39900,
        JSON.stringify(['推荐', '最新']),
        'published',
        'https://meeting.tencent.com/',
      ],
      [
        'camp-reading-bootcamp',
        '阅读精读营 · 读懂长难句',
        '',
        '用真实语篇训练定位、推断、结构梳理和错题复盘，把阅读从刷题变成可追踪的能力增长。',
        '课程强调当天直播任务和课后回放，搭配资料与学习记录帮助学生知道今天该学什么。',
        JSON.stringify(['阅读正确率不稳定的学生', '需要补足长难句和篇章结构意识的学习者', '备考阶段需要高效复盘的人']),
        JSON.stringify(['第 1 讲：信息定位', '第 2 讲：长难句拆解', '第 3 讲：主旨与结构', '第 4 讲：错题复盘']),
        Date.UTC(2026, 6, 20, 11),
        29900,
        JSON.stringify(['热门']),
        'published',
        'https://meeting.tencent.com/',
      ],
      [
        'camp-speaking-lab',
        'AI 口语陪练营',
        '',
        '围绕听说输入、跟读纠音和主题表达，预留 AI 练习入口，先完成课程承载与学习交付闭环。',
        '第一阶段开放预约和课程资料，直播与 AI 练习入口先以外部链接和站内占位承载。',
        JSON.stringify(['想提高开口频率的学习者', '需要固定主题练习节奏的学生']),
        JSON.stringify(['开营导学：建立口语记录', '主题表达：校园生活', '跟读纠音：语音语调', '成果展示：个人表达稿']),
        Date.UTC(2026, 7, 8, 12),
        19900,
        JSON.stringify(['即将上线']),
        'coming_soon',
        'https://meeting.tencent.com/',
      ],
    ];

    for (const item of courses) {
      await pool.query(
        `INSERT INTO courses
          (id, title, cover_url, summary, description, suitable_for, outline, starts_at, price_cents, currency, tags, status, live_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CNY', ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          title = VALUES(title), summary = VALUES(summary), description = VALUES(description),
          suitable_for = VALUES(suitable_for), outline = VALUES(outline), starts_at = VALUES(starts_at),
          price_cents = VALUES(price_cents), tags = VALUES(tags), status = VALUES(status),
          live_url = VALUES(live_url), updated_at = VALUES(updated_at)`,
        [...item, now, now]
      );
    }

    const lessons = [
      ['lesson-writing-1', 'camp-writing-foundation', '直播 1：审题与立意', Date.UTC(2026, 6, 12, 12), 1],
      ['lesson-writing-2', 'camp-writing-foundation', '直播 2：句子升级与连接', Date.UTC(2026, 6, 14, 12), 2],
      ['lesson-reading-1', 'camp-reading-bootcamp', '直播 1：信息定位', Date.UTC(2026, 6, 20, 11), 1],
      ['lesson-reading-2', 'camp-reading-bootcamp', '直播 2：长难句拆解', Date.UTC(2026, 6, 22, 11), 2],
      ['lesson-speaking-1', 'camp-speaking-lab', '开营导学：建立口语记录', Date.UTC(2026, 7, 8, 12), 1],
    ];

    for (const lesson of lessons) {
      await pool.query(
        `INSERT INTO course_lessons
          (id, course_id, title, lesson_type, starts_at, live_url, replay_url, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 'live', ?, 'https://meeting.tencent.com/', '', ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          title = VALUES(title), starts_at = VALUES(starts_at), live_url = VALUES(live_url),
          sort_order = VALUES(sort_order), updated_at = VALUES(updated_at)`,
        [...lesson, now, now]
      );
    }

    const materials = [
      ['material-writing-guide', 'camp-writing-foundation', '写作营课前学习单', 'pdf', '', 1],
      ['material-writing-homework', 'camp-writing-foundation', '今日作业模板', 'doc', '', 2],
      ['material-reading-guide', 'camp-reading-bootcamp', '精读营长难句笔记', 'pdf', '', 1],
      ['material-speaking-guide', 'camp-speaking-lab', '口语记录表', 'sheet', '', 1],
    ];

    for (const material of materials) {
      await pool.query(
        `INSERT INTO course_materials
          (id, course_id, title, material_type, url, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          title = VALUES(title), material_type = VALUES(material_type), url = VALUES(url),
          sort_order = VALUES(sort_order), updated_at = VALUES(updated_at)`,
        [...material, now, now]
      );
    }

    await pool.query(
      `INSERT INTO course_redemption_codes
        (id, code, course_id, status, max_uses, used_count, expires_at, created_at, updated_at)
       VALUES ('redeem-demo-writing', 'NESTCAMP2026', 'camp-writing-foundation', 'active', 200, 0, NULL, ?, ?)
       ON DUPLICATE KEY UPDATE course_id = VALUES(course_id), status = VALUES(status), max_uses = VALUES(max_uses), updated_at = VALUES(updated_at)`,
      [now, now]
    );
  },
};
