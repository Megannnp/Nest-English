import { Router } from 'express';

import { enforceGuestAIBudget } from '../middleware/aiGuestBudget.js';
import { optionalAuth, requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validate.js';
import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from '../services/adminControlService.js';
import { listClassStudentsForTeacher } from '../services/classService.js';
import { consumeEntitlement, refundEntitlement } from '../services/pointsService.js';
import {
  getReadingAnalysisRecord,
  getReadingAnalysisStats,
  getReadingAnalysisStatsByUserIds,
  saveReadingAnalysisRecord,
} from '../services/reading/analysisRecordService.js';
import { analyzeReading, handleAnalyzeError } from '../services/reading/analyzerService.js';
import { getReadingCourseProgress, upsertReadingCourseProgress } from '../services/reading/courseProgressService.js';
import {
  getReadingPracticePassages,
  getReadingPracticeQuestions,
  getReadingPracticeStats,
  getReadingPracticeStatsByUserIds,
  listReadingPracticeCatalog,
  saveReadingPracticeRecord,
} from '../services/reading/practiceService.js';
import { generateReadingQuiz, handleQuizError } from '../services/reading/quizService.js';
import { logError } from '../utils/logger.js';
import {
  readingCourseProgressBodySchema,
  readingPracticeRecordBodySchema,
  readingQuizBodySchema,
} from '../utils/schemas/readingSchemas.js';

const router = Router();

router.get('/practice/catalog', (_req, res) => {
  return res.json({ code: 200, msg: 'ok', data: listReadingPracticeCatalog() });
});

router.get('/practice/passages', (req, res) => {
  const data = getReadingPracticePassages({
    genre: req.query.genre,
    count: req.query.count,
    systemId: req.query.systemId,
  });
  return res.json({ code: 200, msg: 'ok', data });
});

router.get('/practice/questions', (req, res) => {
  const data = getReadingPracticeQuestions({
    type: req.query.type,
    count: req.query.count,
    systemId: req.query.systemId,
  });
  return res.json({ code: 200, msg: 'ok', data });
});

router.post('/practice/records', requireAuth, validateRequest({ body: readingPracticeRecordBodySchema }), async (req, res, next) => {
  try {
    const data = await saveReadingPracticeRecord({
      userId: req.user.id,
      ...req.validated.body,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

router.get('/practice/progress', requireAuth, async (req, res, next) => {
  try {
    const [practice, analyses, courseProgress] = await Promise.all([
      getReadingPracticeStats(req.user.id),
      getReadingAnalysisStats(req.user.id),
      getReadingCourseProgress(req.user.id),
    ]);
    const data = { ...practice, analyses, courseProgress };
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.get('/courses/progress', requireAuth, async (req, res, next) => {
  try {
    const data = await getReadingCourseProgress(req.user.id);
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.post('/courses/progress', requireAuth, validateRequest({ body: readingCourseProgressBodySchema }), async (req, res, next) => {
  try {
    const data = await upsertReadingCourseProgress({ userId: req.user.id, ...req.validated.body });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

router.get('/analyses/:id', requireAuth, async (req, res, next) => {
  try {
    const data = await getReadingAnalysisRecord({ userId: req.user.id, analysisId: req.params.id });
    if (!data) return res.status(404).json({ code: 404, msg: '阅读分析记录不存在' });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.get('/teacher/class-progress', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const { classId } = req.query;
    if (!classId) return res.status(400).json({ code: 400, msg: '缺少 classId' });

    const students = await listClassStudentsForTeacher({ teacherId: req.user.id, classId });
    const studentIds = students.map((student) => student.id);
    const [practiceStats, analysisStats] = await Promise.all([
      getReadingPracticeStatsByUserIds(studentIds),
      getReadingAnalysisStatsByUserIds(studentIds),
    ]);

    const data = students.map((student) => ({
      id: student.id,
      realName: student.realName || student.name || '未命名',
      studentNo: student.studentNo || '',
      readingStats: {
        ...(practiceStats[student.id] || {
          sessions: 0,
          passages: 0,
          totalQuestions: 0,
          correctQuestions: 0,
          accuracy: 0,
          wrongQuestions: 0,
          lastPracticedAt: null,
        }),
        analyses: analysisStats[student.id] || { total: 0, lastAnalyzedAt: null },
      },
    }));

    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

async function consumeReadingEntitlement(req) {
  if (!req.user?.id) return null;

  const sourceId = req.requestId || `reading_analyze:${Date.now()}`;
  const unit = 'reading_analysis';
  const baseConsumption = { userId: req.user.id, unit, amount: 1, sourceType: 'reading_analyze', sourceId };
  const result = await consumeEntitlement({
    userId: req.user.id,
    unit,
    amount: 1,
    reason: 'feature_usage',
    sourceType: 'reading_analyze',
    sourceId,
    metadata: { feature: 'reading_analyze' },
  });
  return { ...baseConsumption, ...result };
}

async function refundReadingEntitlement(consumption) {
  if (!consumption?.consumed) return;

  try {
    await refundEntitlement({ ...consumption, metadata: { failedFeature: 'reading_analyze' } });
  } catch (refundError) {
    logError('entitlement_refund_failed', {
      message: refundError.message,
      userId: consumption.userId,
      unit: consumption.unit,
      sourceType: consumption.sourceType,
      sourceId: consumption.sourceId,
    });
  }
}

async function recordAIUsageEventSafely({ feature, req }) {
  try {
    await recordAIUsageEvent({ feature, user: req.user, source: req.requestId });
  } catch (usageError) {
    logError('ai_usage_event_record_failed', {
      message: usageError.message,
      feature,
      requestId: req.requestId,
      userId: req.user?.id,
    });
  }
}

async function persistReadingAnalysisRecord({ req, data, passage, questions, entitlementConsumption }) {
  try {
    const record = await saveReadingAnalysisRecord({
      userId: req.user?.id,
      passage,
      questions,
      result: data,
      entitlementLedgerId: entitlementConsumption?.ledgerId || null,
      sourceId: entitlementConsumption?.sourceId || req.requestId || null,
    });
    if (record?.id) data.analysisId = record.id;
  } catch (recordError) {
    logError('reading_analysis_record_save_failed', {
      message: recordError.message,
      requestId: req.requestId,
      userId: req.user?.id,
    });
  }
}

async function handleAnalyzeReadingRequest(req, res) {
  let entitlementConsumption = null;
  const { passage } = req.body || {};
  const questions = typeof req.body?.questions === 'string' ? req.body.questions : '';
  if (!passage || typeof passage !== 'string' || !passage.trim()) {
    return res.status(400).json({ code: 400, msg: '请提供阅读文章' });
  }

  const trimmedPassage = passage.slice(0, 8000);
  const trimmedQuestions = questions.slice(0, 4000);

  try {
    await assertAIBudgetAvailable({ feature: 'reading_analyze', user: req.user });
    entitlementConsumption = await consumeReadingEntitlement(req);
    const data = await analyzeReading({
      passage: trimmedPassage,
      questions: trimmedQuestions,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    await persistReadingAnalysisRecord({
      req,
      data,
      passage: trimmedPassage,
      questions: trimmedQuestions,
      entitlementConsumption,
    });
    await recordAIUsageEventSafely({ feature: 'reading_analyze', req });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    await refundReadingEntitlement(entitlementConsumption);
    const { status, msg } = handleAnalyzeError(err, { requestId: req.requestId, userId: req.user?.id });
    return res.status(status).json({ code: status, msg });
  }
}

router.post(
  '/analyze',
  optionalAuth,
  enforceGuestAIBudget('reading_analyze'),
  handleAnalyzeReadingRequest,
);

router.post('/quiz', optionalAuth, validateRequest({ body: readingQuizBodySchema }), enforceGuestAIBudget('reading_quiz'), async (req, res) => {
  try {
    await assertAIBudgetAvailable({ feature: 'reading_quiz', user: req.user });
    const quiz = await generateReadingQuiz({
      ...req.validated.body,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    await recordAIUsageEventSafely({ feature: 'reading_quiz', req });
    return res.json({ code: 200, msg: 'ok', data: quiz });
  } catch (err) {
    const { status, msg } = handleQuizError(err, { requestId: req.requestId, userId: req.user?.id });
    return res.status(status).json({ code: status, msg });
  }
});

export default router;
