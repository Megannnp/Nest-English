import { Router } from 'express';

import { loadWritingForFeedbackAccess } from './access.js';
import { requireAuth, requireTeacher } from '../../middleware/authMiddleware.js';
import {
  buildFeedbackResponse,
  saveTeacherCommentFeedback,
} from '../../services/feedbackService.js';
import { buildTeacherCommentPayload } from '../../services/writingService.js';

const router = Router();

router.put('/writings/:id/feedback/comment', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const { row } = await loadWritingForFeedbackAccess({
      writingId: req.params.id,
      user: req.user,
      forbiddenMessage: '无权限评阅此写作',
      allowOwner: false,
      allowTeacher: true,
    });

    const commentPayload = buildTeacherCommentPayload({
      content: req.body?.content,
      annotatedImage: req.body?.annotatedImage,
      teacher: req.user,
    });

    const updated = await saveTeacherCommentFeedback({ row, commentPayload });
    const data = await buildFeedbackResponse(updated);
    res.json({ code: 200, msg: '教师评价已保存', data });
  } catch (error) {
    next(error);
  }
});

export default router;
