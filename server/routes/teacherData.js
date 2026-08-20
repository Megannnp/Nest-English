import { Router } from 'express';

import { requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import {
  getTeacherClassData,
  getTeacherDataOverview,
} from '../services/teacherDataService.js';

const router = Router();

router.get('/overview', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await getTeacherDataOverview({ teacherId: req.user.id });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/classes/:classId', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await getTeacherClassData({
      teacherId: req.user.id,
      classId: req.params.classId,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

export default router;
