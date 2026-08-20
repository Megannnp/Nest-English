import { extractContinuationStarters } from '../../utils/continuationStarters.js';
import { callVolcengineAI } from '../aiProviderService.js';
import { parseAIJsonPayload } from '../aiService.js';
import { withTimeout } from './timeout.js';

function splitParagraphs(text = '') {
  return String(text || '')
    .split(/\n\s*\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Resolves structured continuation starters from a writing row.
 * Prefers the pre-parsed `continuation_starters` JSON column; returns null
 * if the column is absent or unparseable.
 */
export async function resolveContinuationStartersForRow(row) {
  if (!row?.continuation_starters) return null;
  try {
    const parsed = JSON.parse(row.continuation_starters);
    if (parsed?.para1 && parsed?.para2) return parsed;
  } catch {
    // fall through
  }
  return null;
}

/**
 * Validates all three sample essay fields in a feedback payload for
 * continuation writing, returning an array of per-field validation results.
 *
 * @param {object} parsed - feedback payload with correctedSampleEssay / excellentSampleEssay / sampleEssay
 * @param {string} promptText - raw prompt text used to extract expected starters
 * @param {object|null} structuredStarters - optional pre-resolved { para1, para2 } overrides
 * @returns {{ fieldName: string, valid: boolean, issues: string[], starters: string[], skipped: boolean }[]}
 */
export function validateContinuationEssayFields(parsed, promptText = '', structuredStarters = null) {
  const ESSAY_FIELDS = ['correctedSampleEssay', 'excellentSampleEssay', 'sampleEssay'];
  return ESSAY_FIELDS.map((fieldName) => {
    const essay = parsed?.[fieldName];
    if (!essay) {
      return { fieldName, valid: true, issues: [], starters: [], skipped: true };
    }
    const result = validateContinuationSampleEssay(essay, promptText, structuredStarters);
    return { fieldName, ...result, skipped: false };
  });
}

function _resolveStarters(structuredStarters, promptText) {
  if (structuredStarters?.para1 && structuredStarters?.para2) {
    return [structuredStarters.para1, structuredStarters.para2];
  }
  return extractContinuationStarters(promptText);
}

function _parseSampleEssay(sampleEssay) {
  return {
    title: String(sampleEssay?.title || '').trim(),
    text: String(sampleEssay?.text || '').trim(),
  };
}

export function validateContinuationSampleEssay(sampleEssay, promptText = '', structuredStarters = null) {
  const starters = _resolveStarters(structuredStarters, promptText);
  const issues = [];
  const { title: essayTitle, text: essayText } = _parseSampleEssay(sampleEssay);
  const paragraphs = splitParagraphs(essayText);

  if (essayTitle) {
    issues.push('读后续写范文不应包含标题');
  }
  if (paragraphs.length !== 2) {
    issues.push('读后续写范文必须严格分成两段');
  }
  if (starters.length === 2 && paragraphs.length === 2) {
    if (!paragraphs[0].startsWith(starters[0])) {
      issues.push('第一段未以题目给定的第一句段首句原样开头');
    }
    if (!paragraphs[1].startsWith(starters[1])) {
      issues.push('第二段未以题目给定的第二句段首句原样开头');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    starters,
  };
}

export async function repairContinuationSampleEssay({
  sampleEssay,
  row,
}) {
  // Prefer the pre-parsed structured starters stored in the DB column; only
  // fall back to re-parsing prompt_text when the column is absent or unparseable.
  const structured = await resolveContinuationStartersForRow(row);
  const starters = structured
    ? [structured.para1, structured.para2]
    : extractContinuationStarters(row?.prompt_text || '');
  if (starters.length < 2) return null;

  const repairPrompt = `你是英语读后续写范文修复助手。请只修复 sampleEssay，保证它严格符合题目要求。

要求：
1. 只能返回合法 JSON，不要解释，不要 markdown。
2. 只返回：
{
  "sampleEssay": {
    "title": "",
    "text": "两段完整续写",
    "highlights": ["亮点1", "亮点2"]
  }
}
3. 绝对不要写标题，sampleEssay.title 必须为空字符串。
4. 范文必须严格分成两段。
5. 第一段必须以这句话原样开头：
${starters[0]}
6. 第二段必须以这句话原样开头：
${starters[1]}
7. 不得改写、删减、替换这两句段首句中的任何词。
8. 内容必须贴合原题，不要另起题目、不要改人物、不要改情境。

题目要求：
${row?.prompt_text || ''}

当前待修复的 sampleEssay：
${JSON.stringify(sampleEssay || {})}`;

  const content = await withTimeout(
    callVolcengineAI(
      process.env.AI_DEFAULT_MODEL,
      [
        { role: 'system', content: '你只负责修复读后续写范文的结构和段首句，不负责重写整份反馈。' },
        { role: 'user', content: repairPrompt },
      ],
      2600,
      0
    ),
    20000,
    '续写范文修复超时'
  );

  const parsed = parseAIJsonPayload(content);
  return parsed?.sampleEssay || null;
}
