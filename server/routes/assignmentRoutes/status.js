import { Router } from 'express';

import { requireAuth, requireTeacher } from '../../middleware/authMiddleware.js';
import {
  archiveAssignment,
  closeAssignment,
  publishAssignment,
} from '../../services/assignmentService.js';

const router = Router();

router.post('/:id/publish', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await publishAssignment({
      teacherId: req.user.id,
      assignmentId: req.params.id,
    });
    res.json({ code: 200, msg: '作业已发布', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/close', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await closeAssignment({
      teacherId: req.user.id,
      assignmentId: req.params.id,
    });
    res.json({ code: 200, msg: '作业已关闭', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/archive', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await archiveAssignment({
      teacherId: req.user.id,
      assignmentId: req.params.id,
    });
    res.json({ code: 200, msg: '作业已归档', data });
  } catch (err) {
    next(err);
  }
});

export default router;
