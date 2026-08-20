import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validate.js';
import {
  cancelBatchGradingJob,
  continueIncompleteBatchGradingItems,
  createBatchGradingJob,
  getBatchGradingJob,
  listBatchGradingJobs,
  pauseBatchGradingJob,
  resumeBatchGradingJob,
  retryFailedBatchGradingItems,
} from '../services/batchGradingService.js';
import {
  batchGradingJobListSchema,
  batchGradingJobSchema,
} from '../utils/schemas/contractSchemas.js';
import { createBatchGradingJobBodySchema } from '../utils/schemas/writingSchemas.js';

const router = Router();
const batchGradingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ code: 429, msg: '批量批改操作过于频繁，请稍后再试' });
  },
});

router.post(
  '/batch-grading/jobs',
  requireAuth,
  requireTeacher,
  batchGradingLimiter,
  validateRequest({ body: createBatchGradingJobBodySchema }),
  async (req, res, next) => {
    try {
      const data = await createBatchGradingJob({
        teacher: req.user,
        payload: req.validated.body,
      });
      res.status(201).json({ code: 201, msg: '批量批改任务已创建', data: batchGradingJobSchema.parse(data, 'data') });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/batch-grading/jobs', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listBatchGradingJobs({
      teacherId: req.user.id,
      limit: req.query.limit,
      filter: req.query.filter,
      classId: req.query.classId,
      assignmentId: req.query.assignmentId,
    });
    res.json({ code: 200, msg: 'ok', data: batchGradingJobListSchema.parse(data, 'data') });
  } catch (error) {
    next(error);
  }
});

router.get('/batch-grading/jobs/:id', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await getBatchGradingJob({
      teacherId: req.user.id,
      jobId: req.params.id,
    });
    res.json({ code: 200, msg: 'ok', data: batchGradingJobSchema.parse(data, 'data') });
  } catch (error) {
    next(error);
  }
});

router.post('/batch-grading/jobs/:id/pause', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await pauseBatchGradingJob({
      teacherId: req.user.id,
      jobId: req.params.id,
    });
    res.json({ code: 200, msg: '批量批改任务已暂停', data: batchGradingJobSchema.parse(data, 'data') });
  } catch (error) {
    next(error);
  }
});

router.post('/batch-grading/jobs/:id/resume', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await resumeBatchGradingJob({
      teacherId: req.user.id,
      jobId: req.params.id,
    });
    res.json({ code: 200, msg: '批量批改任务已继续', data: batchGradingJobSchema.parse(data, 'data') });
  } catch (error) {
    next(error);
  }
});

router.post('/batch-grading/jobs/:id/cancel', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await cancelBatchGradingJob({
      teacherId: req.user.id,
      jobId: req.params.id,
    });
    res.json({ code: 200, msg: '批量批改任务已停止', data: batchGradingJobSchema.parse(data, 'data') });
  } catch (error) {
    next(error);
  }
});

router.post('/batch-grading/jobs/:id/retry-failed', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await retryFailedBatchGradingItems({
      teacherId: req.user.id,
      jobId: req.params.id,
    });
    res.json({ code: 200, msg: '失败项已重新加入批量批改', data: batchGradingJobSchema.parse(data, 'data') });
  } catch (error) {
    next(error);
  }
});

router.post('/batch-grading/jobs/:id/continue-incomplete', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await continueIncompleteBatchGradingItems({
      teacherId: req.user.id,
      jobId: req.params.id,
    });
    res.json({ code: 200, msg: '未完成项已继续批改', data: batchGradingJobSchema.parse(data, 'data') });
  } catch (error) {
    next(error);
  }
});

export default router;
