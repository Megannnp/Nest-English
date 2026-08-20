import { logError } from '../../utils/logger.js';
import { executeCompletion } from '../aiCompletionService.js';
import {
  classifyAIError,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../aiProviderService.js';
import { parseAIJsonPayload } from '../aiService.js';

const SYSTEM_PROMPT = `你是资深英语词汇教师，帮助中国高中生深入理解一个英文单词或短语。严格按照 JSON 格式返回，不要输出任何解释文字或 markdown 代码块，直接以 { 开头、以 } 结尾。字段要求：
{
  "word": "单词或短语原形",
  "pos": "词性缩写，如 v. / n. / adj.，可以是多个",
  "phonetic": "国际音标，如 /ˈænəlaɪz/",
  "definition": "中文释义，简洁准确",
  "etymology": "词根词缀拆解或词源简介，帮助理解和记忆",
  "collocations": ["常见搭配1", "常见搭配2", "常见搭配3"],
  "examples": ["英文例句1", "英文例句2"],
  "synonyms": ["近义词1", "近义词2", "近义词3"],
  "antonyms": ["反义词1", "反义词2"],
  "memoryTip": "一句话记忆技巧"
}
如果某个字段确实没有内容（例如没有常见反义词），返回空数组而不是编造。`;

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeWord(word) {
  return String(word || '').trim();
}

function normalizeStringArray(value, limit) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeField(data, key, fallback = '') {
  return String(data?.[key] || fallback).trim();
}

function normalizeAnalysisResult(data, fallbackWord) {
  return {
    word: normalizeField(data, 'word', fallbackWord),
    pos: normalizeField(data, 'pos'),
    phonetic: normalizeField(data, 'phonetic'),
    definition: normalizeField(data, 'definition'),
    etymology: normalizeField(data, 'etymology'),
    collocations: normalizeStringArray(data?.collocations, 5),
    examples: normalizeStringArray(data?.examples, 3),
    synonyms: normalizeStringArray(data?.synonyms, 5),
    antonyms: normalizeStringArray(data?.antonyms, 5),
    memoryTip: normalizeField(data, 'memoryTip'),
  };
}

function publicAIErrorMessage({ code, status }) {
  if (code === 'AI_RATE_LIMIT') return 'AI 服务繁忙，请稍后再试';
  if (code === 'AI_TIMEOUT') return 'AI 响应超时，请稍后重试';
  if (code === 'AI_NETWORK_ERROR') return 'AI 服务暂时不可用，请稍后重试';
  if (status >= 500) return 'AI 服务暂时不可用，请稍后重试';
  return '词汇分析失败，请稍后重试';
}

export async function analyzeVocabWord({ word, user }) {
  const normalized = normalizeWord(word);
  if (!normalized) throw validationError('单词不能为空');
  if (normalized.length > 80) throw validationError('输入过长，请输入单个单词或短语');

  await ensureAICircuitAvailable('vocab_analyze');

  const { content } = await executeCompletion({
    user: user || null,
    max_tokens: 700,
    temperature: 0.4,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: normalized },
    ],
    extraParams: { response_format: { type: 'json_object' }, _nonStream: true },
  });

  try {
    const data = parseAIJsonPayload(content);
    const result = normalizeAnalysisResult(data, normalized);
    await recordAISuccess('vocab_analyze');
    return result;
  } catch (err) {
    void recordAIFailure(err, 'vocab_analyze');
    logError('vocab_analyze_parse_failed', { message: err.message, word: normalized });
    throw new SyntaxError('AI 返回格式异常，请重试');
  }
}

export function handleAnalyzerError(err, { requestId, userId } = {}) {
  if (err instanceof SyntaxError) return { status: 502, msg: err.message };
  void recordAIFailure(err, 'vocab_analyze');
  const fallback = classifyAIError(err);
  logError('vocab_analyze_failed', { message: err.message, requestId, userId });
  return { status: err.status || fallback.status, msg: publicAIErrorMessage(fallback) };
}
