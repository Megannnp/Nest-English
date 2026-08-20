import { Router } from 'express';

import { requireAuth } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from '../../services/adminControlService.js';
import {
  classifyAIError,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../../services/aiProviderService.js';
import { normalizeWritingType as normalizeWritingTypeService } from '../../services/aiTagAnalysisService.js';
import { findReusableQuestionAnalysis } from '../../services/questionAnalysisCacheService.js';
import { generateQuestionAnalysisResult } from '../../services/questionAnalysisService.js';
import { logError } from '../../utils/logger.js';
import { optionalTrimmedString } from '../../utils/routeValidation.js';
import { questionAnalysisBodySchema } from '../../utils/schemas/aiSchemas.js';

const router = Router();

router.post('/question-analysis', requireAuth, validateRequest({ body: questionAnalysisBodySchema }), async (req, res) => {
  try {
    const body = req.validated.body;
    const type = optionalTrimmedString(body.type, 32);
    const questionId = optionalTrimmedString(body.questionId, 64);
    const title = optionalTrimmedString(body.title, 200);
    const promptText = optionalTrimmedString(body.promptText, 10000);
    const studentText = optionalTrimmedString(body.studentText, 20000);
    const aiAnalysis = body.aiAnalysis && typeof body.aiAnalysis === 'object'
      ? body.aiAnalysis
      : null;
    const normalizedType = normalizeWritingTypeService(type || aiAnalysis?.type);

    if (!promptText.trim() && !studentText.trim() && !title.trim()) {
      return res.status(400).json({ code: 400, msg: '题目分析缺少必要内容' });
    }

    await ensureAICircuitAvailable('question_analysis');

    const reusableAnalysis = await findReusableQuestionAnalysis({
      questionId,
      promptText,
      type: normalizedType,
    });
    if (reusableAnalysis) {
      await recordAISuccess('question_analysis');
      return res.json({ code: 200, msg: 'ok', data: reusableAnalysis });
    }

    await assertAIBudgetAvailable({ feature: 'question_analysis', user: req.user });
    const data = await generateQuestionAnalysisResult({
      type: normalizedType,
      title,
      promptText,
      studentText,
      aiAnalysis,
    });

    await recordAISuccess('question_analysis');
    await recordAIUsageEvent({ feature: 'question_analysis', user: req.user, source: req.requestId });
    return res.json({ code: 200, msg: 'ok', data });
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({
        code: err.status,
        msg: err.message,
        data: null,
      });
    }
    const errorInfo = classifyAIError(err);
    void recordAIFailure(err, 'question_analysis');
    logError('ai_question_analysis_failed', {
      errorCode: errorInfo.code,
      message: err.message,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    return res.status(errorInfo.status).json({
      code: errorInfo.status,
      msg: `题目分析生成失败：${err.message}`,
      errorCode: errorInfo.code,
      data: null,
    });
  }
});

export default router;
