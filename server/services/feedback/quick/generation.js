import { getQuickFeedbackAIClient } from './aiClient.js';
import { QUICK_FEEDBACK_TIMEOUT_MS, latestQueuedOrCreatedAt } from './shared.js';
import { withTimeout } from './timeout.js';
import { safeJsonParse } from '../../../utils/writingFeedback.js';
import {
  classifyAIError,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../../aiProviderService.js';
import {
  normalizeWritingType,
  parseAIJsonPayload,
  persistAuthoritativeGradingResult,
} from '../../aiService.js';
import {
  markWritingTaskFailed,
  markWritingTaskHeartbeat,
  markWritingTaskRunning,
} from '../../writingTaskService.js';
import { buildQuickFeedbackContext } from '../ai.js';
import { recordQuickFeedbackOutcome, summarizeInputMetrics } from '../metrics.js';
import { WRITING_TASK_TYPE } from '../query.js';
import { loadWritingById } from '../repository.js';

function _buildGradingPayload(row, aiAnalysis) {
  return {
    writingType: normalizeWritingType(row.selected_type || aiAnalysis?.type || 'general'),
    staged: 'quick',
  };
}

async function _handleGenerationFailure(error, { writingId, runningTask, row, aiAnalysis, startedAt, inputMetrics }) {
  void recordAIFailure(error, 'grading');
  const errorCode = classifyAIError(error).code;
  await markWritingTaskFailed({
    writingId,
    taskType: WRITING_TASK_TYPE.GRADING,
    queueName: 'grading',
    attempts: 1,
    payload: _buildGradingPayload(row, aiAnalysis),
    errorMessage: error.message || '快速反馈生成失败',
  });
  if (errorCode === 'AI_TIMEOUT') {
    recordQuickFeedbackOutcome('timeout', {
      writingId,
      taskId: runningTask?.id || null,
      durationMs: Date.now() - startedAt,
      inputChars: inputMetrics.totalChars,
    });
  }
  if (String(error.message || '').includes('AI 返回格式错误')) {
    recordQuickFeedbackOutcome('invalid_json', {
      writingId,
      taskId: runningTask?.id || null,
      durationMs: Date.now() - startedAt,
      inputChars: inputMetrics.totalChars,
    });
  }
  recordQuickFeedbackOutcome('failed', {
    writingId,
    taskId: runningTask?.id || null,
    durationMs: Date.now() - startedAt,
    errorMessage: error.message || '快速反馈生成失败',
    errorCode,
    inputChars: inputMetrics.totalChars,
    hasImage: inputMetrics.hasImage,
  });
}

export async function runQuickFeedbackGeneration({ writingId, user }) {
  const row = await loadWritingById(writingId);
  if (!row) return;

  const feedback = safeJsonParse(row.feedback, null);
  const { aiAnalysis, systemPrompt, userContent, inputMetrics } =
    buildQuickFeedbackContext(row, feedback, summarizeInputMetrics, { user });

  const startedAt = Date.now();
  const runningTask = await markWritingTaskRunning({
    writingId,
    taskType: WRITING_TASK_TYPE.GRADING,
    queueName: 'grading',
    attempts: 1,
    payload: _buildGradingPayload(row, aiAnalysis),
  });

  try {
    await ensureAICircuitAvailable('grading');
    recordQuickFeedbackOutcome('started', {
      writingId,
      taskId: runningTask?.id || null,
      queueDelayMs: startedAt - Number(latestQueuedOrCreatedAt(row, runningTask) || startedAt),
      inputChars: inputMetrics.totalChars,
      hasImage: inputMetrics.hasImage,
    });
    const heartbeat = setInterval(() => {
      void markWritingTaskHeartbeat(runningTask?.id);
    }, 4000);
    try {
      const callQuickFeedbackAI = getQuickFeedbackAIClient();
      const quickContent = await withTimeout(
        callQuickFeedbackAI(
          process.env.AI_DEFAULT_MODEL,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          12288,
          0.1
        ),
        QUICK_FEEDBACK_TIMEOUT_MS,
        `快速反馈生成超时（${Math.round(QUICK_FEEDBACK_TIMEOUT_MS / 1000)}s）`
      );
      const quickParsed = parseAIJsonPayload(quickContent);
      await persistAuthoritativeGradingResult({
        user,
        writingId,
        rawContent: JSON.stringify(quickParsed),
        feedbackMeta: { aiAnalysis },
      });
      await recordAISuccess('grading');
      recordQuickFeedbackOutcome('succeeded', {
        writingId,
        taskId: runningTask?.id || null,
        durationMs: Date.now() - startedAt,
        inputChars: inputMetrics.totalChars,
        hasImage: inputMetrics.hasImage,
      });
    } finally {
      clearInterval(heartbeat);
    }
  } catch (error) {
    await _handleGenerationFailure(error, { writingId, runningTask, row, aiAnalysis, startedAt, inputMetrics });
  }
}
