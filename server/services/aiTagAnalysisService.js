import { callVolcengineAI } from './aiProviderService.js';
import { optionalTrimmedString } from '../utils/routeValidation.js';
import {
  buildHeuristicTagAnalysis,
  sanitizeTagAnalysis,
} from './ai/shared.js';

export {
  buildHeuristicTagAnalysis,
  normalizeWritingType,
  sanitizeTagAnalysis,
} from './ai/shared.js';

export function validateTagAnalysisInput(body = {}) {
  return {
    title: optionalTrimmedString(body.title, 200),
    content: optionalTrimmedString(body.content, 5000),
    requirements: optionalTrimmedString(body.requirements, 2000),
  };
}

export async function analyzeTagsWithAI({ title, content, requirements }) {
  const heuristicResult = buildHeuristicTagAnalysis({ title, content, requirements });

  const prompt = `你是英语写作类型识别专家。请分析以下英语作文的写作类型和主题标签。
重要：themes主题标签必须全部使用中文，例如"友情"、"环境保护"、"科技发展"，禁止使用英文标签。
作文标题：${title || '（无）'}
题目要求：${requirements?.slice(0, 500) || '（无）'}
作文内容（前300字）：${content?.slice(0, 300) || '（无）'}

写作类型只能从以下选项中选一个：
- continuation（读后续写）
- summary（概要写作）
- argumentative（议论文）
- letter（书信）
- notice（通知）
- speech（演讲稿）
- narrative（记叙文）
- expository（说明文）
- diary（日记）
- chart_writing（图表作文）
- report（报告）
- proposal（倡议书）
- review（观后感/读后感）
- picture_writing（看图写话）
- general（综合/其他）

请返回JSON格式（不要有任何其他文字）：
{
  "type": "写作类型英文key",
  "confidence": 0到1之间的置信度数字,
  "themes": ["中文主题标签1", "中文主题标签2"],
  "reason": "识别理由（一句话）"
}`;

  const fullText = await callVolcengineAI(
    undefined,
    [{ role: 'user', content: prompt }],
    500,
    0.1
  );

  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 返回格式错误');

  return {
    heuristicResult,
    result: sanitizeTagAnalysis(JSON.parse(jsonMatch[0]), heuristicResult),
  };
}
