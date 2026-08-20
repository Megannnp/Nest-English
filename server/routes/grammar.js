/* eslint-disable complexity */
import { Router } from 'express';

import { enforceGuestAIBudget } from '../middleware/aiGuestBudget.js';
import { optionalAuth, requireAuth, requireTeacher } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validate.js';
import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from '../services/adminControlService.js';
import {
  executeCompletion,
  validateCompletionMessages,
  validateCompletionUserContent,
} from '../services/aiCompletionService.js';
import {
  classifyAIError,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../services/aiProviderService.js';
import { normalizeAIRequestPayload } from '../services/aiService.js';
import { listClassesForTeacher, listClassStudentsForTeacher } from '../services/classService.js';
import { analyzeGrammarSentence } from '../services/grammar/analyzerService.js';
import {
  createGrammarAssignment,
  listGrammarAssignmentsForTeacher,
  listGrammarAssignmentSubmissionsForTeacher,
  listGrammarTasksForStudent,
  submitGrammarAssignment,
} from '../services/grammar/assignmentService.js';
import { getCourseProgress, upsertCourseProgress } from '../services/grammar/courseProgressService.js';
import { generateGrammarPractice, handlePracticeGenerationError } from '../services/grammar/practiceGenerationService.js';
import { savePracticeRecord, getPracticeStats, getClassPracticeStats } from '../services/grammar/practiceRecordService.js';
import { generateGrammarQuiz, handleQuizError } from '../services/grammar/quizService.js';
import { generateSentenceTree, handleTreeError } from '../services/grammar/treeService.js';
import { listLearningFavorites, saveLearningFavorite } from '../services/learningFavoriteService.js';
import { consumeEntitlement, refundEntitlement } from '../services/pointsService.js';
import { logError } from '../utils/logger.js';
import {
  grammarAnalyzeBodySchema,
  grammarAssignmentCreateBodySchema,
  grammarAssignmentSubmitBodySchema,
  grammarCourseProgressBodySchema,
  grammarPracticeRecordBodySchema,
  grammarQuizBodySchema,
  grammarTreeBodySchema,
} from '../utils/schemas/grammarSchemas.js';

const router = Router();

function shouldSkipEntitlementConsumptionForTests() {
  return process.env.NODE_ENV === 'test';
}

function clampQueryInt(value, { defaultValue, min, max }) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

function isAllowedLegacyPracticePayload(body = {}) {
  return body.purpose === 'writing_refine_sentence';
}

async function refundConsumedEntitlement(consumption, metadata = {}) {
  if (!consumption?.consumed) return;
  try {
    await refundEntitlement({
      userId: consumption.userId,
      unit: consumption.unit,
      amount: consumption.amount,
      sourceType: consumption.sourceType,
      sourceId: consumption.sourceId,
      consumedBuckets: consumption.consumedBuckets,
      metadata,
    });
  } catch (error) {
    logError('entitlement_refund_failed', {
      message: error.message,
      userId: consumption.userId,
      unit: consumption.unit,
      sourceType: consumption.sourceType,
      sourceId: consumption.sourceId,
    });
  }
}

router.post('/analyze', optionalAuth, validateRequest({ body: grammarAnalyzeBodySchema }), enforceGuestAIBudget('grammar_analyze'), async (req, res, next) => {
  let entitlementConsumption = null;
  try {
    await assertAIBudgetAvailable({ feature: 'grammar_analyze', user: req.user });
    if (req.user?.id && !shouldSkipEntitlementConsumptionForTests()) {
      const sourceId = req.requestId || `grammar_analyze:${Date.now()}`;
      const unit = 'sentence_analysis';
      entitlementConsumption = { userId: req.user.id, unit, amount: 1, sourceType: 'grammar_analyze', sourceId };
      const result = await consumeEntitlement({
        userId: req.user.id,
        unit,
        amount: 1,
        reason: 'feature_usage',
        sourceType: 'grammar_analyze',
        sourceId,
        metadata: { feature: 'grammar_analyze' },
      });
      entitlementConsumption = { ...entitlementConsumption, ...result };
    }
    const analysis = await analyzeGrammarSentence({ ...req.validated.body, user: req.user });
    let treeData = null;
    if (req.validated.body.includeTree) {
      try {
        treeData = await generateSentenceTree({
          sentence: req.validated.body.sentence,
          user: req.user,
          requestId: req.requestId,
        });
      } catch (treeError) {
        logError('grammar_analyze_tree_failed', {
          message: treeError.message,
          requestId: req.requestId,
          userId: req.user?.id,
        });
      }
    }
    await recordAIUsageEvent({ feature: 'grammar_analyze', user: req.user, source: req.requestId });
    return res.json({ code: 200, msg: 'ok', data: { ...analysis, treeData } });
  } catch (error) {
    await refundConsumedEntitlement(entitlementConsumption, { failedFeature: 'grammar_analyze' });
    return next(error);
  }
});

router.post('/practice', optionalAuth, enforceGuestAIBudget('grammar_practice'), async (req, res) => {
  let entitlementConsumption = null;
  try {
    const usesStructuredPracticePayload = req.body?.grammarPoint || Array.isArray(req.body?.typeConfigs);
    if (!usesStructuredPracticePayload) {
      if (!isAllowedLegacyPracticePayload(req.body)) {
        return res.status(400).json({ success: false, msg: '请使用结构化语法练习参数' });
      }
      const { messages } = normalizeAIRequestPayload(req.body);
      const validation = validateCompletionMessages(messages);
      if (!validation.valid) return res.status(400).json({ success: false, msg: validation.msg });
      const contentValidation = validateCompletionUserContent(messages);
      if (!contentValidation.valid) return res.status(400).json({ success: false, msg: contentValidation.msg });
    }

    await assertAIBudgetAvailable({ feature: 'grammar_practice', user: req.user });
    if (req.user?.id && !shouldSkipEntitlementConsumptionForTests()) {
      const sourceId = req.requestId || `grammar_practice:${Date.now()}`;
      const unit = 'paper_generation';
      entitlementConsumption = { userId: req.user.id, unit, amount: 1, sourceType: 'grammar_practice', sourceId };
      const result = await consumeEntitlement({
        userId: req.user.id,
        unit,
        amount: 1,
        reason: 'feature_usage',
        sourceType: 'grammar_practice',
        sourceId,
        metadata: { feature: 'paper_generation' },
      });
      entitlementConsumption = { ...entitlementConsumption, ...result };
    }

    if (usesStructuredPracticePayload) {
      await ensureAICircuitAvailable('grammar_practice');
      const exercises = await generateGrammarPractice({
        ...req.body,
        user: req.user || null,
      });
      await recordAISuccess('grammar_practice');
      await recordAIUsageEvent({ feature: 'grammar_practice', user: req.user, source: req.requestId });
      return res.json({ code: 200, msg: 'ok', data: exercises });
    }

    await ensureAICircuitAvailable('grammar_practice');
    const { model, max_tokens, temperature, messages } = normalizeAIRequestPayload(req.body);
    const result = await executeCompletion({
      user: req.user || null, model, max_tokens, temperature, messages,
      extraParams: { response_format: { type: 'json_object' }, _nonStream: true },
    });
    await recordAISuccess('grammar_practice');
    await recordAIUsageEvent({ feature: 'grammar_practice', user: req.user, source: req.requestId });
    return res.json(result);
  } catch (err) {
    await refundConsumedEntitlement(entitlementConsumption, { failedFeature: 'paper_generation' });
    if (req.body?.grammarPoint || Array.isArray(req.body?.typeConfigs)) {
      const { status, msg, errorCode } = handlePracticeGenerationError(err, { requestId: req.requestId, userId: req.user?.id });
      return res.status(status).json({ success: false, msg, ...(errorCode ? { errorCode } : {}) });
    }
    if (err.status && err.status < 500) return res.status(err.status).json({ success: false, msg: err.message });
    void recordAIFailure(err, 'grammar_practice');
    const fallback = classifyAIError(err);
    logError('grammar_practice_generation_failed', { message: err.message, requestId: req.requestId, userId: req.user?.id });
    return res.status(err.status || fallback.status).json({ success: false, msg: err.message, errorCode: fallback.code });
  }
});

router.post('/quiz', optionalAuth, validateRequest({ body: grammarQuizBodySchema }), enforceGuestAIBudget('grammar_quiz'), async (req, res) => {
  try {
    // 在线测验只受 AI 总预算和游客预算限制；不消耗用户购买的题卷/句子分析权益。
    await assertAIBudgetAvailable({ feature: 'grammar_quiz', user: req.user });
    const questions = await generateGrammarQuiz({
      ...req.validated.body,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    await recordAIUsageEvent({ feature: 'grammar_quiz', user: req.user, source: req.requestId });
    return res.json({ code: 200, msg: 'ok', data: questions });
  } catch (err) {
    const { status, msg } = handleQuizError(err, { requestId: req.requestId, userId: req.user?.id });
    return res.status(status).json({ success: false, msg });
  }
});

router.post('/tree', optionalAuth, validateRequest({ body: grammarTreeBodySchema }), enforceGuestAIBudget('grammar_analyze'), async (req, res) => {
  let entitlementConsumption = null;
  try {
    await assertAIBudgetAvailable({ feature: 'grammar_tree', user: req.user });
    if (req.user?.id && !shouldSkipEntitlementConsumptionForTests()) {
      const sourceId = req.requestId || `grammar_tree:${Date.now()}`;
      const unit = 'sentence_analysis';
      entitlementConsumption = { userId: req.user.id, unit, amount: 1, sourceType: 'grammar_tree', sourceId };
      const result = await consumeEntitlement({
        userId: req.user.id,
        unit,
        amount: 1,
        reason: 'feature_usage',
        sourceType: 'grammar_tree',
        sourceId,
        metadata: { feature: 'grammar_tree' },
      });
      entitlementConsumption = { ...entitlementConsumption, ...result };
    }
    const treeData = await generateSentenceTree({
      sentence: req.validated.body.sentence,
      user: req.user,
      requestId: req.requestId,
    });
    await recordAIUsageEvent({ feature: 'grammar_tree', user: req.user, source: req.requestId });
    return res.json({ code: 200, msg: 'ok', data: treeData });
  } catch (err) {
    await refundConsumedEntitlement(entitlementConsumption, { failedFeature: 'grammar_tree' });
    const { status, msg, errorCode } = handleTreeError(err, { requestId: req.requestId, userId: req.user?.id });
    return res.status(status).json({ success: false, msg, ...(errorCode ? { errorCode } : {}) });
  }
});

router.post('/record', requireAuth, validateRequest({ body: grammarPracticeRecordBodySchema }), async (req, res, next) => {
  try {
    const { grammarPoint, quizType, stage, difficulty, correctCount, totalCount } = req.validated.body;
    if (correctCount > totalCount) {
      return res.status(400).json({ code: 400, msg: '答对题数不能大于总题数' });
    }
    const record = await savePracticeRecord({
      userId: req.user.id,
      grammarPoint,
      quizType,
      stage,
      difficulty,
      correctCount,
      totalCount,
    });
    return res.json({ code: 200, msg: 'ok', data: record });
  } catch (error) {
    return next(error);
  }
});

router.get('/progress', requireAuth, async (req, res, next) => {
  try {
    const stats = await getPracticeStats(req.user.id);
    return res.json({ code: 200, msg: 'ok', data: stats });
  } catch (error) {
    return next(error);
  }
});

router.get('/tasks/my', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.json({ code: 200, msg: 'ok', data: [] });
    const tasks = await listGrammarTasksForStudent({ student: req.user });
    return res.json({ code: 200, msg: 'ok', data: tasks });
  } catch (error) {
    return next(error);
  }
});

router.post('/tasks/:id/submit', requireAuth, validateRequest({ body: grammarAssignmentSubmitBodySchema }), async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ code: 403, msg: '只有学生可以提交语法任务' });
    if (req.validated.body.correctCount > req.validated.body.totalCount) {
      return res.status(400).json({ code: 400, msg: '答对题数不能大于总题数' });
    }
    const result = await submitGrammarAssignment({
      student: req.user,
      assignmentId: req.params.id,
      correctCount: req.validated.body.correctCount,
      totalCount: req.validated.body.totalCount,
    });
    return res.json({ code: 200, msg: 'ok', data: result });
  } catch (error) {
    return next(error);
  }
});

// Teacher: list their classes for grammar workbench
router.get('/teacher/classes', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const classes = await listClassesForTeacher(req.user.id);
    return res.json({ code: 200, msg: 'ok', data: classes });
  } catch (error) {
    return next(error);
  }
});

router.get('/teacher/assignments', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const assignments = await listGrammarAssignmentsForTeacher({
      teacherId: req.user.id,
      classId: req.query.classId || '',
      limit: clampQueryInt(req.query.limit, { defaultValue: 50, min: 1, max: 100 }),
      offset: clampQueryInt(req.query.offset, { defaultValue: 0, min: 0, max: 10000 }),
    });
    return res.json({ code: 200, msg: 'ok', data: assignments });
  } catch (error) {
    return next(error);
  }
});

router.get('/teacher/assignments/:id/submissions', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const data = await listGrammarAssignmentSubmissionsForTeacher({
      teacherId: req.user.id,
      assignmentId: req.params.id,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.post('/teacher/assignments', requireAuth, requireTeacher, validateRequest({ body: grammarAssignmentCreateBodySchema }), async (req, res, next) => {
  try {
    const assignment = await createGrammarAssignment({
      teacher: req.user,
      payload: req.validated.body,
    });
    return res.json({ code: 200, msg: 'ok', data: assignment });
  } catch (error) {
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

router.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    const data = await listLearningFavorites({
      userId: req.user.id,
      module: 'grammar',
      favoriteType: 'grammar-sentence',
      limit: req.query.limit,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

router.post('/favorites', requireAuth, async (req, res, next) => {
  try {
    const data = await saveLearningFavorite({
      userId: req.user.id,
      module: 'grammar',
      favoriteType: 'grammar-sentence',
      ...req.body,
    });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.status, msg: error.message });
    return next(error);
  }
});

router.post('/courses/progress', requireAuth, validateRequest({ body: grammarCourseProgressBodySchema }), async (req, res, next) => {
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

// Teacher: get grammar practice stats for all students in a class
router.get('/teacher/class-progress', requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const { classId } = req.query;
    if (!classId) return res.status(400).json({ code: 400, msg: '缺少 classId' });
    const students = await listClassStudentsForTeacher({ teacherId: req.user.id, classId });
    const studentIds = students.map((s) => s.id);
    const grammarStats = studentIds.length ? await getClassPracticeStats(studentIds) : {};
    const data = students.map((s) => ({
      id: s.id,
      realName: s.realName || s.name || '未命名',
      studentNo: s.studentNo || '',
      grammarStats: grammarStats[s.id] || { sessions: 0, totalQuestions: 0, correctQuestions: 0, distinctPoints: 0 },
    }));
    return res.json({ code: 200, msg: 'ok', data });
  } catch (error) {
    return next(error);
  }
});

export default router;
