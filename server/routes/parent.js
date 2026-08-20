import { Router } from 'express';

import { requireAuth } from '../middleware/authMiddleware.js';
import {
  bindParentStudent,
  getParentChildEntitlements,
  getParentChildProgress,
  getParentChildTasks,
  getStudentParentBindCode,
  getParentOverview,
} from '../services/parentService.js';

const router = Router();

router.get('/overview', requireAuth, async (req, res, next) => {
  try {
    const data = await getParentOverview({ parentId: req.user.id, user: req.user });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.post('/children', requireAuth, async (req, res, next) => {
  try {
    const data = await bindParentStudent({
      parentId: req.user.id,
      user: req.user,
      studentBindCode: req.body?.studentBindCode,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/children/:childId/tasks', requireAuth, async (req, res, next) => {
  try {
    const data = await getParentChildTasks({
      parentId: req.user.id,
      childId: req.params.childId,
      user: req.user,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/children/:childId/progress', requireAuth, async (req, res, next) => {
  try {
    const data = await getParentChildProgress({
      parentId: req.user.id,
      childId: req.params.childId,
      user: req.user,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/children/:childId/entitlements', requireAuth, async (req, res, next) => {
  try {
    const data = await getParentChildEntitlements({
      parentId: req.user.id,
      childId: req.params.childId,
      user: req.user,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/student-bind-code', requireAuth, async (req, res, next) => {
  try {
    const data = await getStudentParentBindCode({ studentId: req.user.id, user: req.user });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.post('/student-bind-code/regenerate', requireAuth, async (req, res, next) => {
  try {
    const data = await getStudentParentBindCode({ studentId: req.user.id, user: req.user, regenerate: true });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

export default router;
