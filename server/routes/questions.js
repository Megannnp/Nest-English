/**
 * routes/questions.js
 * GET    /api/questions      — user's question bank
 * POST   /api/questions      — add question
 * PUT    /api/questions/:id  — edit question
 * DELETE /api/questions/:id  — delete question
 * GET    /api/questions/tags — 获取动态标签列表（新增）
 */
import { Router } from 'express';

import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validate.js';
import {
  bulkImportQuestionsForUser,
  createQuestionForUser,
  deleteQuestionForUser,
  duplicateQuestionForUser,
  listQuestionsForViewer,
  listQuestionTagsForUser,
  updateQuestionForUser,
} from '../services/questionBankService.js';
import {
  bulkImportQuestionsBodySchema,
  questionBodySchema,
  questionIdParamsSchema,
  questionUpdateBodySchema,
} from '../utils/schemas/questionSchemas.js';

const router = Router();

// ============================================
// 新增：GET /api/questions/tags — 获取动态标签列表
// 放在其他路由前面或后面都可以，建议放在前面
// ============================================
router.get('/tags', requireAuth, async(req, res, next) => {
  try {
    const data = await listQuestionTagsForUser(req.user.id);
    res.json({ 
      code: 200, 
      msg: 'ok',
      data,
    });
  } catch (err) { 
    next(err); 
  }
});

// GET /api/questions
router.get('/', optionalAuth, async(req, res, next) => {
  try {
    const data = await listQuestionsForViewer(req.user, {
      systemId: String(req.query.systemId || '').trim(),
    });
    res.json({ code: 200, msg: 'ok', data });
  } catch (err) { next(err); }
});

// POST /api/questions（现有代码无需大改，确保 themes 是数组即可）
router.post('/', requireAuth, validateRequest({ body: questionBodySchema }), async(req, res, next) => {
  try {
    const data = await createQuestionForUser({ userId: req.user.id, payload: req.validated.body });
    res.status(201).json({ code: 201, msg: '添加成功', data });
  } catch (err) { next(err); }
});

// POST /api/questions/bulk-import
router.post('/bulk-import', requireAuth, validateRequest({ body: bulkImportQuestionsBodySchema }), async(req, res, next) => {
  try {
    const createdRows = await bulkImportQuestionsForUser({
      userId: req.user.id,
      items: req.validated.body.items,
    });
    res.status(201).json({
      code: 201,
      msg: `成功导入 ${createdRows.length} 道题目`,
      data: createdRows,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/duplicate', requireAuth, validateRequest({ params: questionIdParamsSchema }), async(req, res, next) => {
  try {
    const data = await duplicateQuestionForUser({ userId: req.user.id, questionId: req.validated.params.id });
    res.status(201).json({ code: 201, msg: '已复制到我的题库', data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/questions/:id（修复自定义标签保存）
router.put('/:id', requireAuth, validateRequest({ params: questionIdParamsSchema, body: questionUpdateBodySchema }), async(req, res, next) => {
  try {
    const data = await updateQuestionForUser({
      userId: req.user.id,
      questionId: req.validated.params.id,
      payload: req.validated.body,
    });
    res.json({ code: 200, msg: '更新成功', data });
  } catch (err) { next(err); }
});

// DELETE /api/questions/:id
router.delete('/:id', requireAuth, validateRequest({ params: questionIdParamsSchema }), async(req, res, next) => {
  try {
    await deleteQuestionForUser({ userId: req.user.id, questionId: req.validated.params.id });
    res.json({ code: 200, msg: '删除成功' });
  } catch (err) { next(err); }
});

export default router;
