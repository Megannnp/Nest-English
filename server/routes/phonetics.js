import { Router } from 'express';

import { enforceGuestAIBudget } from '../middleware/aiGuestBudget.js';
import { optionalAuth, requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validate.js';
import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from '../services/adminControlService.js';
import { listClassStudentsForTeacher } from '../services/classService.js';
import { analyzePhoneticText, handleAnalyzeError } from '../services/phonetics/annotatorService.js';
import { analyzePhoneticWord, handleAnalyzeError as handleWordAnalyzeError } from '../services/phonetics/wordAnalyzerService.js';
import {
  getPhoneticsProgressStats,
  getPhoneticsProgressStatsByUserIds,
  savePhoneticsProgressRecord,
} from '../services/phoneticsProgressService.js';
import { consumeEntitlement, refundEntitlement } from '../services/pointsService.js';
import { logError } from '../utils/logger.js';
import { phoneticsAnalyzeBodySchema, phoneticsWordBodySchema } from '../utils/schemas/phoneticsSchemas.js';

const router = Router();

async function consumePhoneticsEntitlement(req) {
  if (!req.user?.id) return null;

  const sourceId = req.requestId || `phonetics_analyze:${Date.now()}`;
  const unit = 'sentence_analysis';
  const baseConsumption = { userId: req.user.id, unit, amount: 1, sourceType: 'phonetics_analyze', sourceId };
  const result = await consumeEntitlement({
    userId: req.user.id,
    unit,
    amount: 1,
    reason: 'feature_usage',
    sourceType: 'phonetics_analyze',
    sourceId,
    metadata: { feature: 'phonetics_analyze' },
  });
  return { ...baseConsumption, ...result };
}

async function refundPhoneticsEntitlement(consumption) {
  if (!consumption?.consumed) return;

  try {
    await refundEntitlement({ ...consumption, metadata: { failedFeature: 'phonetics_analyze' } });
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

router.post('/analyze', optionalAuth, validateRequest({ body: phoneticsAnalyzeBodySchema }), enforceGuestAIBudget('phonetics_analyze'), async (req, res) => {
  let entitlementConsumption = null;
  try {
    await assertAIBudgetAvailable({ feature: 'phonetics_analyze', user: req.user });
    entitlementConsumption = await consumePhoneticsEntitlement(req);
    const data = await analyzePhoneticText({
      text: req.validated.body.text,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    await recordAIUsageEvent({ feature: 'phonetics_analyze', user: req.user, source: req.requestId });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    await refundPhoneticsEntitlement(entitlementConsumption);
    const { status, msg } = handleAnalyzeError(err, { requestId: req.requestId, userId: req.user?.id });
    return res.status(status).json({ success: false, msg });
  }
});

router.post('/word', optionalAuth, validateRequest({ body: phoneticsWordBodySchema }), enforceGuestAIBudget('phonetics_word_analyze'), async (req, res) => {
  try {
    await assertAIBudgetAvailable({ feature: 'phonetics_word_analyze', user: req.user });
    const data = await analyzePhoneticWord({
      word: req.validated.body.word,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    await recordAIUsageEvent({ feature: 'phonetics_word_analyze', user: req.user, source: req.requestId });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    const { status, msg } = handleWordAnalyzeError(err, { requestId: req.requestId, userId: req.user?.id });
    return res.status(status).json({ success: false, msg });
  }
});

router.post('/progress/records', requireAuth, async (req, res, next) => {
  try {
    const data = await savePhoneticsProgressRecord({
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
    const data = await getPhoneticsProgressStats(req.user.id);
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.get('/teacher/class-progress', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const students = await listClassStudentsForTeacher({ teacherId: req.user.id, classId: req.query.classId });
    const studentIds = students.map((student) => student.id);
    const stats = await getPhoneticsProgressStatsByUserIds(studentIds);

    const data = students.map((student) => ({
      id: student.id,
      realName: student.realName || student.name || '未命名',
      studentNo: student.studentNo || '',
      phoneticsStats: stats[student.id] || { sessions: 0, durationMs: 0, averageScore: 0, averageAccuracy: 0, lastPracticedAt: null },
    }));

    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

export default router;
