const DIMENSION_ORDER = ['content', 'language', 'structure', 'writing'];
const IELTS_TASK1_ORDER = ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'];
const IELTS_TASK2_ORDER = ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'];

const DIMENSION_META = {
  content: {
    name: '内容',
    icon: '',
    fallbackComment: '已经体现出一定内容基础，但还需要继续检查任务完成度、要点覆盖与选材是否真正贴题。',
    fallbackSuggestion: '先核对题目硬性要求，再补足最关键的内容信息。',
  },
  language: {
    name: '语言',
    icon: '',
    fallbackComment: '已经有基本表达基础，但还需要继续优化表达准确度、句式变化和词汇搭配。',
    fallbackSuggestion: '优先改最影响理解的表达问题，再提升句式层次。',
  },
  structure: {
    name: '结构',
    icon: '',
    fallbackComment: '整体已经有基本成形的结构，但还需要继续梳理段落分工、衔接关系和结尾收束。',
    fallbackSuggestion: '先让每一段只承担一个核心任务，再补过渡与收束。',
  },
  writing: {
    name: '书写',
    icon: '',
    fallbackComment: '卷面或表达呈现已有基本基础，但还需要继续关注格式规范、卷面呈现或表达呈现的整洁度。',
    fallbackSuggestion: '检查格式细节、标点与分段，让整体呈现更规范清楚。',
  },
};

const IELTS_DIMENSION_META = {
  taskAchievement: {
    name: 'Task Achievement',
    fallbackComment: '已经对图表任务作出回应，但还需要检查 overview、关键特征选择和数据比较是否足够准确。',
    fallbackSuggestion: '先补清楚 overview，再选择最能体现趋势或差异的数据展开。',
  },
  taskResponse: {
    name: 'Task Response',
    fallbackComment: '已经回应了题目方向，但还需要检查立场、题目各部分覆盖和论点展开是否充分。',
    fallbackSuggestion: '先明确立场，再让每个主体段只展开一个核心论点。',
  },
  coherenceCohesion: {
    name: 'Coherence and Cohesion',
    fallbackComment: '文章已有基本段落组织，但还需要继续优化段落推进、主题句和衔接方式。',
    fallbackSuggestion: '先检查每段主题句，再减少机械连接词堆砌。',
  },
  lexicalResource: {
    name: 'Lexical Resource',
    fallbackComment: '已经有一定词汇基础，但还需要提升搭配准确度、主题词改写和表达自然度。',
    fallbackSuggestion: '优先替换重复关键词，并检查搭配是否自然。',
  },
  grammaticalRangeAccuracy: {
    name: 'Grammatical Range and Accuracy',
    fallbackComment: '已经能使用基本句式，但还需要提升复杂句控制和语法准确度。',
    fallbackSuggestion: '先修正影响理解的句子，再增加稳定的从句或分词结构。',
  },
};

const DIMENSION_KEY_RULES = [
  ['content', ['内容', 'task', 'content']],
  ['language', ['语言', '表达', 'grammar', 'language']],
  ['structure', ['结构', '篇章', 'logic', 'structure']],
  ['writing', ['书写', '格式', '卷面', 'handwriting', 'presentation']],
];

const IELTS_DIMENSION_KEY_RULES = [
  ['taskAchievement', ['task achievement', 'ta', '图表任务', 'overview', 'key features']],
  ['taskResponse', ['task response', 'tr', '任务回应', '立场', 'position']],
  ['coherenceCohesion', ['coherence and cohesion', 'cc', 'coherence', 'cohesion', '衔接', '连贯']],
  ['lexicalResource', ['lexical resource', 'lr', 'lexical', 'vocabulary', '词汇']],
  ['grammaticalRangeAccuracy', ['grammatical range and accuracy', 'gra', 'grammar', 'grammatical', '语法']],
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeDimensionKey(name) {
  const text = toText(name).toLowerCase();
  if (!text) return null;

  return DIMENSION_KEY_RULES.find(([, terms]) => terms.some((term) => text.includes(term)))?.[0] || null;
}

function normalizeIeltsDimensionKey(name) {
  const text = toText(name).toLowerCase();
  if (!text) return null;

  return IELTS_DIMENSION_KEY_RULES.find(([, terms]) => terms.some((term) => {
    const normalizedTerm = term.toLowerCase();
    if (normalizedTerm.length <= 3) return text === normalizedTerm;
    return text.includes(normalizedTerm);
  }))?.[0] || null;
}

function normalizeGrade(value) {
  const text = toText(value);
  if (['优', '良', '中', '差'].includes(text)) return text;
  if (['A', 'A+'].includes(text)) return '优';
  if (['B', 'B+'].includes(text)) return '良';
  if (['C', 'C+'].includes(text)) return '中';
  if (['D', 'E', 'F'].includes(text)) return '差';
  return '';
}

function deriveGradeFromScore(score, overallGrade) {
  const text = toText(score);
  const direct = normalizeGrade(text);
  if (direct) return direct;
  return normalizeGrade(overallGrade);
}

function mergeSuggestions(...groups) {
  return groups
    .flat()
    .map((item) => toText(item))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function buildFallbackComment(key) {
  return DIMENSION_META[key].fallbackComment;
}

function dimensionIcon(key, ...icons) {
  return icons.find(Boolean) || DIMENSION_META[key].icon;
}

function dimensionScore(...scores) {
  return scores.find((score) => score !== undefined && score !== null) ?? '';
}

function dimensionTotal(...totals) {
  return totals.find((total) => total !== undefined && total !== null);
}

function dimensionGrade({ grade, overallGrade, previousGrade, score }) {
  return normalizeGrade(grade) || deriveGradeFromScore(score, previousGrade || overallGrade);
}

function dimensionComment(comment, previousComment = '') {
  return toText(comment) || previousComment;
}

function normalizeExistingDimensionEntry(rawKey, value, overallGrade) {
  const key = normalizeDimensionKey(rawKey) || normalizeDimensionKey(value?.name) || rawKey;
  if (!DIMENSION_META[key]) return null;

  return {
    key,
    value: {
      name: DIMENSION_META[key].name,
      icon: dimensionIcon(key, value?.icon),
      score: dimensionScore(value?.score),
      total: dimensionTotal(value?.total),
      grade: dimensionGrade({ grade: value?.grade, overallGrade, score: value?.score }),
      comment: dimensionComment(value?.comment),
      suggestions: mergeSuggestions(value?.suggestions),
    },
  };
}

function defaultDimensionValue(key) {
  return {
    name: DIMENSION_META[key].name,
    icon: DIMENSION_META[key].icon,
    score: '',
    grade: '',
    comment: '',
    suggestions: [],
  };
}

function normalizeCategoryItem(item, previous, overallGrade) {
  const key = normalizeDimensionKey(item?.name);
  if (!key || !DIMENSION_META[key]) return null;
  const current = previous || defaultDimensionValue(key);

  return {
    key,
    value: {
      name: DIMENSION_META[key].name,
      icon: dimensionIcon(key, item?.icon, current.icon),
      score: dimensionScore(item?.score, current.score),
      total: dimensionTotal(item?.total, current.total),
      grade: dimensionGrade({
        grade: item?.grade,
        overallGrade,
        previousGrade: current.grade,
        score: item?.score,
      }),
      comment: dimensionComment(item?.comment, current.comment),
      suggestions: mergeSuggestions(current.suggestions, item?.suggestions),
    },
  };
}

function fillDimensionFallback(key, current, overallGrade) {
  return {
    name: DIMENSION_META[key].name,
    icon: dimensionIcon(key, current.icon),
    score: dimensionScore(current.score),
    total: dimensionTotal(current.total),
    grade: current.grade || normalizeGrade(overallGrade),
    comment: current.comment || buildFallbackComment(key),
    suggestions: current.suggestions?.length
      ? current.suggestions
      : [DIMENSION_META[key].fallbackSuggestion],
  };
}

export function normalizeCategoriesToDimensions(rawCategories, {
  overallGrade = '',
  existingDimensions = null,
  writingType = '',
} = {}) {
  const normalizedWritingType = toText(writingType).toLowerCase();
  if (normalizedWritingType === 'ielts_task1' || normalizedWritingType === 'ielts_task2') {
    return normalizeIeltsCategoriesToDimensions(rawCategories, {
      overallGrade,
      existingDimensions,
      order: normalizedWritingType === 'ielts_task1' ? IELTS_TASK1_ORDER : IELTS_TASK2_ORDER,
    });
  }

  const normalized = {};
  // Track which dimension keys were explicitly provided so we can skip the rest
  const providedKeys = new Set();

  if (isPlainObject(existingDimensions)) {
    Object.entries(existingDimensions).forEach(([rawKey, value]) => {
      const normalizedEntry = normalizeExistingDimensionEntry(rawKey, value, overallGrade);
      if (!normalizedEntry) return;
      providedKeys.add(normalizedEntry.key);
      normalized[normalizedEntry.key] = normalizedEntry.value;
    });
  }

  if (Array.isArray(rawCategories)) {
    rawCategories.forEach((item) => {
      const key = normalizeDimensionKey(item?.name);
      const normalizedEntry = normalizeCategoryItem(item, normalized[key], overallGrade);
      if (!normalizedEntry) return;
      providedKeys.add(normalizedEntry.key);
      normalized[normalizedEntry.key] = normalizedEntry.value;
    });
  }

  // Determine which keys to output: if any were explicitly provided, only show those;
  // otherwise fall back to showing all four with placeholder content.
  const outputKeys = providedKeys.size > 0
    ? DIMENSION_ORDER.filter((key) => providedKeys.has(key))
    : DIMENSION_ORDER;

  outputKeys.forEach((key) => {
    const current = normalized[key] || {};
    normalized[key] = fillDimensionFallback(key, current, overallGrade);
  });

  const categories = outputKeys.map((key) => ({
    name: normalized[key].name,
    icon: normalized[key].icon,
    score: normalized[key].score,
    grade: normalized[key].grade,
    comment: normalized[key].comment,
    suggestions: normalized[key].suggestions,
  }));

  const dimensions = Object.fromEntries(
    outputKeys.map((key) => [DIMENSION_META[key].name, normalized[key]])
  );

  return { categories, dimensions };
}

function normalizeIeltsCategoriesToDimensions(rawCategories, {
  overallGrade = '',
  existingDimensions = null,
  order,
} = {}) {
  const normalized = {};
  const providedKeys = new Set();

  if (isPlainObject(existingDimensions)) {
    Object.entries(existingDimensions).forEach(([rawKey, value]) => {
      const key = normalizeIeltsDimensionKey(rawKey) || normalizeIeltsDimensionKey(value?.name) || rawKey;
      if (!IELTS_DIMENSION_META[key]) return;
      providedKeys.add(key);
      normalized[key] = normalizeIeltsDimensionValue(key, value, overallGrade);
    });
  }

  if (Array.isArray(rawCategories)) {
    rawCategories.forEach((item) => {
      const key = normalizeIeltsDimensionKey(item?.name);
      if (!key || !IELTS_DIMENSION_META[key]) return;
      providedKeys.add(key);
      normalized[key] = normalizeIeltsDimensionValue(key, {
        ...(normalized[key] || {}),
        ...item,
        suggestions: mergeSuggestions(normalized[key]?.suggestions, item?.suggestions),
      }, overallGrade);
    });
  }

  const outputKeys = providedKeys.size > 0
    ? order.filter((key) => providedKeys.has(key))
    : order;

  outputKeys.forEach((key) => {
    normalized[key] = fillIeltsDimensionFallback(key, normalized[key] || {}, overallGrade);
  });

  const categories = outputKeys.map((key) => ({
    name: normalized[key].name,
    icon: normalized[key].icon,
    score: normalized[key].score,
    grade: normalized[key].grade,
    comment: normalized[key].comment,
    suggestions: normalized[key].suggestions,
  }));

  const dimensions = Object.fromEntries(
    outputKeys.map((key) => [IELTS_DIMENSION_META[key].name, normalized[key]])
  );

  return { categories, dimensions };
}

function normalizeIeltsDimensionValue(key, value, overallGrade) {
  return {
    name: IELTS_DIMENSION_META[key].name,
    icon: value?.icon || '',
    score: dimensionScore(value?.score),
    total: dimensionTotal(value?.total),
    grade: dimensionGrade({ grade: value?.grade, overallGrade, score: value?.score }),
    comment: dimensionComment(value?.comment),
    suggestions: mergeSuggestions(value?.suggestions),
  };
}

function fillIeltsDimensionFallback(key, current, overallGrade) {
  return {
    name: IELTS_DIMENSION_META[key].name,
    icon: current.icon || '',
    score: dimensionScore(current.score),
    total: dimensionTotal(current.total),
    grade: current.grade || normalizeGrade(overallGrade),
    comment: current.comment || IELTS_DIMENSION_META[key].fallbackComment,
    suggestions: current.suggestions?.length
      ? current.suggestions
      : [IELTS_DIMENSION_META[key].fallbackSuggestion],
  };
}
