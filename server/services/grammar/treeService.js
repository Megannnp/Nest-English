import { logError } from '../../utils/logger.js';
import { executeCompletion } from '../aiCompletionService.js';
import {
  classifyAIError,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../aiProviderService.js';

const SYSTEM_PROMPT = `你是一位英语语法分析专家。用户给你一个英语句子，返回 JSON 树结构分析其句子成分。
只返回 JSON，不要任何解释或 markdown 代码块。

格式：
{
  "id": "root",
  "role": "句型名称",
  "word": "整句或核心短语",
  "color": "c-purple",
  "note": "中文语法说明，1-2句",
  "children": [...]
}

【颜色规则 — 按语法功能赋色，严格执行】
- c-purple：仅根节点（句型标签，如"主谓宾句"）
- c-teal：主语及主语从句（谁/什么执行动作）
- c-coral：谓语核心及动词短语（核心动作/系动词）
- c-amber：宾语、表语、补语及其从句（动作的对象/结果）
- c-gray：定语、状语、连词、介词短语（所有修饰与连接成分）

【结构规则 — 严格遵守】
- 树最多3层（root → 主干成分 → 关键子成分），绝不超过4层
- 每层子节点最多6个，相似成分合并
- 长句高度概括，不逐词展开，保持树紧凑
- 叶节点 children 必须为空数组 []
- note 用中文解释该成分的语法功能，1-2句
- word 显示实际词语或短语，简洁
- role 是成分名称：主语、谓语、宾语、表语、补语、状语、定语、连词等
- 所有字符串不含换行符`;

const SYSTEM_PROMPT_SIMPLE = `你是英语语法分析专家。分析英语句子，返回紧凑 JSON 树（纯 JSON，无 markdown）。
树只有2层：root → 主干成分（主语/谓语/宾语/状语等，最多5个）。
每个节点：{"id":"唯一字符串","role":"成分名","word":"词或短语","color":"颜色","note":"1句中文说明","children":[]}
颜色规则：root用c-purple；主语用c-teal；谓语用c-coral；宾语/表语/补语用c-amber；定语/状语/连词用c-gray。`;

function extractJSON(content) {
  let clean = content.trim().replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) clean = clean.slice(start, end + 1);
  return JSON.parse(clean);
}

export async function generateSentenceTree({ sentence, user, requestId }) {
  await ensureAICircuitAvailable('grammar_tree');

  const trimmed = sentence.trim();

  // 第一次尝试：完整 prompt，更多 token
  let treeData;
  try {
    const { content } = await executeCompletion({
      user: user || null,
      model: undefined,
      max_tokens: 4000,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `请分析这个句子：${trimmed}` },
      ],
    });
    treeData = extractJSON(content);
  } catch (firstErr) {
    if (firstErr instanceof SyntaxError) {
      void recordAIFailure(firstErr, 'grammar_tree');
      throw firstErr;
    }
    // 第一次失败（网络/token 截断）→ 用简化 prompt 重试
    logError('grammar_tree_retry', { message: firstErr.message, requestId });
    const { content: content2 } = await executeCompletion({
      user: user || null,
      model: undefined,
      max_tokens: 2000,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_SIMPLE },
        { role: 'user', content: `句子：${trimmed}` },
      ],
    });
    treeData = extractJSON(content2);
  }

  await recordAISuccess('grammar_tree');
  return treeData;
}

export function handleTreeError(err, { requestId, userId } = {}) {
  if (err instanceof SyntaxError) return { status: 502, msg: 'AI 返回格式异常，请重试' };
  if (err.status && err.status < 500) return { status: err.status, msg: err.message };
  void recordAIFailure(err, 'grammar_tree');
  const fallback = classifyAIError(err);
  logError('grammar_tree_failed', { message: err.message, requestId, userId });
  return { status: err.status || fallback.status, msg: err.message, errorCode: err.errorCode || fallback.code };
}
