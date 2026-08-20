import { Router } from 'express';

import { normalizeAssignmentWritePayload } from './payload.js';
import { requireAuth, requireTeacher } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  createAssignment,
  getAssignmentDetailByTeacher,
  listAssignmentsByTeacher,
  updateAssignment,
} from '../../services/assignmentService.js';
import { optionalTrimmedString } from '../../utils/routeValidation.js';
import {
  createAssignmentBodySchema,
  updateAssignmentBodySchema,
} from '../../utils/schemas/assignmentSchemas.js';

const router = Router();

router.get('/', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const classId = optionalTrimmedString(req.query.classId, 64);
    const assignments = await listAssignmentsByTeacher(req.user.id, classId || null);
    res.json({ code: 200, msg: 'ok', data: assignments });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireTeacher, validateRequest({ body: createAssignmentBodySchema }), async (req, res, next) => {
  try {
    const body = req.validated.body;
    const result = await createAssignment({
      teacher: req.user,
      classId: optionalTrimmedString(body.classId, 64),
      ...normalizeAssignmentWritePayload(body),
    });

    res.status(201).json({ code: 201, msg: '作业已创建', data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await getAssignmentDetailByTeacher(req.user.id, req.params.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireTeacher, validateRequest({ body: updateAssignmentBodySchema }), async (req, res, next) => {
  try {
    const data = await updateAssignment({
      teacherId: req.user.id,
      assignmentId: req.params.id,
      ...normalizeAssignmentWritePayload(req.validated.body),
    });
    res.json({ code: 200, msg: '作业已更新', data });
  } catch (err) {
    next(err);
  }
});

export default router;
