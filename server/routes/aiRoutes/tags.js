import { Router } from 'express';

import { enforceGuestAIBudget } from '../../middleware/aiGuestBudget.js';
import { optionalAuth } from '../../middleware/authMiddleware.js';
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
import {
  analyzeTagsWithAI,
  buildHeuristicTagAnalysis as buildHeuristicTagAnalysisService,
} from '../../services/aiTagAnalysisService.js';
import { logError } from '../../utils/logger.js';
import { analyzeTagsBodySchema } from '../../utils/schemas/aiSchemas.js';

const router = Router();

router.post('/analyze-tags', optionalAuth, enforceGuestAIBudget('analyze_tags'), validateRequest({ body: analyzeTagsBodySchema }), async (req, res) => {
  try {
    const { title, content, requirements } = req.validated.body;

    if (!content.trim() && !title.trim() && !requirements.trim()) {
      return res.status(400).json({ code: 400, msg: '标题或内容不能都为空' });
    }

    await ensureAICircuitAvailable('analyze_tags');
    await assertAIBudgetAvailable({ feature: 'analyze_tags', user: req.user });
    const { result } = await analyzeTagsWithAI({ title, content, requirements });
    await recordAISuccess('analyze_tags');
    await recordAIUsageEvent({ feature: 'analyze_tags', user: req.user, source: req.requestId });
    return res.json({ code: 200, data: result });
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({
        code: err.status,
        msg: err.message,
        data: buildHeuristicTagAnalysisService(req.body || {}),
      });
    }
    const errorInfo = classifyAIError(err);
    void recordAIFailure(err, 'analyze_tags');
    logError('ai_tag_analysis_failed', {
      errorCode: errorInfo.code,
      message: err.message,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    const fallback = buildHeuristicTagAnalysisService(req.body || {});
    return res.status(200).json({
      code: 200,
      msg: `标签识别已降级为规则模式：${err.message}`,
      errorCode: errorInfo.code,
      data: fallback,
    });
  }
});

export default router;
