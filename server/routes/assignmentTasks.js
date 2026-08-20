import { Router } from 'express';

import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getAssignmentTaskForStudent,
  listAssignmentTasksForStudent,
} from '../services/assignmentService.js';

const router = Router();

router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const tasks = await listAssignmentTasksForStudent(req.user.id);
    res.json({ code: 200, msg: 'ok', data: tasks });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const task = await getAssignmentTaskForStudent(req.params.id, req.user.id);
    res.json({ code: 200, msg: 'ok', data: task });
  } catch (err) {
    next(err);
  }
});

export default router;
