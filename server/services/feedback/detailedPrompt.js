import { normalizeWritingType } from '../aiService.js';

function compactText(value, maxLength = 160) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function compactList(value, maxItems = 4, maxLength = 120) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => compactText(
      typeof item === 'string'
        ? item
        : item?.detail || item?.comment || item?.title || item?.original || '',
      maxLength
    ))
    .filter(Boolean)
    .slice(0, maxItems);
}

function compactCategories(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).map((item) => ({
    name: compactText(item?.name, 20),
    score: compactText(String(item?.score ?? ''), 20),
    grade: compactText(item?.grade, 20),
    comment: compactText(item?.comment, 140),
    suggestions: compactList(item?.suggestions, 2, 80),
  })).filter((item) => item.name || item.comment || item.suggestions.length);
}

function compactGrammarIssues(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map((item) => ({
    type: compactText(item?.type || item?.title, 40),
    original: compactText(item?.original, 120),
    corrected: compactText(item?.corrected, 120),
    explanation: compactText(item?.explanation || item?.detail, 140),
  })).filter((item) => item.original || item.corrected || item.explanation);
}

function compactHighlights(value) {
  if (!value || typeof value !== 'object') return {};
  return {
    vocabulary: compactList(value.vocabulary, 3, 80),
    sentences: compactList(value.sentences, 3, 120),
    content: compactList(value.content, 3, 100),
  };
}

function compactQuestionAnalysis(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    overview: compactText(value.overview || value.summary, 160),
    reason: compactText(value.reason, 160),
    requirements: compactList(value.requirements || value.hardRequirements, 5, 120),
    pitfalls: compactList(value.pitfalls || value.commonPitfalls, 4, 100),
  };
}

function _buildContinuationPrompt(row, quickSummary) {
  let structuredStarters = null;
  if (row?.continuation_starters) {
    try {
      const parsed = JSON.parse(row.continuation_starters);
      if (parsed?.para1 && parsed?.para2) structuredStarters = parsed;
    } catch {
      // ignore
    }
  }

  const starterBlock = structuredStarters
    ? `题目要求：
- 第一段必须以此句原样开头：${structuredStarters.para1}
- 第二段必须以此句原样开头：${structuredStarters.para2}

所有情节、人物、主题判断必须优先依据题目要求，不得改写段首句。`
    : '';

  const promptContextBlock = row?.prompt_text ? `题目上下文（原题）：\n${row.prompt_text}` : '';

  return `你是资深英语读后续写教学专家。现在请基于学生原文和快速反馈，输出一份"读后续写专属详细反馈"。

要求：
1. 只能返回合法 JSON，不要解释，不要 markdown。
2. 这是 continuation 专属第二阶段反馈，不要重复快速总评。
3. 重点只放在：情节承接、人物一致性、主题回扣、语言关键问题、参考续写和高级改写建议。
4. 中文要具体、专业、能指导学生修改。
5. sampleEssay 不要标题，title 字段必须为空字符串 ""。
6. 两段必须分别以题目给出的两句段首句原样开头，不得改写、删减。
7. 必须继承快速反馈的分数档次、核心问题和分项判断，不要推翻快速反馈；如果需要补充，只能做更具体的解释和修改路径。
8. 每条风险、建议和语言问题都要能对应学生原文、题目要求或快速反馈摘要中的依据，不要编造。

${promptContextBlock}
${starterBlock}

JSON 结构必须严格为：
{
  "overview": "1-2句 continuation 专属精批总览",
  "plotLogic": {
    "summary": "情节承接总评",
    "strengths": ["亮点1", "亮点2"],
    "risks": ["问题1", "问题2"],
    "bridgingSuggestions": ["建议1", "建议2"]
  },
  "characterConsistency": {
    "summary": "人物动机与情绪一致性评价",
    "strengths": ["亮点1"],
    "risks": ["问题1", "问题2"],
    "revisionFocus": ["修改点1", "修改点2"]
  },
  "themeAlignment": {
    "summary": "主题回扣与升华评价",
    "strengths": ["亮点1"],
    "risks": ["问题1", "问题2"],
    "revisionFocus": ["修改点1", "修改点2"]
  },
  "languageIssues": [
    {"title": "", "detail": "", "example": ""}
  ],
  "sampleEssay": {
    "title": "",
    "text": "完整参考续写，必须严格分成两段，各段以题目给定的段首句原样开头",
    "highlights": ["亮点1", "亮点2", "亮点3"]
  },
  "advancedSuggestions": ["建议1", "建议2", "建议3"]
}

输出约束：
1. overview 是必填字段，必须给出 1-2 句 continuation 专属精批总览，不能留空，不能写"暂无总体评价"等占位话。
2. plotLogic 必须评价两段首句承接、情节推进和结尾闭合。
3. characterConsistency 必须评价人物反应是否符合原文心理和关系。
4. themeAlignment 必须评价是否回到主题线索。
5. languageIssues 只保留最值得讲的 3-5 条，不要变成大而全语法清单。
6. sampleEssay 必须贴合原题和给定首句，不能改题，title 必须为空字符串 ""。
7. advancedSuggestions 只保留最值得迁移的高阶写法。

学生原文：
${row?.full_text || row?.text_snippet || ''}

快速反馈摘要：
${JSON.stringify(quickSummary)}`;
}

function _buildGeneralPrompt(row, writingType, quickSummary) {
  return `你是资深英语写作教学专家。现在请基于学生原文和已生成的快速反馈，输出一份"学生可直接阅读的 AI 精批"。

要求：
1. 只能返回合法 JSON 对象，不要解释，不要 markdown。
2. 输出重点是深度学习反馈，不要重复长篇快速总评。
3. 语言使用中文，表达清晰、专业、面向初高中学生。
4. 题型：${writingType}
5. 请尽量给出可操作建议和更好的表达，而不是空泛鼓励。
6. correctedSampleEssay 要尽量贴着学生原文的内容路线修订，让学生看得懂"从我这版到更好版本是怎么改的"。
7. excellentSampleEssay 要提供一版更成熟、自然、完整、贴题的优秀范文。
8. sampleEssay 必须与 excellentSampleEssay 保持一致，作为兼容字段。
9. overview 是必填字段，必须给出 1-2 句完整精批总览，不能留空，不能写"暂无总体评价"等占位话。
10. 必须继承快速反馈的总分档次、categories、mainProblems 和 nextActions，不要在详细反馈中推翻前面的核心判断。
11. 所有语法、内容和结构点评都要能对应学生原文、题目要求或快速反馈摘要中的依据，不要编造不存在的错误、亮点或题意要求。
12. 深度反馈要把 quickSummary 中的 mainProblems 与 nextActions 解释清楚，避免新增一套无关建议。

JSON 结构必须为：
{
  "overview": "1-2句精批总览",
  "aiEvaluation": {
    "deepReview": {
      "grammar": [{"title": "", "detail": ""}],
      "contentLogic": [{"title": "", "detail": ""}],
      "structure": [{"title": "", "detail": ""}]
    },
    "correctedSampleEssay": {
      "title": "批改后范文",
      "text": "贴着学生原文思路修订后的范文，分段输出",
      "highlights": ["修改亮点1", "修改亮点2"]
    },
    "excellentSampleEssay": {
      "title": "优秀范文",
      "text": "完整优秀范文，分段输出",
      "highlights": ["亮点1", "亮点2"]
    },
    "sampleEssay": {
      "title": "优秀范文",
      "text": "与 excellentSampleEssay 一致的兼容字段",
      "highlights": ["亮点1", "亮点2"]
    }
  },
  "annotatedText": "如适合，可给出重点句段点评；否则给空字符串",
  "phraseSuggestions": {
    "categories": [
      {
        "category": "可替换表达",
        "items": [{"en": "", "pos": "", "zh": "", "example": ""}]
      }
    ]
  },
  "sentencePatterns": [
    {
      "category": "句型升级",
      "patterns": [{"pattern": "", "zh": "", "usage": "", "example": ""}]
    }
  ]
}

学生原文：
${row?.full_text || row?.text_snippet || ''}

快速反馈摘要：
${JSON.stringify(quickSummary)}`;
}

function _buildQsScoreFields(feedback, row) {
  return {
    totalScore: feedback?.totalScore ?? null,
    maxScore: feedback?.maxScore ?? row?.max_score ?? null,
    tier: feedback?.tier ?? null,
    summary: feedback?.summary ?? '',
  };
}

function _buildQsAnalysisRef(feedback) {
  return feedback?.questionAnalysis || feedback?.aiAnalysis?.questionAnalysis;
}

function _buildQuickSummary(feedback, row) {
  return {
    ..._buildQsScoreFields(feedback, row),
    categories: compactCategories(feedback?.categories),
    mainProblems: Array.isArray(feedback?.mainProblems) ? feedback.mainProblems : [],
    nextActions: Array.isArray(feedback?.nextActions) ? feedback.nextActions : [],
    highlights: compactHighlights(feedback?.highlights),
    grammarIssues: compactGrammarIssues(feedback?.grammarIssues || feedback?.grammar),
    questionAnalysis: compactQuestionAnalysis(_buildQsAnalysisRef(feedback)),
  };
}

export function buildDetailedPrompt({ row, feedback }) {
  const writingType = normalizeWritingType(row?.selected_type || feedback?.aiAnalysis?.type || 'general');
  const quickSummary = _buildQuickSummary(feedback, row);
  if (writingType === 'continuation') {
    return _buildContinuationPrompt(row, quickSummary);
  }
  return _buildGeneralPrompt(row, writingType, quickSummary);
}
