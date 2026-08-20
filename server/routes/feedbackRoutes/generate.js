import { Router } from 'express';

import { loadWritingForFeedbackAccess } from './access.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import {
  assertAIBudgetAvailable,
  recordAIUsageEvent,
} from '../../services/adminControlService.js';
import { executeStreamingCompletion } from '../../services/aiCompletionService.js';
import { classifyAIError, ensureAICircuitAvailable } from '../../services/aiProviderService.js';
import { buildQuickFeedbackContext } from '../../services/feedback/ai.js';
import { summarizeInputMetrics } from '../../services/feedback/metrics.js';
import {
  requestDetailedFeedback,
  requestQuickFeedback,
  requestSupplementalFeedback,
} from '../../services/feedbackService.js';
import { consumeEntitlement, refundEntitlement } from '../../services/pointsService.js';
import { initSSE, writeSSE, writeSSEError, endSSE } from '../../services/sseResponseService.js';
import { logError } from '../../utils/logger.js';
import { safeJsonParse } from '../../utils/writingFeedback.js';

const router = Router();

function rejectTeacherDetailedFeedback(res, isOwner, message) {
  if (!isOwner) {
    res.status(403).json({ code: 403, msg: message });
    return true;
  }
  return false;
}

async function consumeWritingReview(userId, writingId, feature, requestId) {
  const sourceType = `writing_review_${feature}`;
  const sourceId = `${String(writingId).slice(0, 64)}:${String(requestId || Date.now()).slice(-48)}`;
  const unit = 'writing_review';
  const result = await consumeEntitlement({
    userId,
    unit,
    amount: 1,
    reason: 'feature_usage',
    sourceType,
    sourceId,
    metadata: { feature, writingId },
  });
  return { ...result, userId, unit, amount: 1, sourceType, sourceId };
}

async function refundWritingReview(consumption, writingId, failedFeature) {
  if (!consumption?.consumed) return;
  try {
    await refundEntitlement({
      userId: consumption.userId,
      unit: consumption.unit,
      amount: consumption.amount,
      sourceType: consumption.sourceType,
      sourceId: consumption.sourceId,
      consumedBuckets: consumption.consumedBuckets,
      metadata: { writingId, failedFeature },
    });
  } catch (error) {
    logError('entitlement_refund_failed', {
      message: error.message,
      userId: consumption.userId,
      unit: consumption.unit,
      sourceType: consumption.sourceType,
      sourceId: consumption.sourceId,
      writingId,
      failedFeature,
    });
  }
}

router.post('/writings/:id/feedback/quick', requireAuth, async (req, res, next) => {
  let consumption = null;
  let writingId = req.params.id;
  try {
    const { row } = await loadWritingForFeedbackAccess({
      writingId: req.params.id,
      user: req.user,
      forbiddenMessage: '无权限生成此写作的快速反馈',
    });

    writingId = row.id;
    const data = await requestQuickFeedback({
      row,
      user: req.user,
      onBeforeQueue: async () => {
        consumption = await consumeWritingReview(req.user.id, row.id, 'quick_feedback', req.requestId);
      },
    });
    res.status(202).json({ code: 202, msg: '快速反馈已加入后台生成', data });
  } catch (error) {
    await refundWritingReview(consumption, writingId, 'quick_feedback');
    next(error);
  }
});

router.post('/writings/:id/feedback/detailed', requireAuth, async (req, res, next) => {
  try {
    const { row, access } = await loadWritingForFeedbackAccess({
      writingId: req.params.id,
      user: req.user,
      forbiddenMessage: '无权限生成此写作的详细反馈',
    });

    if (req.user?.role === 'teacher' && rejectTeacherDetailedFeedback(res, access.isOwner, '教师端不直接触发学生作文的详细反馈')) {
      return;
    }

    let consumption = null;
    let data;
    try {
      data = await requestDetailedFeedback({
        row,
        requestedByUserId: req.user?.id,
        onBeforeQueue: async () => {
          consumption = await consumeWritingReview(req.user.id, row.id, 'detailed_feedback', req.requestId);
        },
      });
    } catch (error) {
      await refundWritingReview(consumption, row.id, 'detailed_feedback');
      throw error;
    }
    res.status(202).json({ code: 202, msg: '详细反馈已准备完成', data });
  } catch (error) {
    next(error);
  }
});

router.post('/writings/:id/feedback/detailed/retry', requireAuth, async (req, res, next) => {
  try {
    const { row, access } = await loadWritingForFeedbackAccess({
      writingId: req.params.id,
      user: req.user,
      forbiddenMessage: '无权限重试此写作的详细反馈',
    });

    if (req.user?.role === 'teacher' && rejectTeacherDetailedFeedback(res, access.isOwner, '教师端不直接重试学生作文的详细反馈')) {
      return;
    }

    let consumption = null;
    let data;
    try {
      data = await requestDetailedFeedback({
        row,
        requestedByUserId: req.user?.id,
        onBeforeQueue: async () => {
          consumption = await consumeWritingReview(req.user.id, row.id, 'detailed_feedback_retry', req.requestId);
        },
      });
    } catch (error) {
      await refundWritingReview(consumption, row.id, 'detailed_feedback_retry');
      throw error;
    }
    res.status(202).json({ code: 202, msg: '详细反馈已重新生成', data });
  } catch (error) {
    next(error);
  }
});

router.post('/writings/:id/feedback/quick-stream', requireAuth, async (req, res) => {
  let consumption = null;
  let writingId = req.params.id;
  try {
    const { row } = await loadWritingForFeedbackAccess({
      writingId: req.params.id,
      user: req.user,
      forbiddenMessage: '无权限生成此写作的快速反馈',
    });

    const feedback = safeJsonParse(row?.feedback, null);
    const { aiAnalysis, systemPrompt, userContent } = buildQuickFeedbackContext(
      row, feedback, summarizeInputMetrics, { user: req.user }
    );

    writingId = row.id;
    await assertAIBudgetAvailable({ feature: 'grading', user: req.user });
    consumption = await consumeWritingReview(req.user.id, row.id, 'quick_feedback_stream', req.requestId);
    await ensureAICircuitAvailable('grading');
    initSSE(res);

    const result = await executeStreamingCompletion({
      user: req.user,
      model: process.env.AI_DEFAULT_MODEL,
      max_tokens: 12288,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      persistWritingId: row.id,
      persistFeedbackMeta: { aiAnalysis },
      onChunk: (payload) => writeSSE(res, payload),
      onRequestClose: (cancel) => req.on('close', cancel),
    });

    // If the client disconnected mid-stream the result is marked cancelled;
    // skip writing to a response that is already closed.
    if (result?.cancelled) {
      await refundWritingReview(consumption, writingId, 'quick_feedback_stream_cancelled');
      return;
    }

    await recordAIUsageEvent({ feature: 'grading', user: req.user, source: req.requestId });
    endSSE(res, result);
  } catch (err) {
    await refundWritingReview(consumption, writingId, 'quick_feedback_stream');
    const errorCode = err.errorCode || classifyAIError(err).code;
    logError('quick_feedback_stream_failed', {
      writingId: req.params.id,
      message: err.message,
      requestId: req.requestId,
      userId: req.user?.id,
    });
    if (!res.headersSent) initSSE(res);
    writeSSEError(res, err.message || '快速反馈生成失败', errorCode);
    res.end();
  }
});

router.post('/writings/:id/feedback/supplemental/retry', requireAuth, async (req, res, next) => {
  try {
    const { row } = await loadWritingForFeedbackAccess({
      writingId: req.params.id,
      user: req.user,
      forbiddenMessage: '无权限重试此写作的完整精批补齐',
    });

    const data = await requestSupplementalFeedback({
      row,
      force: true,
      user: req.user,
    });
    res.status(202).json({ code: 202, msg: '完整精批补齐已重新加入后台生成', data });
  } catch (error) {
    next(error);
  }
});

export default router;
