import { Router } from 'express';

import { requireAuth } from '../../middleware/authMiddleware.js';
import {
  replayQuestionAnalysisForWriting,
  retryQuestionAnalysisForWriting,
  updateQuestionAnalysisFeedback,
} from '../../services/writingAnalysisService.js';

const router = Router();

router.put('/:id/feedback', requireAuth, async (req, res, next) => {
  try {
    const data = await updateQuestionAnalysisFeedback({
      writingId: req.params.id,
      user: req.user,
      feedbackPatch: req.body?.feedback,
    });
    res.json({ code: 200, msg: '反馈已更新', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/question-analysis/retry', requireAuth, async (req, res, next) => {
  try {
    const result = await retryQuestionAnalysisForWriting({
      writingId: req.params.id,
      user: req.user,
    });
    return res.status(result.statusCode).json({
      code: result.statusCode,
      msg: result.msg,
      data: result.data,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/question-analysis/replay-dead-letter', requireAuth, async (req, res, next) => {
  try {
    const result = await replayQuestionAnalysisForWriting({
      writingId: req.params.id,
      user: req.user,
    });
    res.status(result.statusCode).json({
      code: result.statusCode,
      msg: result.msg,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
