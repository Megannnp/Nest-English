import { Router } from 'express';

import { requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validate.js';
import { getListeningContent } from '../services/listeningContentService.js';
import {
  getListeningClassProgress,
  getListeningProgressStats,
  saveListeningProgressRecord,
} from '../services/listeningProgressService.js';
import { listeningProgressRecordBodySchema } from '../utils/schemas/listeningSchemas.js';

const router = Router();

router.get('/content', async (req, res, next) => {
  try {
    const data = await getListeningContent({
      systemId: String(req.query.systemId || '').trim(),
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.post('/progress/records', requireAuth, validateRequest({ body: listeningProgressRecordBodySchema }), async (req, res, next) => {
  try {
    const data = await saveListeningProgressRecord({
      userId: req.user.id,
      ...req.validated.body,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

router.get('/progress', requireAuth, async (req, res, next) => {
  try {
    const data = await getListeningProgressStats(req.user.id);
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.get('/teacher/class-progress', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await getListeningClassProgress({
      teacherId: req.user.id,
      classId: req.query.classId,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

export default router;
