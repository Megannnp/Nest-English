import { Router } from 'express';

import { requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import {
  createModuleAssignment,
  listModuleAssignmentsForTeacher,
  listModuleTasksForStudent,
  submitModuleAssignment,
  getAssignableModuleMeta,
} from '../services/moduleAssignmentService.js';
import { logError } from '../utils/logger.js';

const router = Router();

router.get('/my', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.json({ code: 200, msg: 'ok', data: [] });
    const data = await listModuleTasksForStudent({ student: req.user });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) { logError(err); return next(err); }
});

router.post('/:id/submit', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ code: 403, msg: '只有学生可以提交专项任务' });
    const data = await submitModuleAssignment({ student: req.user, assignmentId: req.params.id });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) { logError(err); return next(err); }
});

router.get('/', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const { module: moduleType = '', classId = '' } = req.query;
    const data = await listModuleAssignmentsForTeacher({ teacherId: req.user.id, moduleType, classId });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) { logError(err); return next(err); }
});

router.post('/', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const { module: moduleType, ...payload } = req.body || {};
    if (!moduleType) return res.status(400).json({ code: 400, msg: 'module 不能为空' });
    if (!payload.title?.trim()) return res.status(400).json({ code: 400, msg: 'title 不能为空' });
    if (!payload.classId) return res.status(400).json({ code: 400, msg: 'classId 不能为空' });
    const data = await createModuleAssignment({ teacher: req.user, moduleType, payload });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) { logError(err); return next(err); }
});

router.get('/meta', requireAuth, async (_req, res) => {
  res.json({ code: 200, msg: 'ok', data: getAssignableModuleMeta() });
});

export default router;
