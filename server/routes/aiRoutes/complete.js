import { Router } from 'express';

import { requireAuth } from '../../middleware/authMiddleware.js';
import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from '../../services/adminControlService.js';
import {
  executeCompletion,
  executeStreamingCompletion,
  validateCompletionMessages,
  validateCompletionUserContent,
} from '../../services/aiCompletionService.js';
import {
  classifyAIError,
  ensureAICircuitAvailable,
} from '../../services/aiProviderService.js';
import { normalizeAIRequestPayload } from '../../services/aiService.js';
import {
  endSSE,
  initSSE,
  writeSSE,
  writeSSEError,
} from '../../services/sseResponseService.js';
import { logError } from '../../utils/logger.js';
import { assertEnum } from '../../utils/routeValidation.js';

const router = Router();

router.post('/complete-stream', requireAuth, async (req, res) => {
  try {
    const {
      model, max_tokens, temperature, messages,
      persistWritingId, persistMode, persistFeedbackMeta,
    } = normalizeAIRequestPayload(req.body);
    const validation = validateCompletionMessages(messages);

    if (!validation.valid) {
      initSSE(res);
      writeSSEError(res, validation.msg);
      return res.end();
    }

    assertEnum(persistMode, ['grading'], '不支持的持久化模式');
    await ensureAICircuitAvailable('complete_stream');
    await assertAIBudgetAvailable({ feature: 'complete_stream', user: req.user });

    const contentValidation = validateCompletionUserContent(messages);
    if (!contentValidation.valid) {
      initSSE(res);
      writeSSEError(res, contentValidation.msg);
      return res.end();
    }

    initSSE(res);

    const result = await executeStreamingCompletion({
      user: req.user,
      model,
      max_tokens,
      temperature,
      messages,
      persistWritingId,
      persistFeedbackMeta,
      onChunk: (payload) => writeSSE(res, payload),
      onRequestClose: (cancel) => req.on('close', cancel),
    });

    if (result?.cancelled) return;
    await recordAIUsageEvent({ feature: 'complete_stream', user: req.user, source: req.requestId });
    endSSE(res, result);
  } catch (err) {
    if (err.status && err.status < 500) {
      if (!res.headersSent) {
        res.status(err.status).json({
          code: err.status,
          msg: err.message,
        });
        return;
      }
      writeSSEError(res, err.message);
      return res.end();
    }
    const errorCode = err.errorCode || classifyAIError(err).code;
    logError('ai_stream_completion_failed', {
      errorCode,
      message: err.message,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    if (!res.headersSent) {
      initSSE(res);
    }
    writeSSEError(res, '服务器内部错误，请稍后重试', errorCode);
    res.end();
  }
});

router.post('/complete', requireAuth, async (req, res) => {
  try {
    const {
      model, max_tokens, temperature, messages,
      persistWritingId, persistMode, persistFeedbackMeta,
    } = normalizeAIRequestPayload(req.body);
    const validation = validateCompletionMessages(messages);
    if (!validation.valid) {
      return res.status(400).json({ code: 400, success: false, msg: validation.msg });
    }
    assertEnum(persistMode, ['grading'], '不支持的持久化模式');
    await ensureAICircuitAvailable('complete');
    await assertAIBudgetAvailable({ feature: 'complete', user: req.user });
    const result = await executeCompletion({
      user: req.user,
      model,
      max_tokens,
      temperature,
      messages,
      persistWritingId,
      persistFeedbackMeta,
    });
    await recordAIUsageEvent({ feature: 'complete', user: req.user, source: req.requestId });
    return res.json(result);
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({
        code: err.status,
        msg: err.message,
      });
    }
    const fallback = classifyAIError(err);
    const status = err.status || fallback.status;
    const errorCode = err.errorCode || fallback.code;
    logError('ai_completion_failed', {
      errorCode,
      message: err.message,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    return res.status(status).json({
      code: status,
      msg: '服务器内部错误，请稍后重试',
      errorCode,
    });
  }
});

export default router;
