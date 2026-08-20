/* eslint-disable complexity */
import { ValidationError } from '../../utils/appError.js';
import { logError } from '../../utils/logger.js';
import { executeCompletion } from '../aiCompletionService.js';
import { classifyAIError, recordAIFailure, tryRepairJsonText } from '../aiProviderService.js';

const QUESTION_TYPES = {
  blank: '填空题',
  choice: '选择题',
  correction: '改错题',
  translation: '翻译题',
};

function getTypeLabel(type) {
  return QUESTION_TYPES[type] || type;
}

function normalizeTypeConfigs(typeConfigs) {
  if (!Array.isArray(typeConfigs) || !typeConfigs.length) throw new ValidationError('题型配置不能为空');
  return typeConfigs.map((config) => {
    const type = String(config?.type || '').trim();
    const count = Number(config?.count);
    const points = Number(config?.points);
    if (!QUESTION_TYPES[type]) throw new ValidationError('题型不合法');
    if (!Number.isFinite(count) || count < 1) throw new ValidationError('题量不合法');
    if (!Number.isFinite(points) || points < 1) throw new ValidationError('分值不合法');
    return {
      type,
      count: Math.max(1, Math.min(30, Math.floor(count))),
      points: Math.max(1, Math.min(20, Math.floor(points))),
    };
  });
}

function extractJsonObject(text) {
  const stripped = String(text || '')
    .trim()
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const repaired = tryRepairJsonText(stripped);
    if (repaired) return JSON.parse(repaired);
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new SyntaxError('AI 返回格式异常，请重新生成');
  }
}

function buildGrammarPracticePrompt({ grammarPoint, typeConfigs, stage, difficulty, sourceSentence, prepExamLabel, systemId }) {
  const configs = typeConfigs.map((config, index) => ({
    order: index + 1,
    type: config.type,
    typeLabel: getTypeLabel(config.type),
    count: config.count,
    pointsEach: config.points,
    totalPoints: config.count * config.points,
  }));
  return `你是资深英语语法老师，请根据以下配置生成英语语法练习题。

目标语法点：${grammarPoint}
学习阶段：${stage}
难度：${difficulty}
备考目标：${prepExamLabel || '通用英语'}${systemId ? `（${systemId}）` : ''}
来源句子：${sourceSentence || '无'}

题型配置 JSON：
${JSON.stringify(configs, null, 2)}

硬性要求：
1. 必须严格按照题型配置生成；每个 type 的题量必须等于 count，顺序必须等于 order。
2. 每个题型内的题干不能重复；不同题型之间也不要复用完全相同的句子。
3. 每道题必须覆盖一个具体考点 focus。
4. 题目必须符合学习阶段和难度。
5. 题目必须贴合备考目标的命题风格；如果备考目标为空，则使用通用英语学习场景。
6. 题干必须能直接放进 Word 练习单，不要写依赖上下文的话。
7. 选择题必须包含 A-D 四个选项，并在 answer 中给出正确选项和答案。
8. 填空题用 ___ 表示空格；改错题必须包含错误句；翻译题给中文句子并在 answer 给英文参考译文。
9. 每道题必须提供 explanation。
10. 只返回 JSON，不要 Markdown，不要解释。
11. 出选择题前先判断目标语法点的性质：若是概念/规则/分类类知识（例如感叹词的语法特点、情态动词推测强度顺序、系动词的分类等，判断标准是"不需要具体英文例句也能出题、考的是规则本身"），题干和选项可以直接用中文提问、中文作答，不要为了凑英文而编造牵强的例句；若语法点依赖句子结构或用法（例如从句、时态、被动语态、倒装句等），选择题仍必须用英文例句或填空来考查。填空题、改错题、翻译题本身依赖具体句子，不受此条约束，始终需要英文句子。

返回 JSON schema：
{
  "groups": [
    {
      "type": "blank | choice | correction | translation",
      "items": [
        {
          "focus": "具体考点",
          "prompt": "题干，多行可用 \\n",
          "answer": "参考答案",
          "explanation": "详细解析"
        }
      ]
    }
  ]
}`;
}

function sanitizeGeneratedExercises({ payload, typeConfigs, grammarPoint, sourceSentence }) {
  if (!Array.isArray(payload?.groups)) throw new SyntaxError('AI 返回格式不正确：缺少 groups');
  const allPrompts = new Set();
  return typeConfigs.flatMap((config, groupIndex) => {
    const group = payload.groups.find((item) => item?.type === config.type);
    if (!group || !Array.isArray(group.items)) throw new SyntaxError(`AI 返回缺少题型：${getTypeLabel(config.type)}`);
    if (group.items.length !== config.count) {
      throw new SyntaxError(`${getTypeLabel(config.type)} 数量不匹配：需要 ${config.count} 题，实际 ${group.items.length} 题`);
    }
    return group.items.map((item, itemIndex) => {
      const prompt = String(item?.prompt || '').trim();
      const focus = String(item?.focus || '').trim();
      const answer = String(item?.answer || '').trim();
      const explanation = String(item?.explanation || '').trim();
      if (!prompt || !answer || !focus || !explanation) {
        throw new SyntaxError(`${getTypeLabel(config.type)} 第 ${itemIndex + 1} 题缺少题干、答案、解析或考点`);
      }
      if (allPrompts.has(prompt)) throw new SyntaxError(`AI 返回了重复题干：${prompt.slice(0, 40)}...`);
      allPrompts.add(prompt);
      return {
        id: `${config.type}-${Date.now()}-${groupIndex}-${itemIndex}`,
        type: config.type,
        typeLabel: getTypeLabel(config.type),
        points: config.points,
        focus: focus || grammarPoint,
        prompt,
        answer,
        explanation,
        source: sourceSentence || '',
      };
    });
  });
}

export async function generateGrammarPractice({ grammarPoint, typeConfigs, stage = '高中', difficulty = '中', sourceSentence = '', prepExamLabel = '', systemId = '', user }) {
  const normalizedGrammarPoint = String(grammarPoint || '').trim();
  if (!normalizedGrammarPoint) throw new ValidationError('语法点不能为空');
  const normalizedConfigs = normalizeTypeConfigs(typeConfigs);
  const prompt = buildGrammarPracticePrompt({
    grammarPoint: normalizedGrammarPoint,
    typeConfigs: normalizedConfigs,
    stage,
    difficulty,
    sourceSentence,
    prepExamLabel,
    systemId,
  });

  const result = await executeCompletion({
    user,
    max_tokens: 4200,
    temperature: 0.45,
    messages: [
      {
        role: 'system',
        content: '你只负责按要求生成英语语法练习题 JSON。必须严格遵守数量、题型、难度和 JSON schema，不能输出 Markdown。',
      },
      { role: 'user', content: prompt },
    ],
    extraParams: { response_format: { type: 'json_object' }, _nonStream: true },
  });

  return sanitizeGeneratedExercises({
    payload: extractJsonObject(result?.content || ''),
    typeConfigs: normalizedConfigs,
    grammarPoint: normalizedGrammarPoint,
    sourceSentence,
  });
}

export function handlePracticeGenerationError(err, { requestId, userId } = {}) {
  if (err.status && err.status < 500) return { status: err.status, msg: err.message, errorCode: err.code };
  if (err instanceof SyntaxError) {
    void recordAIFailure(err, 'grammar_practice');
    logError('grammar_practice_parse_failed', { message: err.message, requestId, userId });
    return { status: 502, msg: err.message };
  }
  const fallback = classifyAIError(err);
  return { status: err.status || fallback.status, msg: err.message, errorCode: fallback.code };
}
