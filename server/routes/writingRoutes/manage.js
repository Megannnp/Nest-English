import { Router } from 'express';

import { requireAuth, requireTeacher } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  deleteWritingForUser,
  saveTeacherCommentForWriting,
} from '../../services/writingAnalysisService.js';
import { commentBodySchema } from '../../utils/schemas/writingSchemas.js';

const router = Router();

router.put('/:id/comment', requireAuth, requireTeacher, validateRequest({ body: commentBodySchema }), async (req, res, next) => {
  try {
    const data = await saveTeacherCommentForWriting({
      writingId: req.params.id,
      user: req.user,
      content: req.validated.body.content,
      annotatedImage: req.validated.body.annotatedImage,
    });
    res.json({ code: 200, msg: '评语已保存', data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = await deleteWritingForUser({
      writingId: req.params.id,
      user: req.user,
    });
    res.json({ code: 200, msg: '记录已删除', data });
  } catch (err) {
    next(err);
  }
});

export default router;
