/* eslint-disable complexity */
import { recordLearningEvent } from './learningEventService.js';
import db from '../db/database.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/appError.js';
import { nanoid } from '../utils/nanoid.js';
import { deleteFromOSS, deleteKeyFromOSS, uploadBufferToOSS } from '../utils/oss.js';

const COURSE_STATUSES = new Set(['draft', 'coming_soon', 'published', 'hidden', 'archived']);

function trimText(value, maxLength = 512) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeTimestamp(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function normalizeMoneyCents(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num);
}

function isValidUrl(value) {
  const text = trimText(value, 1024);
  if (!text) return true;
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function assertValidUrl(value, message) {
  if (!isValidUrl(value)) throw new ValidationError(message);
}

function urlOrigin(value) {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}

function getAllowedCourseImageOrigins() {
  const { OSS_BUCKET, OSS_REGION } = process.env;
  const configured = [
    process.env.OSS_PUBLIC_BASE_URL,
    process.env.CDN_URL,
    process.env.COURSE_IMAGE_BASE_URL,
  ].map(urlOrigin).filter(Boolean);
  const defaultOss = OSS_BUCKET && OSS_REGION
    ? [`http://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`, `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`]
    : [];
  return new Set([...configured, ...defaultOss]);
}

function assertAllowedCoverUrl(value) {
  assertValidUrl(value, '课程封面图链接格式不正确');
  const text = trimText(value, 1024);
  if (!text) return;
  if (!getAllowedCourseImageOrigins().has(new URL(text).origin)) {
    throw new ValidationError('课程封面图链接必须来自已配置的 OSS/CDN，请使用本地图片上传');
  }
}

function isManagedCampCoverUrl(value) {
  try {
    const url = new URL(value);
    return url.pathname.startsWith('/camp/covers/') && getAllowedCourseImageOrigins().has(url.origin);
  } catch {
    return false;
  }
}

function parseJsonField(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function moneyFromCents(amountCents, currency = 'CNY') {
  return {
    amountCents: Number(amountCents || 0),
    currency: currency || 'CNY',
    display: `¥${(Number(amountCents || 0) / 100).toFixed(0)}`,
  };
}

function normalizeCourse(row, enrollment = null) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    coverUrl: row.cover_url || '',
    summary: row.summary || '',
    description: row.description || '',
    suitableFor: parseJsonField(row.suitable_for, []),
    outline: parseJsonField(row.outline, []),
    startsAt: row.starts_at ? Number(row.starts_at) : null,
    price: moneyFromCents(row.price_cents, row.currency),
    tags: parseJsonField(row.tags, []),
    status: row.status || 'published',
    liveUrl: row.live_url || '',
    enrolled: Boolean(enrollment),
    enrollment: enrollment ? normalizeEnrollment(enrollment) : null,
  };
}

function normalizeLesson(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    type: row.lesson_type || 'live',
    startsAt: row.starts_at ? Number(row.starts_at) : null,
    liveUrl: row.live_url || '',
    replayUrl: row.replay_url || '',
    sortOrder: Number(row.sort_order || 0),
  };
}

function normalizeMaterial(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    lessonId: row.lesson_id || null,
    title: row.title,
    type: row.material_type || 'pdf',
    url: row.url || '',
    sortOrder: Number(row.sort_order || 0),
  };
}

function normalizeTeacherCoursePayload(payload = {}, existing = null) {
  const title = trimText(payload.title, 160);
  if (!title) throw new ValidationError('请输入课程名称');
  const status = COURSE_STATUSES.has(payload.status) ? payload.status : (existing?.status || 'draft');
  return {
    title,
    coverUrl: trimText(payload.coverUrl, 1024),
    summary: trimText(payload.summary || payload.subtitle, 512),
    description: trimText(payload.description, 5000),
    suitableFor: Array.isArray(payload.suitableFor) ? payload.suitableFor.map((item) => trimText(item, 120)).filter(Boolean).slice(0, 12) : [],
    outline: Array.isArray(payload.outline) ? payload.outline.map((item) => trimText(item, 160)).filter(Boolean).slice(0, 24) : [],
    startsAt: normalizeTimestamp(payload.startsAt),
    priceCents: normalizeMoneyCents(payload.priceCents),
    tags: Array.isArray(payload.tags) ? payload.tags.map((item) => trimText(item, 32)).filter(Boolean).slice(0, 8) : [],
    status,
    liveUrl: trimText(payload.liveUrl, 1024),
  };
}

function normalizeTeacherLessonPayload(item = {}, index = 0) {
  assertValidUrl(item.liveUrl, '直播链接格式不正确');
  assertValidUrl(item.replayUrl, '回放链接格式不正确');
  return {
    id: trimText(item.id, 64) || nanoid(),
    title: trimText(item.title, 160) || `Day ${index + 1}`,
    startsAt: normalizeTimestamp(item.startsAt),
    liveUrl: trimText(item.liveUrl, 1024),
    replayUrl: trimText(item.replayUrl, 1024),
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function normalizeTeacherMaterialPayload(item = {}, index = 0) {
  const title = trimText(item.title || item.name, 160);
  if (!title) return null;
  const type = trimText(item.type || item.materialType, 32) || 'pdf';
  if (type !== 'ai_practice') {
    assertValidUrl(item.url, '资料链接格式不正确');
  }
  return {
    id: trimText(item.id, 64) || nanoid(),
    lessonId: trimText(item.lessonId, 64) || null,
    title,
    type,
    url: trimText(item.url, 1024),
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
  };
}

function imageExtensionFromMime(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

async function ensureUniqueRedemptionCode(requestedCode = '') {
  const normalized = trimText(requestedCode, 64).toUpperCase();
  if (normalized) {
    const [[existing]] = await db.pool.query('SELECT id FROM course_redemption_codes WHERE code = ? LIMIT 1', [normalized]);
    if (existing) throw new ValidationError('兑换码已存在');
    return normalized;
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `NEST${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const [[existing]] = await db.pool.query('SELECT id FROM course_redemption_codes WHERE code = ? LIMIT 1', [code]);
    if (!existing) return code;
  }
  throw new ValidationError('兑换码生成失败，请重试');
}

function normalizeEnrollment(row) {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    sourceType: row.source_type,
    sourceId: row.source_id || '',
    status: row.status,
    enrolledAt: Number(row.enrolled_at || 0),
    updatedAt: Number(row.updated_at || 0),
  };
}

function normalizeProgress(row) {
  return {
    progressPercent: Math.max(0, Math.min(100, Number(row?.progress_percent || 0))),
    lastRecord: row?.last_record || '',
    lastStudiedAt: row?.last_studied_at ? Number(row.last_studied_at) : null,
    lessonId: row?.lesson_id || null,
  };
}

function normalizeProgressPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function getCampProgressRecordLabel(action) {
  const labels = {
    live: '进入直播学习',
    replay: '查看课程回放',
    material: '查看学习资料',
    ai_practice: '开始 AI 练习',
  };
  return labels[action] || '更新课程进度';
}

async function getCampProgressStep(courseId) {
  const [lessons, materials] = await Promise.all([
    listLessons(courseId),
    listMaterials(courseId),
  ]);
  const visibleMaterials = materials.filter((item) => !['homework', 'ai_practice'].includes(item.type));
  const totalUnits = lessons.length + visibleMaterials.length + (materials.some((item) => item.type === 'ai_practice') ? 1 : 0);
  return totalUnits > 0 ? Math.max(1, Math.ceil(100 / totalUnits)) : 10;
}

function normalizeRedemption(row) {
  return {
    id: row.id,
    code: row.code,
    courseId: row.course_id,
    status: row.status,
    maxUses: Number(row.max_uses || 1),
    usedCount: Number(row.used_count || 0),
    expiresAt: row.expires_at ? Number(row.expires_at) : null,
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
  };
}

function normalizeEnrollmentRow(row) {
  return {
    enrollment: normalizeEnrollment(row),
    user: {
      id: row.user_id,
      name: row.real_name || row.email || row.phone || row.account_code || '未命名用户',
      email: row.email || '',
      phone: row.phone || '',
      role: row.role || '',
      accountCode: row.account_code || '',
    },
    progress: normalizeProgress(row),
  };
}

const VISIBLE_COURSE_STATUSES = new Set(['published', 'coming_soon', 'visible']);
const PURCHASABLE_COURSE_STATUSES = new Set(['published', 'visible']);

export function assertCourseVisible(course) {
  if (!VISIBLE_COURSE_STATUSES.has(course?.status || 'published')) {
    throw new NotFoundError('课程不存在');
  }
}

export function assertCoursePurchasable(course) {
  if (!PURCHASABLE_COURSE_STATUSES.has(course?.status || 'published')) {
    throw new ConflictError('课程暂不支持开通');
  }
}

async function getEnrollment(userId, courseId, connection = db.pool, { forUpdate = false } = {}) {
  if (!userId) return null;
  const sql = `SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? AND status = "active" LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`;
  const [[row]] = await connection.query(sql, [userId, courseId]);
  return row || null;
}

async function getProgress(userId, courseId, connection = db.pool) {
  if (!userId) return null;
  const [[row]] = await connection.query(
    'SELECT * FROM course_progress WHERE user_id = ? AND course_id = ? LIMIT 1',
    [userId, courseId]
  );
  return row || null;
}

async function listLessons(courseId, connection = db.pool) {
  const [rows] = await connection.query(
    'SELECT * FROM course_lessons WHERE course_id = ? ORDER BY sort_order ASC, starts_at ASC',
    [courseId]
  );
  return rows.map(normalizeLesson);
}

async function listMaterials(courseId, connection = db.pool) {
  const [rows] = await connection.query(
    'SELECT * FROM course_materials WHERE course_id = ? ORDER BY sort_order ASC, created_at ASC',
    [courseId]
  );
  return rows.map(normalizeMaterial);
}

function findTodayLive(lessons, now = Date.now()) {
  const dayMs = 24 * 60 * 60 * 1000;
  return lessons.find((lesson) => {
    if (!lesson.startsAt) return false;
    return lesson.startsAt >= now - 6 * 60 * 60 * 1000 && lesson.startsAt <= now + dayMs;
  }) || null;
}

async function ensureCourse(courseId, connection = db.pool) {
  const [[row]] = await connection.query('SELECT * FROM courses WHERE id = ? LIMIT 1', [courseId]);
  if (!row) throw new NotFoundError('课程不存在');
  return row;
}

async function assertTeacherCoursePublishable(courseId, connection = db.pool) {
  const row = await ensureCourse(courseId, connection);
  if (!trimText(row.title, 160)) throw new ValidationError('课程名不能为空');
  if (!row.starts_at) throw new ValidationError('已发布课程至少需要开课时间');
  const [lessons] = await connection.query('SELECT id FROM course_lessons WHERE course_id = ? LIMIT 1', [courseId]);
  if (!lessons.length) throw new ValidationError('已发布课程至少需要 1 节课');
}

async function assertTeacherCoursePayloadPublishable({ courseId, course, connection = db.pool }) {
  if (!course.title) throw new ValidationError('课程名不能为空');
  if (!course.startsAt) throw new ValidationError('已发布课程至少需要开课时间');
  if (!courseId) throw new ValidationError('发布前至少需要 1 节课');
  const [lessons] = await connection.query('SELECT id FROM course_lessons WHERE course_id = ? LIMIT 1', [courseId]);
  if (!lessons.length) throw new ValidationError('已发布课程至少需要 1 节课');
}

async function createEnrollmentInConnection(connection, { userId, courseId, sourceType, sourceId }) {
  const now = Date.now();
  const id = nanoid();
  await connection.query(
    `INSERT INTO enrollments
      (id, user_id, course_id, source_type, source_id, status, enrolled_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
     ON DUPLICATE KEY UPDATE
      status = 'active',
      source_type = VALUES(source_type),
      source_id = VALUES(source_id),
      updated_at = VALUES(updated_at)`,
    [id, userId, courseId, sourceType, sourceId || '', now, now]
  );
  await connection.query(
    `INSERT INTO course_progress
      (id, user_id, course_id, lesson_id, progress_percent, last_record, last_studied_at, updated_at)
     VALUES (?, ?, ?, NULL, 0, '已开通课程，准备开始学习', NULL, ?)
     ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)`,
    [nanoid(), userId, courseId, now]
  );
  const [[row]] = await connection.query(
    'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1',
    [userId, courseId]
  );
  return normalizeEnrollment(row);
}

function recordCampEnrollmentEvent({ userId, courseId, sourceType }) {
  void recordLearningEvent({
    userId,
    module: 'camp',
    eventType: 'course_enrolled',
    metadata: { courseId, sourceType },
  });
}

async function withCampConnection(callback) {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listCampCourses(userId = null) {
  const [rows] = await db.pool.query(
    `SELECT c.*, e.id AS enrollment_id, e.user_id AS enrollment_user_id, e.source_type,
            e.source_id, e.status AS enrollment_status, e.enrolled_at, e.updated_at AS enrollment_updated_at
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ? AND e.status = 'active'
     WHERE c.status IN ('published', 'coming_soon', 'visible')
     ORDER BY c.created_at DESC`,
    [userId || '']
  );

  return rows.map((row) => normalizeCourse(row, row.enrollment_id ? {
    id: row.enrollment_id,
    user_id: row.enrollment_user_id,
    course_id: row.id,
    source_type: row.source_type,
    source_id: row.source_id,
    status: row.enrollment_status,
    enrolled_at: row.enrolled_at,
    updated_at: row.enrollment_updated_at,
  } : null));
}

export async function getCampCourseDetail({ userId = null, courseId }) {
  const row = await ensureCourse(courseId);
  assertCourseVisible(row);
  const [enrollment, lessons, materials] = await Promise.all([
    getEnrollment(userId, courseId),
    listLessons(courseId),
    listMaterials(courseId),
  ]);
  return {
    course: normalizeCourse(row, enrollment),
    lessons,
    materials,
    todayLive: findTodayLive(lessons),
  };
}

export async function listTeacherCampCourses() {
  const [rows] = await db.pool.query('SELECT * FROM courses ORDER BY updated_at DESC, created_at DESC');
  return rows.map((row) => normalizeCourse(row));
}

export async function getTeacherCampCourse(courseId) {
  const row = await ensureCourse(courseId);
  const [lessons, materials] = await Promise.all([
    listLessons(courseId),
    listMaterials(courseId),
  ]);
  return {
    course: normalizeCourse(row),
    lessons,
    materials,
  };
}

export async function getTeacherCampCourseOperations(courseId) {
  const course = await ensureCourse(courseId);
  const [[statsRow], [enrollmentRows], [redemptionRows]] = await Promise.all([
    db.pool.query(
      `SELECT
	         COUNT(DISTINCT e.id) AS enrollment_count,
	         COALESCE(SUM(CASE WHEN e.source_type = 'redemption_code' THEN 1 ELSE 0 END), 0) AS redemption_enrollments,
	         COALESCE(AVG(p.progress_percent), 0) AS average_progress,
	         COALESCE((SELECT SUM(o.amount_cents) FROM orders o WHERE o.course_id = ? AND o.status = 'paid'), 0) AS revenue_cents
	       FROM courses c
	       LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
	       LEFT JOIN course_progress p ON p.user_id = e.user_id AND p.course_id = e.course_id
	       WHERE c.id = ?`,
      [courseId, courseId]
    ),
    db.pool.query(
      `SELECT e.*, u.real_name, u.email, u.phone, u.role, u.account_code,
              p.progress_percent, p.last_record, p.last_studied_at, p.lesson_id
       FROM enrollments e
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN course_progress p ON p.user_id = e.user_id AND p.course_id = e.course_id
       WHERE e.course_id = ? AND e.status = 'active'
       ORDER BY e.enrolled_at DESC
       LIMIT 200`,
      [courseId]
    ),
    db.pool.query(
      `SELECT *
       FROM course_redemption_codes
       WHERE course_id = ?
       ORDER BY created_at DESC
       LIMIT 200`,
      [courseId]
    ),
  ]);

  const stats = statsRow[0] || {};
  return {
    course: normalizeCourse(course),
    stats: {
      enrollmentCount: Number(stats.enrollment_count || 0),
      redemptionEnrollments: Number(stats.redemption_enrollments || 0),
      averageProgress: Math.round(Number(stats.average_progress || 0)),
      revenueCents: Number(stats.revenue_cents || 0),
      revenueDisplay: `¥${(Number(stats.revenue_cents || 0) / 100).toFixed(0)}`,
    },
    enrollments: enrollmentRows.map(normalizeEnrollmentRow),
    redemptions: redemptionRows.map(normalizeRedemption),
  };
}

export async function createTeacherCampRedemptionCode({ courseId, payload = {} }) {
  await ensureCourse(courseId);
  const code = await ensureUniqueRedemptionCode(payload.code);
  const maxUses = Math.max(1, Math.min(10000, Math.round(Number(payload.maxUses || 1))));
  const expiresAt = normalizeTimestamp(payload.expiresAt);
  const now = Date.now();
  await db.pool.query(
    `INSERT INTO course_redemption_codes
      (id, code, course_id, status, max_uses, used_count, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, 0, ?, ?, ?)`,
    [nanoid(), code, courseId, maxUses, expiresAt, now, now]
  );
  return getTeacherCampCourseOperations(courseId);
}

export async function updateTeacherCampRedemptionCode({ courseId, codeId, status }) {
  await ensureCourse(courseId);
  const nextStatus = ['active', 'paused', 'disabled'].includes(status) ? status : 'disabled';
  const [result] = await db.pool.query(
    'UPDATE course_redemption_codes SET status = ?, updated_at = ? WHERE id = ? AND course_id = ?',
    [nextStatus, Date.now(), codeId, courseId]
  );
  if (!result.affectedRows) throw new NotFoundError('兑换码不存在');
  return getTeacherCampCourseOperations(courseId);
}

export async function saveTeacherCampCourse({ courseId = null, payload }) {
  const existing = courseId ? await ensureCourse(courseId) : null;
  const course = normalizeTeacherCoursePayload(payload, existing);
  assertAllowedCoverUrl(course.coverUrl);
  assertValidUrl(course.liveUrl, '默认直播链接格式不正确');
  if (course.status === 'published') {
    await assertTeacherCoursePayloadPublishable({ courseId, course });
  }
  const id = courseId || trimText(payload?.id, 64) || nanoid();
  const now = Date.now();
  if (existing) {
    await db.pool.query(
      `UPDATE courses
       SET title = ?, cover_url = ?, summary = ?, description = ?, suitable_for = ?, outline = ?,
           starts_at = ?, price_cents = ?, currency = 'CNY', tags = ?, status = ?, live_url = ?, updated_at = ?
       WHERE id = ?`,
      [
        course.title,
        course.coverUrl,
        course.summary,
        course.description,
        JSON.stringify(course.suitableFor),
        JSON.stringify(course.outline),
        course.startsAt,
        course.priceCents,
        JSON.stringify(course.tags),
        course.status,
        course.liveUrl,
        now,
        id,
      ]
    );
  } else {
    await db.pool.query(
      `INSERT INTO courses
        (id, title, cover_url, summary, description, suitable_for, outline, starts_at, price_cents, currency, tags, status, live_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CNY', ?, ?, ?, ?, ?)`,
      [
        id,
        course.title,
        course.coverUrl,
        course.summary,
        course.description,
        JSON.stringify(course.suitableFor),
        JSON.stringify(course.outline),
        course.startsAt,
        course.priceCents,
        JSON.stringify(course.tags),
        course.status,
        course.liveUrl,
        now,
        now,
      ]
    );
  }
  return getTeacherCampCourse(id);
}

export async function uploadTeacherCampCourseCover({ courseId, fileBuffer, mimeType }) {
  const course = await ensureCourse(courseId);
  const previousCoverUrl = course.cover_url || '';
  const ext = imageExtensionFromMime(mimeType);
  const key = `camp/covers/${courseId}/${Date.now()}-${nanoid()}.${ext}`;
  const coverUrl = await uploadBufferToOSS(key, fileBuffer, mimeType);
  try {
    await db.pool.query(
      'UPDATE courses SET cover_url = ?, updated_at = ? WHERE id = ?',
      [coverUrl, Date.now(), courseId]
    );
  } catch (error) {
    await deleteKeyFromOSS(key);
    throw error;
  }
  if (previousCoverUrl && previousCoverUrl !== coverUrl && isManagedCampCoverUrl(previousCoverUrl)) {
    await deleteFromOSS(previousCoverUrl);
  }
  return getTeacherCampCourse(courseId);
}

export async function duplicateTeacherCampCourse(courseId) {
  const source = await getTeacherCampCourse(courseId);
  const now = Date.now();
  const nextId = nanoid();
  await withCampConnection(async (connection) => {
    await connection.query(
      `INSERT INTO courses
        (id, title, cover_url, summary, description, suitable_for, outline, starts_at, price_cents, currency, tags, status, live_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CNY', ?, 'draft', ?, ?, ?)`,
      [
        nextId,
        `${source.course.title} 副本`,
        source.course.coverUrl,
        source.course.summary,
        source.course.description,
        JSON.stringify(source.course.suitableFor || []),
        JSON.stringify(source.course.outline || []),
        source.course.startsAt,
        source.course.price?.amountCents || 0,
        JSON.stringify(source.course.tags || []),
        source.course.liveUrl,
        now,
        now,
      ]
    );
    const lessonIdMap = new Map();
    for (const lesson of source.lessons) {
      const nextLessonId = nanoid();
      lessonIdMap.set(lesson.id, nextLessonId);
      await connection.query(
        `INSERT INTO course_lessons
          (id, course_id, title, lesson_type, starts_at, live_url, replay_url, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nextLessonId, nextId, lesson.title, lesson.type || 'live', lesson.startsAt, lesson.liveUrl, lesson.replayUrl, lesson.sortOrder, now, now]
      );
    }
    for (const material of source.materials) {
      await connection.query(
        `INSERT INTO course_materials
          (id, course_id, lesson_id, title, material_type, url, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nanoid(), nextId, material.lessonId ? lessonIdMap.get(material.lessonId) || null : null, material.title, material.type, material.url, material.sortOrder, now, now]
      );
    }
  });
  return getTeacherCampCourse(nextId);
}

export async function publishTeacherCampCourse(courseId) {
  await assertTeacherCoursePublishable(courseId);
  await db.pool.query('UPDATE courses SET status = ?, updated_at = ? WHERE id = ?', ['published', Date.now(), courseId]);
  return getTeacherCampCourse(courseId);
}

export async function archiveTeacherCampCourse(courseId) {
  await ensureCourse(courseId);
  await db.pool.query('UPDATE courses SET status = ?, updated_at = ? WHERE id = ?', ['archived', Date.now(), courseId]);
  return getTeacherCampCourse(courseId);
}

export async function saveTeacherCampCourseContent({ courseId, payload }) {
  await ensureCourse(courseId);
  await withCampConnection(async (connection) => {
    const now = Date.now();
    const lessons = (Array.isArray(payload?.lessons) ? payload.lessons : []).map(normalizeTeacherLessonPayload);
    const lessonIds = new Set(lessons.map((lesson) => lesson.id));
    const materials = (Array.isArray(payload?.materials) ? payload.materials : [])
      .map(normalizeTeacherMaterialPayload)
      .filter(Boolean)
      .map((material) => ({
        ...material,
        lessonId: material.lessonId && lessonIds.has(material.lessonId) ? material.lessonId : null,
      }));

    if (payload?.homework?.description) {
      materials.push(normalizeTeacherMaterialPayload({
        id: payload.homework.id,
        title: payload.homework.description,
        type: 'homework',
        sortOrder: 900,
      }));
    }
    if (payload?.aiPractice?.description || payload?.aiPractice?.targetPage) {
      materials.push(normalizeTeacherMaterialPayload({
        id: payload.aiPractice.id,
        title: payload.aiPractice.description || 'AI 练习',
        type: 'ai_practice',
        url: payload.aiPractice.targetPage || 'writing',
        sortOrder: 901,
      }));
    }

    await connection.query('DELETE FROM course_materials WHERE course_id = ?', [courseId]);
    await connection.query('DELETE FROM course_lessons WHERE course_id = ?', [courseId]);

    for (const lesson of lessons) {
      await connection.query(
        `INSERT INTO course_lessons
          (id, course_id, title, lesson_type, starts_at, live_url, replay_url, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 'live', ?, ?, ?, ?, ?, ?)`,
        [lesson.id, courseId, lesson.title, lesson.startsAt, lesson.liveUrl, lesson.replayUrl, lesson.sortOrder, now, now]
      );
    }
    for (const material of materials) {
      await connection.query(
        `INSERT INTO course_materials
          (id, course_id, lesson_id, title, material_type, url, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [material.id, courseId, material.lessonId, material.title, material.type, material.url, material.sortOrder, now, now]
      );
    }
  });
  return getTeacherCampCourse(courseId);
}

export async function listMyCampCourses(userId) {
  const [rows] = await db.pool.query(
    `SELECT c.*, e.id AS enrollment_id, e.user_id AS enrollment_user_id, e.source_type,
            e.source_id, e.status AS enrollment_status, e.enrolled_at, e.updated_at AS enrollment_updated_at,
            p.progress_percent, p.last_record, p.last_studied_at, p.lesson_id
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN course_progress p ON p.user_id = e.user_id AND p.course_id = e.course_id
     WHERE e.user_id = ? AND e.status = 'active'
     ORDER BY e.enrolled_at DESC`,
    [userId]
  );

  const list = [];
  for (const row of rows) {
    const lessons = await listLessons(row.id);
    list.push({
      course: normalizeCourse(row, {
        id: row.enrollment_id,
        user_id: row.enrollment_user_id,
        course_id: row.id,
        source_type: row.source_type,
        source_id: row.source_id,
        status: row.enrollment_status,
        enrolled_at: row.enrolled_at,
        updated_at: row.enrollment_updated_at,
      }),
      progress: normalizeProgress(row),
      todayLive: findTodayLive(lessons),
      recentRecord: row.last_record || '已开通课程，准备开始学习',
    });
  }
  return list;
}

export async function getMyCampCourse({ userId, courseId }) {
  const enrollment = await getEnrollment(userId, courseId);
  if (!enrollment) throw new ForbiddenError('你尚未开通该课程');
  const [detail, progress] = await Promise.all([
    getCampCourseDetail({ userId, courseId }),
    getProgress(userId, courseId),
  ]);
  const homework = detail.materials.find((item) => item.type === 'homework');
  const aiPractice = detail.materials.find((item) => item.type === 'ai_practice');
  return {
    ...detail,
    materials: detail.materials.filter((item) => !['homework', 'ai_practice'].includes(item.type)),
    progress: normalizeProgress(progress),
    homework: homework
      ? { title: '今日作业', description: homework.title, status: 'ready' }
      : { title: '今日作业', description: '今日作业待发布', status: 'placeholder' },
    aiPractice: aiPractice
      ? { title: 'AI 练习', description: aiPractice.title, targetPage: aiPractice.url || 'writing', status: 'ready' }
      : { title: 'AI 练习', description: 'AI 练习入口待配置', targetPage: '', status: 'placeholder' },
  };
}

export async function updateMyCampCourseProgress({ userId, courseId, lessonId = null, action = 'progress' }) {
  const enrollment = await getEnrollment(userId, courseId);
  if (!enrollment) throw new ForbiddenError('你尚未开通该课程');

  const normalizedLessonId = trimText(lessonId, 64) || null;
  const normalizedAction = trimText(action, 64) || 'progress';
  const currentProgress = normalizeProgress(await getProgress(userId, courseId)).progressPercent;
  const normalizedProgress = normalizeProgressPercent(currentProgress + await getCampProgressStep(courseId));
  const now = Date.now();
  await db.pool.query(
    `INSERT INTO course_progress
      (id, user_id, course_id, lesson_id, progress_percent, last_record, last_studied_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      lesson_id = COALESCE(VALUES(lesson_id), lesson_id),
      progress_percent = GREATEST(progress_percent, VALUES(progress_percent)),
      last_record = VALUES(last_record),
      last_studied_at = VALUES(last_studied_at),
      updated_at = VALUES(updated_at)`,
    [nanoid(), userId, courseId, normalizedLessonId, normalizedProgress, getCampProgressRecordLabel(normalizedAction), now, now]
  );

  const progress = normalizeProgress(await getProgress(userId, courseId));
  void recordLearningEvent({
    userId,
    module: 'camp',
    eventType: 'course_progress',
    score: progress.progressPercent,
    metadata: { courseId, lessonId: normalizedLessonId, action: normalizedAction },
  });
  return progress;
}

export async function mockPayCourse({ userId, courseId }) {
  const result = await withCampConnection(async (connection) => {
    const course = await ensureCourse(courseId, connection);
    assertCoursePurchasable(course);
    const existing = await getEnrollment(userId, courseId, connection, { forUpdate: true });
    if (existing) {
      return { enrollment: normalizeEnrollment(existing), order: null, alreadyEnrolled: true };
    }

    const now = Date.now();
    const orderId = nanoid();
    await connection.query(
      `INSERT INTO orders
        (id, user_id, course_id, amount_cents, currency, payment_method, status, created_at, paid_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'mock', 'paid', ?, ?, ?)`,
      [orderId, userId, courseId, Number(course.price_cents || 0), course.currency || 'CNY', now, now, now]
    );
    const enrollment = await createEnrollmentInConnection(connection, {
      userId,
      courseId,
      sourceType: 'mock_payment',
      sourceId: orderId,
    });
    return {
      order: { id: orderId, status: 'paid', amountCents: Number(course.price_cents || 0), currency: course.currency || 'CNY' },
      enrollment,
      alreadyEnrolled: false,
    };
  });
  if (!result.alreadyEnrolled) {
    recordCampEnrollmentEvent({ userId, courseId, sourceType: 'mock_payment' });
  }
  return result;
}

export async function redeemCampCourse({ userId, code }) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) throw new ValidationError('请输入兑换码');
  if (normalizedCode.length > 64) throw new ValidationError('兑换码不合法');

  const result = await withCampConnection(async (connection) => {
    const [[redemption]] = await connection.query(
      'SELECT * FROM course_redemption_codes WHERE code = ? FOR UPDATE',
      [normalizedCode]
    );
    if (!redemption) throw new NotFoundError('兑换码不存在');
    if (redemption.status !== 'active') throw new ConflictError('兑换码不可用');
    if (redemption.expires_at && Number(redemption.expires_at) <= Date.now()) throw new ConflictError('兑换码已过期');
    if (Number(redemption.used_count || 0) >= Number(redemption.max_uses || 1)) throw new ConflictError('兑换码已被使用完');

    const course = await ensureCourse(redemption.course_id, connection);
    assertCoursePurchasable(course);
    const existing = await getEnrollment(userId, redemption.course_id, connection);
    if (existing) {
      return { enrollment: normalizeEnrollment(existing), courseId: redemption.course_id, alreadyEnrolled: true };
    }

    const enrollment = await createEnrollmentInConnection(connection, {
      userId,
      courseId: redemption.course_id,
      sourceType: 'redemption_code',
      sourceId: redemption.id,
    });
    await connection.query(
      'UPDATE course_redemption_codes SET used_count = used_count + 1, updated_at = ? WHERE id = ?',
      [Date.now(), redemption.id]
    );
    return { enrollment, courseId: redemption.course_id, alreadyEnrolled: false };
  });
  if (!result.alreadyEnrolled) {
    recordCampEnrollmentEvent({ userId, courseId: result.courseId, sourceType: 'redemption_code' });
  }
  return result;
}

export async function getCampMe(userId) {
  const myCourses = await listMyCampCourses(userId);
  return {
    purchasedCourses: myCourses.length,
    learningRecords: myCourses.map((item) => ({
      courseId: item.course.id,
      courseTitle: item.course.title,
      progressPercent: item.progress.progressPercent,
      recentRecord: item.recentRecord,
      lastStudiedAt: item.progress.lastStudiedAt,
    })),
    certificates: [],
    support: {
      status: 'placeholder',
      message: '课程客服入口将接入企业微信或站内消息。',
    },
  };
}
