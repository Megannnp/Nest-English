import { Router } from 'express';

import { optionalAuth, requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import { listClassStudentsForTeacher } from '../services/classService.js';
import {
  getSpeakingPracticeQuestions,
  getSpeakingProgressStats,
  getSpeakingProgressStatsByUserIds,
  saveSpeakingProgressRecord,
} from '../services/speakingProgressService.js';

const router = Router();

router.get('/questions', optionalAuth, async (req, res, next) => {
  try {
    const data = await getSpeakingPracticeQuestions({
      limit: req.query.limit,
      systemId: String(req.query.systemId || '').trim(),
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.post('/progress/records', requireAuth, async (req, res, next) => {
  try {
    const data = await saveSpeakingProgressRecord({
      userId: req.user.id,
      ...req.body,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

router.get('/progress', requireAuth, async (req, res, next) => {
  try {
    const data = await getSpeakingProgressStats(req.user.id);
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.get('/teacher/class-progress', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const students = await listClassStudentsForTeacher({ teacherId: req.user.id, classId: req.query.classId });
    const studentIds = students.map((student) => student.id);
    const stats = await getSpeakingProgressStatsByUserIds(studentIds);

    const data = students.map((student) => ({
      id: student.id,
      realName: student.realName || student.name || '未命名',
      studentNo: student.studentNo || '',
      speakingStats: stats[student.id] || { sessions: 0, durationMs: 0, averageScore: 0, lastPracticedAt: null },
    }));

    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

export default router;
