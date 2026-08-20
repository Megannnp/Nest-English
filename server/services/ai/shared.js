export const VALID_WRITING_TYPES = new Set([
  'ielts_task1',
  'ielts_task2',
  'continuation',
  'summary',
  'argumentative',
  'letter',
  'notice',
  'speech',
  'narrative',
  'expository',
  'diary',
  'chart_writing',
  'report',
  'proposal',
  'review',
  'picture_writing',
  'general',
]);

const TYPE_HEURISTICS = {
  ielts_task1: ['ielts task 1', 'ielts writing task 1', 'academic task 1', '雅思小作文', '雅思 task 1', '图表作文', 'chart', 'line graph', 'bar chart', 'pie chart', 'table', 'map', 'process diagram'],
  ielts_task2: ['ielts task 2', 'ielts writing task 2', '雅思大作文', '雅思 task 2', 'agree or disagree', 'discuss both views', 'to what extent', 'advantages and disadvantages', 'problem and solution'],
  continuation: ['读后续写', '续写', '段首句', '续写两段', '根据所给段落开头语续写', '第二节'],
  summary: ['概要写作', '摘要', 'summary', '概括', '概述原文', '写一篇摘要'],
  argumentative: ['议论文', '你怎么看', '你是否同意', '你的观点', '利弊', '看法', '观点'],
  letter: ['书信', '信件', 'letter', 'email', '邮件', '回信', '写信给'],
  notice: ['通知', 'notice'],
  speech: ['演讲稿', '演讲', 'speech', '发言稿'],
  narrative: ['记叙文', '记一次', '经历', '故事', '难忘的一次'],
  expository: ['说明文', '介绍', '说明', '介绍一下', '如何', 'why do we', 'how to'],
  diary: ['日记', 'diary'],
  chart_writing: ['图表', 'chart', '表格', '数据图', '柱状图', '折线图', '饼图'],
  report: ['报告', 'report'],
  proposal: ['倡议书', 'proposal', '倡议'],
  review: ['读后感', '观后感', '书评', '影评', 'review'],
  picture_writing: ['看图写话', '图片作文', '根据图片', '图画内容'],
};

const THEME_HEURISTICS = {
  友情: ['friend', '友情', '朋友', '友谊'],
  亲情: ['mother', 'father', 'mom', 'mum', 'dad', 'family', '家人', '母亲', '父亲', '亲情'],
  成长: ['grow', 'growth', '成长', '长大', '经历', 'change'],
  校园: ['school', 'teacher', 'class', '校园', '老师', '课堂', '同学'],
  梦想: ['dream', '梦想', '理想', 'future'],
  助人: ['help', 'kindness', '帮助', '善良', '互助'],
  环保: ['environment', 'protect', 'pollution', '环保', '环境', '污染'],
  科技: ['technology', 'ai', 'robot', 'internet', '科技', '人工智能', '网络'],
  健康: ['health', 'exercise', 'healthy', '健康', '运动'],
  阅读: ['read', 'reading', 'book', '阅读', '书籍'],
  教育: ['education', 'learn', 'study', '教育', '学习'],
  文化: ['culture', 'traditional', 'festival', '文化', '传统', '节日'],
  比赛: ['competition', 'contest', '比赛', '竞赛'],
};

function clampConfidence(value, fallback = 0.6) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(1, Math.max(0, num));
}

export function normalizeWritingType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  return VALID_WRITING_TYPES.has(normalized) ? normalized : 'general';
}

export function buildHeuristicTagAnalysis({ title = '', content = '', requirements = '' }) {
  const sourceText = `${title}\n${requirements}\n${content}`.toLowerCase();
  const typeScores = Object.entries(TYPE_HEURISTICS).map(([type, keywords]) => {
    const score = keywords.reduce((sum, keyword) => sum + (sourceText.includes(keyword.toLowerCase()) ? 1 : 0), 0);
    return { type, score };
  });

  typeScores.sort((a, b) => b.score - a.score);
  const bestType = typeScores[0]?.score > 0 ? typeScores[0].type : 'general';
  const matchedKeywords = (TYPE_HEURISTICS[bestType] || []).filter((keyword) => sourceText.includes(keyword.toLowerCase()));

  const themes = Object.entries(THEME_HEURISTICS)
    .map(([theme, keywords]) => ({
      theme,
      score: keywords.reduce((sum, keyword) => sum + (sourceText.includes(keyword.toLowerCase()) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.theme);

  return {
    type: bestType,
    confidence: matchedKeywords.length > 1 ? 0.82 : matchedKeywords.length === 1 ? 0.68 : 0.45,
    themes,
    reason: matchedKeywords.length
      ? `基于题目要求中的关键词识别为${bestType}：${matchedKeywords.join('、')}`
      : '未命中明显题型关键词，按通用写作处理',
    source: 'heuristic',
    degraded: true,
  };
}

export function sanitizeTagAnalysis(raw, fallback) {
  if (!raw || typeof raw !== 'object') return fallback;

  return {
    type: normalizeWritingType(raw.type || fallback.type),
    confidence: clampConfidence(raw.confidence, fallback.confidence),
    themes: Array.isArray(raw.themes)
      ? raw.themes.filter((item) => typeof item === 'string' && item.trim()).slice(0, 5)
      : fallback.themes,
    reason: typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : fallback.reason,
    source: raw.source || 'ai',
    degraded: Boolean(raw.degraded),
  };
}
