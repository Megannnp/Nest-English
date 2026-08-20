import { Router } from 'express';
import multer from 'multer';

import { requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import {
  MAX_EXAM_IMPORT_BYTES,
  ALLOWED_EXAM_FILE_EXTS,
} from '../services/examImportJobCreationService.js';
import {
  createExamImportJobEntry,
  getExamImportJobEntry,
  listExamImportJobEntries,
} from '../services/examImportService.js';

const MAX_SINGLE_FILE_BYTES = MAX_EXAM_IMPORT_BYTES;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SINGLE_FILE_BYTES },
  fileFilter(_req, file, cb) {
    const ext = (file.originalname || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
    if (!ALLOWED_EXAM_FILE_EXTS.has(`.${ext}`)) {
      cb(new Error('仅支持 .doc / .docx / .txt 格式的试卷文件'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

function handleUploadError(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ code: 400, msg: '单个文件不能超过20MB' });
  }
  return res.status(400).json({ code: 400, msg: err.message || '试卷上传失败' });
}

/**
 * 批量导入高考英语真题（生产系统模式）：
 *   POST /api/exam-import/jobs
 *   multipart/form-data：
 *     files[]        - 原卷文件（.doc/.docx/.txt，可多份）
 *     answers[]      - 可选：每份原卷对应的解析版答案文件
 *     years[]        - 可选：每份试卷的年份
 *     regions[]      - 可选：每份试卷的地区
 *     papers[]       - 可选：每份试卷的卷别
 *   立即返回任务 id，后台 Worker 异步解析，前端轮询进度。
 */
router.post(
  '/exam-import/jobs',
  requireAuth,
  requireTeacher,
  upload.fields([
    { name: 'files', maxCount: 200 },
    { name: 'answers', maxCount: 200 },
  ]),
  handleUploadError,
  async (req, res, next) => {
    try {
      const files = Array.isArray(req.files?.files) ? req.files.files : [];
      const answerFiles = Array.isArray(req.files?.answers) ? req.files.answers : [];
      if (!files.length) {
        return res.status(400).json({ code: 400, msg: '请至少上传一份试卷文件' });
      }

      const years = Array.isArray(req.body.years) ? req.body.years : req.body.years ? [req.body.years] : [];
      const regions = Array.isArray(req.body.regions) ? req.body.regions : req.body.regions ? [req.body.regions] : [];
      const papers = Array.isArray(req.body.papers) ? req.body.papers : req.body.papers ? [req.body.papers] : [];

      const data = await createExamImportJobEntry({
        user: req.user,
        files,
        answerFiles,
        years,
        regions,
        papers,
      });
      return res.status(201).json({
        code: 201,
        msg: `任务已创建，正在后台解析 ${data.totalCount} 份试卷`,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get('/exam-import/jobs', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listExamImportJobEntries({
      uploaderId: req.user.id,
      limit: req.query.limit,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.get('/exam-import/jobs/:id', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await getExamImportJobEntry({
      uploaderId: req.user.id,
      jobId: req.params.id,
    });
    if (!data) {
      return res.status(404).json({ code: 404, msg: '导入任务不存在或无权限访问' });
    }
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

export default router;