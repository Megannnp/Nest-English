import { Router } from 'express';

import { requireAuth, requireTeacher } from '../../middleware/authMiddleware.js';
import {
  exportAssignmentCsv,
  getAssignmentExportPayload,
} from '../../services/assignmentService.js';

const router = Router();

router.get('/:id/export', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const exportType = req.query.type === 'summary' ? 'summary' : 'detail';
    const { filename, csv } = await exportAssignmentCsv({
      teacherId: req.user.id,
      assignmentId: req.params.id,
      exportType,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/export-data', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await getAssignmentExportPayload({
      teacherId: req.user.id,
      assignmentId: req.params.id,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

export default router;
