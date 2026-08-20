import { Router } from 'express';
import multer from 'multer';

import { optionalAuth, requireAdmin, requireAuth } from '../middleware/authMiddleware.js';
import { recordAdminOperation } from '../services/adminControlService.js';
import {
  archiveTeacherCampCourse,
  createTeacherCampRedemptionCode,
  duplicateTeacherCampCourse,
  getCampCourseDetail,
  getCampMe,
  getMyCampCourse,
  getTeacherCampCourse,
  getTeacherCampCourseOperations,
  listCampCourses,
  listMyCampCourses,
  listTeacherCampCourses,
  mockPayCourse,
  publishTeacherCampCourse,
  redeemCampCourse,
  saveTeacherCampCourse,
  saveTeacherCampCourseContent,
  updateMyCampCourseProgress,
  updateTeacherCampRedemptionCode,
  uploadTeacherCampCourseCover,
} from '../services/campService.js';
import { validateFileMagicBytes } from '../utils/validateFileMagicBytes.js';

const router = Router();
const ALLOWED_COVER_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_COVER_BYTES },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_COVER_TYPES.has(file.mimetype)) {
      cb(new Error('仅支持 PNG、JPG/JPEG、WEBP 图片'));
      return;
    }
    cb(null, true);
  },
});

function handleCoverUploadError(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ code: 400, msg: '封面图片不能超过 5MB' });
  }
  return res.status(400).json({ code: 400, msg: err.message || '封面图片上传失败' });
}

async function recordCampAdmin(req, action, targetId, detail = null) {
  try {
    await recordAdminOperation({
      adminId: req.user?.id || null,
      action,
      targetType: 'camp_course',
      targetId,
      detail,
    });
  } catch {
    // Logging must not block course operations.
  }
}

for (const prefix of ['/admin', '/teacher']) {
  router.use(prefix, requireAuth, requireAdmin);

  router.get(`${prefix}/courses`, async (_req, res, next) => {
    try {
      const data = await listTeacherCampCourses();
      res.json({ code: 200, msg: 'ok', data });
    } catch (error) {
      next(error);
    }
  });

  router.post(`${prefix}/courses`, async (req, res, next) => {
    try {
      const data = await saveTeacherCampCourse({ payload: req.body || {} });
      await recordCampAdmin(req, 'camp_course_save', data?.course?.id || '', { status: data?.course?.status });
      res.json({ code: 200, msg: '课程已保存', data });
    } catch (error) {
      next(error);
    }
  });

  router.get(`${prefix}/courses/:id`, async (req, res, next) => {
    try {
      const data = await getTeacherCampCourse(req.params.id);
      res.json({ code: 200, msg: 'ok', data });
    } catch (error) {
      next(error);
    }
  });

  router.put(`${prefix}/courses/:id`, async (req, res, next) => {
    try {
      const data = await saveTeacherCampCourse({ courseId: req.params.id, payload: req.body || {} });
      await recordCampAdmin(req, 'camp_course_save', req.params.id, { status: data?.course?.status });
      res.json({ code: 200, msg: '课程已保存', data });
    } catch (error) {
      next(error);
    }
  });

  router.put(`${prefix}/courses/:id/content`, async (req, res, next) => {
    try {
      const data = await saveTeacherCampCourseContent({ courseId: req.params.id, payload: req.body || {} });
      await recordCampAdmin(req, 'camp_course_content_save', req.params.id, {
        lessons: data?.lessons?.length || 0,
        materials: data?.materials?.length || 0,
      });
      res.json({ code: 200, msg: '课程内容已保存', data });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    `${prefix}/courses/:id/cover`,
    coverUpload.single('file'),
    handleCoverUploadError,
    async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ code: 400, msg: '请上传封面图片' });
        }
        if (!validateFileMagicBytes(req.file.buffer, req.file.mimetype)) {
          return res.status(400).json({ code: 400, msg: '图片内容与声明类型不符，请上传真实图片' });
        }
        const data = await uploadTeacherCampCourseCover({
          courseId: req.params.id,
          fileBuffer: req.file.buffer,
          mimeType: req.file.mimetype,
        });
        await recordCampAdmin(req, 'camp_course_cover_upload', req.params.id, {
          mimeType: req.file.mimetype,
          size: req.file.size,
        });
        return res.json({ code: 200, msg: '封面图片已上传', data });
      } catch (error) {
        return next(error);
      }
    }
  );

  router.post(`${prefix}/courses/:id/duplicate`, async (req, res, next) => {
    try {
      const data = await duplicateTeacherCampCourse(req.params.id);
      await recordCampAdmin(req, 'camp_course_duplicate', data?.course?.id || '', { sourceCourseId: req.params.id });
      res.json({ code: 200, msg: '课程已复制为草稿', data });
    } catch (error) {
      next(error);
    }
  });

  router.post(`${prefix}/courses/:id/publish`, async (req, res, next) => {
    try {
      const data = await publishTeacherCampCourse(req.params.id);
      await recordCampAdmin(req, 'camp_course_publish', req.params.id, { status: data?.course?.status });
      res.json({ code: 200, msg: '课程已发布', data });
    } catch (error) {
      next(error);
    }
  });

  router.post(`${prefix}/courses/:id/archive`, async (req, res, next) => {
    try {
      const data = await archiveTeacherCampCourse(req.params.id);
      await recordCampAdmin(req, 'camp_course_archive', req.params.id);
      res.json({ code: 200, msg: '课程已归档', data });
    } catch (error) {
      next(error);
    }
  });

  router.get(`${prefix}/courses/:id/operations`, async (req, res, next) => {
    try {
      const data = await getTeacherCampCourseOperations(req.params.id);
      res.json({ code: 200, msg: 'ok', data });
    } catch (error) {
      next(error);
    }
  });

  router.post(`${prefix}/courses/:id/redemption-codes`, async (req, res, next) => {
    try {
      const data = await createTeacherCampRedemptionCode({ courseId: req.params.id, payload: req.body || {} });
      await recordCampAdmin(req, 'camp_redemption_create', req.params.id, { maxUses: req.body?.maxUses || 1 });
      res.json({ code: 200, msg: '兑换码已创建', data });
    } catch (error) {
      next(error);
    }
  });

  router.put(`${prefix}/courses/:id/redemption-codes/:codeId`, async (req, res, next) => {
    try {
      const data = await updateTeacherCampRedemptionCode({
        courseId: req.params.id,
        codeId: req.params.codeId,
        status: req.body?.status,
      });
      await recordCampAdmin(req, 'camp_redemption_status', req.params.id, {
        codeId: req.params.codeId,
        status: req.body?.status,
      });
      res.json({ code: 200, msg: '兑换码已更新', data });
    } catch (error) {
      next(error);
    }
  });
}

router.get('/courses', optionalAuth, async (req, res, next) => {
  try {
    const data = await listCampCourses(req.user?.id || null);
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.get('/courses/:id', optionalAuth, async (req, res, next) => {
  try {
    const data = await getCampCourseDetail({
      userId: req.user?.id || null,
      courseId: req.params.id,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.post('/courses/:id/mock-pay', requireAuth, async (req, res, next) => {
  if (process.env.ENABLE_CAMP_MOCK_PAY !== 'true') {
    return res.status(404).json({ code: 404, msg: 'Not found' });
  }
  try {
    const data = await mockPayCourse({
      userId: req.user.id,
      courseId: req.params.id,
    });
    res.json({ code: 200, msg: data.alreadyEnrolled ? '已开通课程' : 'mock 支付成功，课程已开通', data });
  } catch (error) {
    next(error);
  }
});

router.get('/my-courses', requireAuth, async (req, res, next) => {
  try {
    const data = await listMyCampCourses(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.get('/my-courses/:id', requireAuth, async (req, res, next) => {
  try {
    const data = await getMyCampCourse({
      userId: req.user.id,
      courseId: req.params.id,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.post('/my-courses/:id/progress', requireAuth, async (req, res, next) => {
  try {
    const data = await updateMyCampCourseProgress({
      userId: req.user.id,
      courseId: req.params.id,
      lessonId: req.body?.lessonId,
      action: req.body?.action,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.post('/redeem', requireAuth, async (req, res, next) => {
  try {
    const data = await redeemCampCourse({
      userId: req.user.id,
      code: req.body?.code,
    });
    res.json({ code: 200, msg: data.alreadyEnrolled ? '你已开通该课程' : '兑换成功，课程已开通', data });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const data = await getCampMe(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

export default router;
