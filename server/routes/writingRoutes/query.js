import { Router } from 'express';

import { requireAuth, requireTeacher } from '../../middleware/authMiddleware.js';
import { listLearningFavorites, saveLearningFavorite } from '../../services/learningFavoriteService.js';
import { getWritingProgressStats } from '../../services/writingQuery/progressService.js';
import {
  getWritingDetailForUser,
  getWritingTasksForUser,
  listWritingsForTeacherStudent,
  listWritingsForUser,
} from '../../services/writingQueryService.js';
import { saveWritingStructureProgress } from '../../services/writingStructureProgressService.js';

const router = Router();

// GET /writings/progress — writing stats for the progress page
router.get('/progress', requireAuth, async (req, res, next) => {
  try {
    const data = await getWritingProgressStats(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    const data = await listLearningFavorites({
      userId: req.user.id,
      module: 'writing',
      favoriteType: 'writing-sentence',
      limit: req.query.limit,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.post('/favorites', requireAuth, async (req, res, next) => {
  try {
    const data = await saveLearningFavorite({
      ...req.body,
      userId: req.user.id,
      module: 'writing',
      favoriteType: 'writing-sentence',
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ code: err.status, msg: err.message });
    next(err);
  }
});

router.post('/structure/progress', requireAuth, async (req, res, next) => {
  try {
    const data = await saveWritingStructureProgress({ ...req.body, userId: req.user.id });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ code: err.status, msg: err.message });
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await listWritingsForUser(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/user/:uid', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listWritingsForTeacherStudent({
      teacherId: req.user.id,
      studentId: req.params.uid,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    const data = await getWritingTasksForUser({
      writingId: req.params.id,
      user: req.user,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = await getWritingDetailForUser({
      writingId: req.params.id,
      user: req.user,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

export default router;
