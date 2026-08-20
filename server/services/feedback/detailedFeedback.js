import { AppError, ConflictError } from '../../utils/appError.js';
import { safeJsonParse } from '../../utils/writingFeedback.js';
import {
  callVolcengineAI,
  classifyAIError,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../aiProviderService.js';
import { parseAIJsonPayload } from '../aiService.js';
import {
  repairContinuationSampleEssay,
  resolveContinuationStartersForRow,
  validateContinuationSampleEssay,
} from './continuationSample.js';
import { buildDetailedPrompt } from './detailedPrompt.js';

/**
 * Validates and (if necessary) repairs the sampleEssay inside a detailed
 * feedback payload for continuation writing.
 *
 * @param {object} parsed - AI-returned detailed feedback payload
 * @param {object} row - writing row (provides prompt_text for starter extraction)
 * @param {Function} repairEssay - async function called with { sampleEssay, row } → repaired essay
 * @returns {Promise<object>} - possibly repaired payload
 */
export async function ensureValidContinuationDetailedFeedback(
  parsed,
  row,
  repairEssay = repairContinuationSampleEssay
) {
  const promptText = row?.prompt_text || '';
  // Prefer the pre-parsed DB column so validation uses the same starters as repair.
  const structuredStarters = await resolveContinuationStartersForRow(row);

  const validation = validateContinuationSampleEssay(parsed?.sampleEssay, promptText, structuredStarters);

  if (validation.valid) return parsed;

  const repairedEssay = await repairEssay({ sampleEssay: parsed?.sampleEssay, row });
  const nextParsed = repairedEssay ? { ...parsed, sampleEssay: repairedEssay } : parsed;
  const finalValidation = validateContinuationSampleEssay(nextParsed?.sampleEssay, promptText, structuredStarters);

  if (!finalValidation.valid) {
    throw new Error(`续写详细反馈范文校验失败：${finalValidation.issues.join('；')}`);
  }
  return nextParsed;
}

export async function generateDetailedFeedbackResult(row) {
  const feedback = safeJsonParse(row?.feedback, null);
  if (!feedback) {
    throw new ConflictError('当前作文还没有可用反馈，暂时无法生成详细反馈');
  }

  await ensureAICircuitAvailable('detailed_feedback');
  const prompt = buildDetailedPrompt({ row, feedback });
  try {
    const content = await callVolcengineAI(
      process.env.AI_DEFAULT_MODEL,
      [
        { role: 'system', content: '你只负责生成合法 JSON 的英语作文详细反馈。' },
        { role: 'user', content: prompt },
      ],
      8192,
      0.15
    );
    let parsed = parseAIJsonPayload(content);
    await recordAISuccess('detailed_feedback');

    const isContinuation =
      (row?.selected_type || row?.type || '').toLowerCase() === 'continuation';
    if (isContinuation) {
      parsed = await ensureValidContinuationDetailedFeedback(parsed, row);
    }

    return parsed;
  } catch (error) {
    void recordAIFailure(error, 'detailed_feedback');
    const fallback = classifyAIError(error);
    throw new AppError(error.message || 'AI精批生成失败', {
      status: error.status || fallback.status,
      code: error.errorCode || fallback.code,
    });
  }
}
