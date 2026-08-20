/* eslint-disable complexity */
import './testSetup.js';
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

const state = {
  courses: new Map(),
  lessons: new Map(),
  materials: new Map(),
  enrollments: new Map(),
  progress: new Map(),
  redemptions: new Map(),
  orders: [],
  deletedKeys: [],
  deletedUrls: [],
  learningEvents: [],
  failCoverUpdate: false,
};

function enrollmentKey(userId, courseId) {
  return `${userId}:${courseId}`;
}

function resetState() {
  state.courses = new Map([
    ['published-course', { id: 'published-course', title: 'Published', status: 'published', price_cents: 1000, currency: 'CNY' }],
    ['coming-course', { id: 'coming-course', title: 'Coming', status: 'coming_soon', price_cents: 1000, currency: 'CNY' }],
    ['draft-course', { id: 'draft-course', title: 'Draft', status: 'draft', price_cents: 1000, currency: 'CNY' }],
    ['hidden-course', { id: 'hidden-course', title: 'Hidden', status: 'hidden', price_cents: 1000, currency: 'CNY' }],
    ['archived-course', { id: 'archived-course', title: 'Archived', status: 'archived', price_cents: 1000, currency: 'CNY' }],
  ]);
  state.lessons = new Map();
  state.materials = new Map();
  state.enrollments = new Map();
  state.progress = new Map();
  state.redemptions = new Map([
    ['DRAFTCODE', { id: 'redeem-draft', code: 'DRAFTCODE', course_id: 'draft-course', status: 'active', max_uses: 10, used_count: 0, expires_at: null }],
    ['PUBCODE', { id: 'redeem-pub', code: 'PUBCODE', course_id: 'published-course', status: 'active', max_uses: 10, used_count: 0, expires_at: null }],
  ]);
  state.orders = [];
  state.deletedKeys = [];
  state.deletedUrls = [];
  state.learningEvents = [];
  state.failCoverUpdate = false;
}

function normalizeEnrollment(row) {
  return row ? [[row]] : [[]];
}

async function query(sql, params = []) {
  if (sql.includes('SELECT * FROM courses WHERE id = ?')) {
    return normalizeEnrollment(state.courses.get(params[0]) || null);
  }
  if (sql.includes('SELECT * FROM course_lessons')) {
    return [state.lessons.get(params[0]) || []];
  }
  if (sql.includes('SELECT * FROM course_materials')) {
    return [state.materials.get(params[0]) || []];
  }
  if (sql.includes('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?')) {
    return normalizeEnrollment(state.enrollments.get(enrollmentKey(params[0], params[1])) || null);
  }
  if (sql.includes('SELECT * FROM course_progress WHERE user_id = ? AND course_id = ?')) {
    return normalizeEnrollment(state.progress.get(enrollmentKey(params[0], params[1])) || null);
  }
  if (sql.includes('SELECT * FROM course_redemption_codes WHERE code = ?')) {
    return normalizeEnrollment(state.redemptions.get(params[0]) || null);
  }
  if (sql.includes('SELECT id FROM course_redemption_codes WHERE code = ?')) {
    const item = state.redemptions.get(params[0]);
    return [[item ? { id: item.id } : undefined].filter(Boolean)];
  }
  if (sql.includes('COUNT(DISTINCT e.id) AS enrollment_count')) {
    const courseId = params[0];
    const enrollments = [...state.enrollments.values()].filter((item) => item.course_id === courseId && item.status === 'active');
    const revenue = state.orders
      .filter((item) => item.courseId === courseId)
      .reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
    return [[{
      enrollment_count: enrollments.length,
      redemption_enrollments: enrollments.filter((item) => item.source_type === 'redemption_code').length,
      average_progress: 0,
      revenue_cents: revenue,
    }]];
  }
  if (sql.includes('FROM enrollments e') && sql.includes('LEFT JOIN users u')) {
    return [[...state.enrollments.values()]
      .filter((item) => item.course_id === params[0] && item.status === 'active')
      .map((item) => ({
        ...item,
        real_name: 'Student',
        email: 'student@example.com',
        phone: '',
        role: 'student',
        account_code: '100001',
        progress_percent: 0,
      }))];
  }
  if (sql.includes('FROM course_redemption_codes') && sql.includes('WHERE course_id = ?')) {
    return [[...state.redemptions.values()].filter((item) => item.course_id === params[0])];
  }
  if (sql.includes('INSERT INTO orders')) {
    state.orders.push({ id: params[0], userId: params[1], courseId: params[2], amountCents: params[3] });
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('INSERT INTO course_redemption_codes')) {
    const row = {
      id: params[0],
      code: params[1],
      course_id: params[2],
      status: 'active',
      max_uses: params[3],
      used_count: 0,
      expires_at: params[4],
      created_at: params[5],
      updated_at: params[6],
    };
    state.redemptions.set(row.code, row);
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('INSERT INTO enrollments')) {
    const row = {
      id: params[0],
      user_id: params[1],
      course_id: params[2],
      source_type: params[3],
      source_id: params[4],
      status: 'active',
      enrolled_at: params[5],
      updated_at: params[6],
    };
    state.enrollments.set(enrollmentKey(row.user_id, row.course_id), row);
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('INSERT INTO course_progress')) {
    const row = params.length === 4
      ? {
          id: params[0],
          user_id: params[1],
          course_id: params[2],
          lesson_id: null,
          progress_percent: 0,
          last_record: '已开通课程，准备开始学习',
          last_studied_at: null,
          updated_at: params[3],
        }
      : {
          id: params[0],
          user_id: params[1],
          course_id: params[2],
          lesson_id: params[3],
          progress_percent: params[4],
          last_record: params[5],
          last_studied_at: params[6],
          updated_at: params[7],
        };
    const key = enrollmentKey(row.user_id, row.course_id);
    const existing = state.progress.get(key);
    state.progress.set(key, existing ? {
      ...existing,
      lesson_id: row.lesson_id || existing.lesson_id,
      progress_percent: Math.max(Number(existing.progress_percent || 0), Number(row.progress_percent || 0)),
      last_record: row.last_record,
      last_studied_at: row.last_studied_at,
      updated_at: row.updated_at,
    } : row);
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('UPDATE course_redemption_codes SET used_count = used_count + 1')) {
    const redemption = [...state.redemptions.values()].find((item) => item.id === params[1]);
    if (redemption) redemption.used_count += 1;
    return [{ affectedRows: redemption ? 1 : 0 }];
  }
  if (sql.includes('UPDATE course_redemption_codes SET status = ?')) {
    const redemption = [...state.redemptions.values()].find((item) => item.id === params[2] && item.course_id === params[3]);
    if (redemption) redemption.status = params[0];
    return [{ affectedRows: redemption ? 1 : 0 }];
  }
  if (sql.includes('UPDATE courses SET cover_url = ?')) {
    if (state.failCoverUpdate) throw new Error('cover update failed');
    const course = state.courses.get(params[2]);
    if (course) course.cover_url = params[0];
    return [{ affectedRows: course ? 1 : 0 }];
  }
  if (sql.includes('UPDATE courses')) {
    const course = state.courses.get(params[12]);
    if (course) {
      Object.assign(course, {
        title: params[0],
        cover_url: params[1],
        summary: params[2],
        description: params[3],
        suitable_for: params[4],
        outline: params[5],
        starts_at: params[6],
        price_cents: params[7],
        tags: params[8],
        status: params[9],
        live_url: params[10],
        updated_at: params[11],
      });
    }
    return [{ affectedRows: course ? 1 : 0 }];
  }
  if (sql.includes('DELETE FROM course_materials WHERE course_id = ?')) {
    state.materials.set(params[0], []);
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('DELETE FROM course_lessons WHERE course_id = ?')) {
    state.lessons.set(params[0], []);
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('INSERT INTO course_lessons')) {
    const row = {
      id: params[0],
      course_id: params[1],
      title: params[2],
      starts_at: params[3],
      live_url: params[4],
      replay_url: params[5],
      sort_order: params[6],
    };
    state.lessons.set(row.course_id, [...(state.lessons.get(row.course_id) || []), row]);
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('INSERT INTO course_materials')) {
    const row = {
      id: params[0],
      course_id: params[1],
      lesson_id: params[2],
      title: params[3],
      material_type: params[4],
      url: params[5],
      sort_order: params[6],
    };
    state.materials.set(row.course_id, [...(state.materials.get(row.course_id) || []), row]);
    return [{ affectedRows: 1 }];
  }
  throw new Error(`Unexpected SQL: ${sql}`);
}

const connection = {
  query,
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {},
};

mock.module('../db/database.js', {
  defaultExport: {
    pool: {
      query,
      getConnection: async () => connection,
    },
  },
});

mock.module('../utils/nanoid.js', {
  namedExports: { nanoid: () => `id-${state.orders.length}-${state.enrollments.size}` },
  defaultExport: () => `id-${state.orders.length}-${state.enrollments.size}`,
});

mock.module('../utils/oss.js', {
  namedExports: {
    uploadBufferToOSS: async (key) => `https://bucket.oss-cn-test.aliyuncs.com/${key}`,
    deleteKeyFromOSS: async (key) => { state.deletedKeys.push(key); },
    deleteFromOSS: async (url) => { state.deletedUrls.push(url); },
  },
});

mock.module('../services/learningEventService.js', {
  namedExports: {
    recordLearningEvent: async (event) => {
      state.learningEvents.push(event);
    },
  },
});

const {
  createTeacherCampRedemptionCode,
  getCampCourseDetail,
  getTeacherCampCourseOperations,
  mockPayCourse,
  redeemCampCourse,
  saveTeacherCampCourseContent,
  saveTeacherCampCourse,
  updateMyCampCourseProgress,
  updateTeacherCampRedemptionCode,
  uploadTeacherCampCourseCover,
} = await import('../services/campService.js');

beforeEach(() => {
  resetState();
});

test('draft, hidden, and archived courses are not visible', async () => {
  for (const courseId of ['draft-course', 'hidden-course', 'archived-course']) {
    await assert.rejects(
      () => getCampCourseDetail({ userId: null, courseId }),
      (error) => error.status === 404
    );
  }
});

test('non-purchasable courses cannot be opened through mock payment', async () => {
  for (const courseId of ['coming-course', 'draft-course', 'hidden-course', 'archived-course']) {
    await assert.rejects(
      () => mockPayCourse({ userId: 'u1', courseId }),
      (error) => error.status === 409
    );
  }
  assert.equal(state.orders.length, 0);
});

test('redemption code cannot open an unpublished course', async () => {
  await assert.rejects(
    () => redeemCampCourse({ userId: 'u1', code: 'DRAFTCODE' }),
    (error) => error.status === 409
  );
  assert.equal(state.redemptions.get('DRAFTCODE').used_count, 0);
  assert.equal(state.enrollments.size, 0);
});

test('repeated redemption does not increment used count twice', async () => {
  const first = await redeemCampCourse({ userId: 'u1', code: 'PUBCODE' });
  const second = await redeemCampCourse({ userId: 'u1', code: 'PUBCODE' });

  assert.equal(first.alreadyEnrolled, false);
  assert.equal(second.alreadyEnrolled, true);
  assert.equal(state.redemptions.get('PUBCODE').used_count, 1);
  assert.equal(state.enrollments.size, 1);
  assert.deepEqual(state.learningEvents, [{
    userId: 'u1',
    module: 'camp',
    eventType: 'course_enrolled',
    metadata: { courseId: 'published-course', sourceType: 'redemption_code' },
  }]);
});

test('mock payment records camp enrollment as a learning event', async () => {
  await mockPayCourse({ userId: 'u1', courseId: 'published-course' });

  assert.deepEqual(state.learningEvents, [{
    userId: 'u1',
    module: 'camp',
    eventType: 'course_enrolled',
    metadata: { courseId: 'published-course', sourceType: 'mock_payment' },
  }]);
});

test('camp progress requires enrollment and records learning activity', async () => {
  await assert.rejects(
    () => updateMyCampCourseProgress({ userId: 'u1', courseId: 'published-course' }),
    (error) => error.status === 403
  );

  state.lessons.set('published-course', [
    { id: 'lesson-1', course_id: 'published-course', title: '开营课', starts_at: Date.now(), live_url: '', sort_order: 1 },
    { id: 'lesson-2', course_id: 'published-course', title: '复盘课', starts_at: Date.now(), live_url: '', sort_order: 2 },
  ]);
  state.materials.set('published-course', [
    { id: 'practice-1', course_id: 'published-course', lesson_id: 'lesson-1', title: 'AI 练习', material_type: 'ai_practice', url: 'writing', sort_order: 1 },
  ]);
  await mockPayCourse({ userId: 'u1', courseId: 'published-course' });
  state.learningEvents = [];

  const progress = await updateMyCampCourseProgress({
    userId: 'u1',
    courseId: 'published-course',
    lessonId: 'lesson-1',
    action: 'ai_practice',
  });

  assert.equal(progress.progressPercent, 34);
  assert.equal(progress.lessonId, 'lesson-1');
  assert.deepEqual(state.learningEvents, [{
    userId: 'u1',
    module: 'camp',
    eventType: 'course_progress',
    score: 34,
    metadata: { courseId: 'published-course', lessonId: 'lesson-1', action: 'ai_practice' },
  }]);
});

test('camp progress is calculated by the server and capped at 100', async () => {
  await mockPayCourse({ userId: 'u1', courseId: 'published-course' });
  for (let index = 0; index < 12; index += 1) {
    await updateMyCampCourseProgress({ userId: 'u1', courseId: 'published-course', action: 'material' });
  }

  const progress = state.progress.get(enrollmentKey('u1', 'published-course'));
  assert.equal(progress.progress_percent, 100);
  assert.equal(progress.last_record, '查看学习资料');
});

test('todayLive is null when no lesson is scheduled today', async () => {
  state.lessons.set('published-course', [
    { id: 'later', course_id: 'published-course', title: 'Later', starts_at: Date.now() + 7 * 24 * 60 * 60 * 1000, live_url: 'https://meeting.tencent.com/', sort_order: 1 },
  ]);

  const detail = await getCampCourseDetail({ userId: null, courseId: 'published-course' });

  assert.equal(detail.todayLive, null);
});

test('teacher course save rejects invalid cover url at service boundary', async () => {
  await assert.rejects(
    () => saveTeacherCampCourse({
      courseId: 'published-course',
      payload: {
        title: 'Published',
        coverUrl: 'javascript:alert(1)',
        status: 'draft',
      },
    }),
    (error) => error.status === 400 && error.message === '课程封面图链接格式不正确'
  );
});

test('teacher course save rejects cover urls outside configured image origins', async () => {
  await assert.rejects(
    () => saveTeacherCampCourse({
      courseId: 'published-course',
      payload: {
        title: 'Published',
        coverUrl: 'https://example.com/camp/covers/published-course/cover.jpg',
        status: 'draft',
      },
    }),
    (error) => error.status === 400 && error.message === '课程封面图链接必须来自已配置的 OSS/CDN，请使用本地图片上传'
  );
});

test('teacher course save allows configured oss cover urls', async () => {
  process.env.OSS_BUCKET = 'bucket';
  process.env.OSS_REGION = 'oss-cn-test';

  const result = await saveTeacherCampCourse({
    courseId: 'published-course',
    payload: {
      title: 'Published',
      coverUrl: 'https://bucket.oss-cn-test.aliyuncs.com/camp/covers/published-course/cover.jpg',
      status: 'draft',
    },
  });

  assert.equal(result.course.coverUrl, 'https://bucket.oss-cn-test.aliyuncs.com/camp/covers/published-course/cover.jpg');
});

test('teacher course operations expose enrollment stats and generated redemption codes', async () => {
  await mockPayCourse({ userId: 'u1', courseId: 'published-course' });

  const before = await getTeacherCampCourseOperations('published-course');
  assert.equal(before.stats.enrollmentCount, 1);
  assert.equal(before.stats.revenueCents, 1000);
  assert.equal(before.enrollments[0].user.name, 'Student');

  const after = await createTeacherCampRedemptionCode({
    courseId: 'published-course',
    payload: { code: 'SUMMER2026', maxUses: 20 },
  });

  assert.equal(after.redemptions.some((item) => item.code === 'SUMMER2026' && item.maxUses === 20), true);
});

test('teacher redemption code creation rejects duplicate codes', async () => {
  await assert.rejects(
    () => createTeacherCampRedemptionCode({
      courseId: 'published-course',
      payload: { code: 'PUBCODE', maxUses: 20 },
    }),
    (error) => error.status === 400 && error.message === '兑换码已存在'
  );
});

test('teacher redemption status update rejects missing code ids', async () => {
  await assert.rejects(
    () => updateTeacherCampRedemptionCode({
      courseId: 'published-course',
      codeId: 'missing-code',
      status: 'disabled',
    }),
    (error) => error.status === 404 && error.message === '兑换码不存在'
  );
});

test('teacher cover upload removes new oss object when database update fails', async () => {
  state.failCoverUpdate = true;

  await assert.rejects(
    () => uploadTeacherCampCourseCover({
      courseId: 'published-course',
      fileBuffer: Buffer.from('image'),
      mimeType: 'image/png',
    }),
    /cover update failed/
  );

  assert.equal(state.deletedKeys.length, 1);
  assert.match(state.deletedKeys[0], /^camp\/covers\/published-course\//);
});

test('teacher cover upload removes previous managed cover after replacement', async () => {
  process.env.OSS_BUCKET = 'bucket';
  process.env.OSS_REGION = 'oss-cn-test';
  const oldCover = 'https://bucket.oss-cn-test.aliyuncs.com/camp/covers/published-course/old.jpg';
  state.courses.get('published-course').cover_url = oldCover;

  const result = await uploadTeacherCampCourseCover({
    courseId: 'published-course',
    fileBuffer: Buffer.from('image'),
    mimeType: 'image/jpeg',
  });

  assert.notEqual(result.course.coverUrl, oldCover);
  assert.deepEqual(state.deletedUrls, [oldCover]);
});

test('teacher content save clears material lesson ids that no longer exist', async () => {
  await saveTeacherCampCourseContent({
    courseId: 'published-course',
    payload: {
      lessons: [{ id: 'lesson-kept', title: 'Kept lesson' }],
      materials: [{
        id: 'material-stale',
        lessonId: 'lesson-deleted',
        title: 'Stale binding',
        type: 'pdf',
        url: 'https://example.com/file.pdf',
      }],
    },
  });

  assert.equal(state.materials.get('published-course')[0].lesson_id, null);
});
