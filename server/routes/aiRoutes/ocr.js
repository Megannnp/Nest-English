import { Router } from 'express';

import { enforceGuestAIBudget } from '../../middleware/aiGuestBudget.js';
import { optionalAuth } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from '../../services/adminControlService.js';
import { recognizeTextFromImage } from '../../services/aiOcrService.js';
import {
  classifyAIError,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../../services/aiProviderService.js';
import { logError } from '../../utils/logger.js';
import { assertEnum } from '../../utils/routeValidation.js';
import { recognizeTextBodySchema } from '../../utils/schemas/aiSchemas.js';

const router = Router();

router.post(
  '/recognize-text',
  optionalAuth,
  enforceGuestAIBudget('recognize_text'),
  validateRequest({ body: recognizeTextBodySchema }),
  async (req, res) => {
    try {
      const { image, type } = req.validated.body;
      assertEnum(type, ['student_writing', 'question_requirements'], '识别类型无效');

      await ensureAICircuitAvailable('recognize_text');
      await assertAIBudgetAvailable({ feature: 'recognize_text', user: req.user });
      const { text, detectedName } = await recognizeTextFromImage({ image, type });
      await recordAISuccess('recognize_text');
      await recordAIUsageEvent({ feature: 'recognize_text', user: req.user, source: req.requestId });
      return res.json({ code: 200, data: { text, detectedName } });
    } catch (err) {
      if (err.status && err.status < 500) {
        return res.status(err.status).json({
          code: err.status,
          msg: err.message,
        });
      }
      const errorInfo = classifyAIError(err);
      void recordAIFailure(err, 'recognize_text');
      logError('ai_ocr_failed', {
        errorCode: errorInfo.code,
        message: err.message,
        requestId: req.requestId,
        userId: req.user?.id,
      });
      return res.status(errorInfo.status).json({
        code: errorInfo.status,
        msg: `图片识别失败：${err.message}`,
        errorCode: errorInfo.code,
      });
    }
  },
);

export default router;
