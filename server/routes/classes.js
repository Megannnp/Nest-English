import { Router } from 'express';

import { requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createAndLinkClassRosterUserForTeacher,
  importClassRosterForTeacher,
  linkClassRosterUserForTeacher,
  linkSpecificClassRosterUserForTeacher,
  listClassRosterForTeacher,
  listUnmatchedClassUsersForTeacher,
  unlinkClassRosterUserForTeacher,
} from '../services/classRosterService.js';
import {
  bindTeacherToClass,
  createClassForTeacher,
  getClassDetailForUser,
  joinClassForStudent,
  listClassesForTeacher,
  listClassStudentsForTeacher,
  listClassWritingsForTeacher,
  searchClassByCode,
  updateClassPasswordForTeacher,
} from '../services/classService.js';
import {
  classIdParamsSchema,
  classPasswordBodySchema,
  classRosterIdParamsSchema,
  classSearchQuerySchema,
  createClassBodySchema,
} from '../utils/schemas/classSchemas.js';

const router = Router();

router.get('/', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listClassesForTeacher(req.user.id);
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/search', requireAuth, validateRequest({ query: classSearchQuerySchema }), async (req, res, next) => {
  try {
    const data = await searchClassByCode(req.validated.query.code);
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireTeacher, validateRequest({ body: createClassBodySchema }), async (req, res, next) => {
  try {
    const data = await createClassForTeacher({
      teacher: req.user,
      payload: req.validated.body,
    });
    res.status(201).json({ code: 201, msg: '创建成功', data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/password', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema, body: classPasswordBodySchema }), async (req, res, next) => {
  try {
    const data = await updateClassPasswordForTeacher({
      teacherId: req.user.id,
      classId: req.validated.params.id,
      password: req.validated.body.password,
    });
    res.json({ code: 200, msg: '班级密码已更新', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', requireAuth, validateRequest({ params: classIdParamsSchema, body: classPasswordBodySchema }), async (req, res, next) => {
  try {
    const data = await joinClassForStudent({
      user: req.user,
      classId: req.validated.params.id,
      password: req.validated.body.password,
    });
    res.json({ code: 200, msg: '加入成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/bind-teacher', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await bindTeacherToClass({
      teacherId: req.user.id,
      classId: req.validated.params.id,
    });
    res.json({ code: 200, msg: '绑定成功', data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await getClassDetailForUser({
      user: req.user,
      classId: req.validated.params.id,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/students', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await listClassStudentsForTeacher({
      teacherId: req.user.id,
      classId: req.validated.params.id,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/writings', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await listClassWritingsForTeacher({
      teacherId: req.user.id,
      classId: req.validated.params.id,
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

// ── Roster routes ──────────────────────────────────────────────────────────────

router.get('/:id/roster', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await listClassRosterForTeacher({ teacherId: req.user.id, classId: req.validated.params.id });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/roster/unmatched', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await listUnmatchedClassUsersForTeacher({ teacherId: req.user.id, classId: req.validated.params.id });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/unmatched-users', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await listUnmatchedClassUsersForTeacher({ teacherId: req.user.id, classId: req.validated.params.id });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/roster/import', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await importClassRosterForTeacher({ teacherId: req.user.id, classId: req.validated.params.id, items: req.body.items });
    res.json({ code: 200, msg: '导入成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/roster/create-and-link', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await createAndLinkClassRosterUserForTeacher({ teacherId: req.user.id, classId: req.validated.params.id, userId: req.body.userId });
    res.json({ code: 200, msg: '创建并绑定成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/roster/link', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await linkClassRosterUserForTeacher({ teacherId: req.user.id, classId: req.validated.params.id, userId: req.body.userId });
    res.json({ code: 200, msg: '绑定成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/roster/link-user', requireAuth, requireTeacher, validateRequest({ params: classIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await linkClassRosterUserForTeacher({ teacherId: req.user.id, classId: req.validated.params.id, userId: req.body.userId });
    res.json({ code: 200, msg: '绑定成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/roster/:rosterId/link', requireAuth, requireTeacher, validateRequest({ params: classRosterIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await linkSpecificClassRosterUserForTeacher({
      teacherId: req.user.id,
      classId: req.validated.params.id,
      rosterId: req.validated.params.rosterId,
      userId: req.body.userId,
    });
    res.json({ code: 200, msg: '绑定成功', data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/roster/:rosterId/unlink-user', requireAuth, requireTeacher, validateRequest({ params: classRosterIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await unlinkClassRosterUserForTeacher({
      teacherId: req.user.id,
      classId: req.validated.params.id,
      rosterId: req.validated.params.rosterId,
    });
    res.json({ code: 200, msg: '解绑成功', data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/roster/:rosterId', requireAuth, requireTeacher, validateRequest({ params: classRosterIdParamsSchema }), async (req, res, next) => {
  try {
    const data = await unlinkClassRosterUserForTeacher({
      teacherId: req.user.id,
      classId: req.validated.params.id,
      rosterId: req.validated.params.rosterId,
    });
    res.json({ code: 200, msg: '解绑成功', data });
  } catch (err) {
    next(err);
  }
});

export default router;
