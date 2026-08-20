import { Router } from 'express';

import { requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import {
  getTeacherWorkbenchOverview,
  listTeacherWorkbenchDrafts,
  listTeacherWorkbenchDueSoon,
  listTeacherWorkbenchGradings,
  listTeacherWorkbenchPendingComments,
  listTeacherWorkbenchExceptions,
} from '../services/teacherWorkbenchService.js';

const router = Router();

router.get('/overview', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await getTeacherWorkbenchOverview(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.get('/drafts', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listTeacherWorkbenchDrafts(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.get('/due-soon', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listTeacherWorkbenchDueSoon(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.get('/gradings', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listTeacherWorkbenchGradings(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.get('/pending-comments', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listTeacherWorkbenchPendingComments(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

router.get('/exceptions', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listTeacherWorkbenchExceptions(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    next(error);
  }
});

export default router;
