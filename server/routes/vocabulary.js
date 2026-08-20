import { Router } from 'express';

import { enforceGuestAIBudget } from '../middleware/aiGuestBudget.js';
import { optionalAuth, requireAdmin, requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validate.js';
import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from '../services/adminControlService.js';
import { listClassesForTeacher, listClassStudentsForTeacher } from '../services/classService.js';
import { listLearningFavorites, saveLearningFavorite } from '../services/learningFavoriteService.js';
import { analyzeVocabWord, handleAnalyzerError } from '../services/vocab/analyzerService.js';
import { getVocabContent, updateVocabContent } from '../services/vocab/contentService.js';
import { getCourseProgress, upsertCourseProgress } from '../services/vocab/courseProgressService.js';
import {
  getVocabularyClassStats,
  getVocabularyProgressStats,
  saveVocabularyProgressRecord,
} from '../services/vocabularyProgressService.js';
import {
  vocabAnalyzeBodySchema,
  vocabCourseProgressBodySchema,
  vocabFavoriteBodySchema,
  vocabProgressRecordBodySchema,
} from '../utils/schemas/vocabSchemas.js';

const router = Router();

router.get('/content', optionalAuth, async (req, res, next) => {
  try {
    const data = await getVocabContent({
      systemId: String(req.query.systemId || '').trim(),
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.put('/content', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await updateVocabContent({ ...req.body, updatedBy: req.user.id });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

router.post('/analyze', optionalAuth, validateRequest({ body: vocabAnalyzeBodySchema }), enforceGuestAIBudget('vocab_analyze'), async (req, res) => {
  try {
    await assertAIBudgetAvailable({ feature: 'vocab_analyze', user: req.user });
    const data = await analyzeVocabWord({ word: req.validated.body.word, user: req.user });
    await recordAIUsageEvent({ feature: 'vocab_analyze', user: req.user, source: req.requestId });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    if (err.status && err.status < 500) return res.status(err.status).json({ code: err.status, msg: err.message });
    const { status, msg } = handleAnalyzerError(err, { requestId: req.requestId, userId: req.user?.id });
    return res.status(status).json({ code: status, msg });
  }
});

router.post('/progress/records', requireAuth, validateRequest({ body: vocabProgressRecordBodySchema }), async (req, res, next) => {
  try {
    const data = await saveVocabularyProgressRecord({
      ...req.validated.body,
      userId: req.user.id,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

router.get('/progress', requireAuth, async (req, res, next) => {
  try {
    const data = await getVocabularyProgressStats(req.user.id);
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    const data = await listLearningFavorites({
      userId: req.user.id,
      module: 'vocab',
      favoriteType: 'vocab-word',
      limit: req.query.limit,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.post('/favorites', requireAuth, validateRequest({ body: vocabFavoriteBodySchema }), async (req, res, next) => {
  try {
    const data = await saveLearningFavorite({
      ...req.validated.body,
      userId: req.user.id,
      module: 'vocab',
      favoriteType: 'vocab-word',
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

router.get('/courses/progress', requireAuth, async (req, res, next) => {
  try {
    const data = await getCourseProgress(req.user.id);
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.post('/courses/progress', requireAuth, validateRequest({ body: vocabCourseProgressBodySchema }), async (req, res, next) => {
  try {
    const { nodeId, status, quizCorrect, quizTotal } = req.validated.body;
    if (quizTotal > 0 && quizCorrect > quizTotal) {
      return res.status(400).json({ code: 400, msg: '答对题数不能大于总题数' });
    }
    await upsertCourseProgress({ userId: req.user.id, nodeId, status, quizCorrect, quizTotal });
    return res.json({ code: 200, msg: 'ok' });
  } catch (error) {
    return next(error);
  }
});

// Teacher: list their classes for vocab workbench
router.get('/teacher/classes', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const classes = await listClassesForTeacher(req.user.id);
    return res.json({ code: 200, msg: 'ok', data: classes });
  } catch (error) {
    return next(error);
  }
});

// Teacher: get vocab practice stats for all students in a class
router.get('/teacher/class-progress', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const { classId } = req.query;
    if (!classId) return res.status(400).json({ code: 400, msg: '缺少 classId' });
    const students = await listClassStudentsForTeacher({ teacherId: req.user.id, classId });
    const studentIds = students.map((s) => s.id);
    const vocabStats = studentIds.length ? await getVocabularyClassStats(studentIds) : {};
    const data = students.map((s) => ({
      id: s.id,
      realName: s.realName || s.name || '未命名',
      vocabStats: vocabStats[s.id] || { sessions: 0, averageScore: 0, averageAccuracy: 0, lastPracticedAt: null },
    }));
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

export default router;
