import { Router } from 'express';

import { loadWritingForFeedbackAccess } from './access.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import {
  buildFeedbackResponse,
  buildFeedbackStatusResponse,
} from '../../services/feedbackService.js';

const router = Router();

router.get('/writings/:id/feedback', requireAuth, async (req, res, next) => {
  try {
    const { row } = await loadWritingForFeedbackAccess({
      writingId: req.params.id,
      user: req.user,
      forbiddenMessage: '无权限查看此写作反馈',
    });

    const data = await buildFeedbackResponse(row);
    res.json({ code: 200, msg: 'success', data });
  } catch (error) {
    next(error);
  }
});

router.get('/writings/:id/feedback/status', requireAuth, async (req, res, next) => {
  try {
    const { row } = await loadWritingForFeedbackAccess({
      writingId: req.params.id,
      user: req.user,
      forbiddenMessage: '无权限查看此写作反馈状态',
    });

    const data = await buildFeedbackStatusResponse(row);
    res.json({ code: 200, msg: 'success', data });
  } catch (error) {
    next(error);
  }
});

export default router;
