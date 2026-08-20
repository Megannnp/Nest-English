import { callVolcengineAI } from './aiProviderService.js';
import { parseAIJsonPayload } from './aiService.js';
import { normalizeWritingType } from './aiTagAnalysisService.js';
import {
  buildContinuationCorePrompt,
  buildContinuationDetailPrompt,
  buildQuestionAnalysisPrompt,
  buildQuestionAnalysisRepairPrompt,
} from './questionAnalysisPromptService.js';
import {
  createQuestionAnalysisTimer,
  hasUsableQuestionAnalysis,
  mergeQuestionAnalysis,
  sanitizeQuestionAnalysisResult,
  validateQuestionAnalysis,
} from './questionAnalysisResultService.js';
import { logInfo, logWarn } from '../utils/logger.js';

async function withPromiseTimeout(promise, ms, label = '请求超时') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function _buildAnalysisUserPrompt(title, promptText, studentText, aiAnalysis, normalizedType) {
  return `【写作标题】
${title || '（无）'}

【题目要求/材料】
${promptText || '（无）'}

【学生作文】
${studentText || '（无）'}

【已有题型识别】
${JSON.stringify(aiAnalysis || { type: normalizedType }, null, 2)}
`;
}

function _buildAnalysisResult(normalizedType, parsed, aiAnalysis, baseMeta, status) {
  return {
    type: normalizedType,
    status,
    themes: aiAnalysis?.themes || parsed?.themes || [],
    reason: parsed?.reason || aiAnalysis?.reason || '',
    ...parsed,
    meta: baseMeta,
  };
}

export async function generateQuestionAnalysisResult(
  { type, title, promptText, studentText, aiAnalysis },
  dependencies = {}
) {
  const normalizedType = normalizeWritingType(type || aiAnalysis?.type);
  const timer = createQuestionAnalysisTimer();
  const runModel = dependencies.callAI || callVolcengineAI;
  const parsePayload = dependencies.parsePayload || parseAIJsonPayload;
  const userPrompt = _buildAnalysisUserPrompt(title, promptText, studentText, aiAnalysis, normalizedType);

  const runAnalysis = async (stageName, systemPrompt, overrides = {}) => {
    const analysisConfig = normalizedType === 'continuation'
      ? { maxTokens: 3200, timeoutMs: 26000, ...overrides }
      : { maxTokens: 2400, timeoutMs: 16000, ...overrides };

    const stageStartedAt = Date.now();
    const raw = await withPromiseTimeout(
      runModel(
        undefined,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        analysisConfig.maxTokens,
        0.15,
      ),
      analysisConfig.timeoutMs,
      '题目分析生成超时',
    );
    const parsedPayload = parsePayload(raw || '');
    timer.record(stageName, Date.now() - stageStartedAt, {
      maxTokens: analysisConfig.maxTokens,
      timeoutMs: analysisConfig.timeoutMs,
    });
    return parsedPayload;
  };

  let parsed;
  if (normalizedType === 'continuation') {
    const core = await runAnalysis('continuation_core', buildContinuationCorePrompt(), { maxTokens: 2400, timeoutMs: 18000 });
    try {
      const detail = await runAnalysis('continuation_detail', buildContinuationDetailPrompt(core), { maxTokens: 2600, timeoutMs: 22000 });
      parsed = mergeQuestionAnalysis(core, detail);
    } catch (detailError) {
      logWarn('question_analysis_detail_failed', { message: detailError.message });
      timer.record('continuation_detail_failed', 0, { error: detailError.message });
      parsed = { ...core, status: 'partial' };
    }
  } else {
    parsed = await runAnalysis('generic_analysis', buildQuestionAnalysisPrompt(normalizedType));
  }

  let validation = validateQuestionAnalysis(normalizedType, parsed);

  if (!validation.valid) {
    try {
      parsed = await runAnalysis(
        'repair_analysis',
        `${buildQuestionAnalysisPrompt(normalizedType)}\n\n${buildQuestionAnalysisRepairPrompt(normalizedType, validation.missing)}`
      );
      validation = validateQuestionAnalysis(normalizedType, parsed);
    } catch (repairError) {
      logWarn('question_analysis_repair_failed', { message: repairError.message });
      timer.record('repair_analysis_failed', 0, { error: repairError.message });
    }
  }

  const sanitized = sanitizeQuestionAnalysisResult(normalizedType, parsed, aiAnalysis);
  parsed = sanitized.data;
  validation = validateQuestionAnalysis(normalizedType, parsed);

  const baseMeta = timer.snapshot({
    schema: {
      valid: validation.valid,
      missing: validation.missing,
      sanitized: sanitized.sanitized,
      issues: sanitized.issues,
    },
  });

  if (!validation.valid) {
    if (hasUsableQuestionAnalysis(normalizedType, parsed)) {
      const result = _buildAnalysisResult(normalizedType, parsed, aiAnalysis, baseMeta, 'partial');
      logInfo('question_analysis_stage_timing', { type: normalizedType, status: result.status, meta: result.meta });
      return result;
    }
    throw new Error(`题目分析字段缺失：${validation.missing.join(', ')}`);
  }

  const result = _buildAnalysisResult(normalizedType, parsed, aiAnalysis, baseMeta, 'ready');
  logInfo('question_analysis_stage_timing', { type: normalizedType, status: result.status, meta: result.meta });
  return result;
}
