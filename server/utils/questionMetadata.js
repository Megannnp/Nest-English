import { createHash } from 'node:crypto';

export const QUESTION_TYPE_CANDIDATES = [
  'continuation',
  'argumentative',
  'summary',
  'narrative',
  'expository',
  'speech',
  'letter',
  'notice',
  'diary',
  'chart_writing',
  'report',
  'proposal',
  'review',
  'picture_writing',
  'post'
];

export const QUESTION_THEME_CANDIDATES = [
  '校园生活',
  '个人成长',
  '人际关系',
  '家庭亲情',
  '社会参与',
  '志愿服务',
  '传统文化',
  '跨文化交流',
  '科技生活',
  '环境保护',
  '体育健康',
  '学习方法',
  '公共文明',
  '创新实践',
  '人与自然'
];

export function normalizeQuestionTitleValue(title = '') {
  return String(title)
    .trim()
    .replace(/[【】[\]]/g, '')
    .replace(/Ⅱ/g, 'II')
    .replace(/Ⅰ/g, 'I')
    .replace(/Ⅲ/g, 'III')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function buildPromptFingerprint(promptText = '') {
  const normalized = String(promptText)
    .replace(/\s+/g, ' ')
    .replace(/[，。、””’’：:；;,.!?！？（）()【】[\]《》<>]/g, '')
    .trim()
    .slice(0, 1200);

  return createHash('sha1').update(normalized).digest('hex');
}

export function inferCompositionSize(type = '') {
  return type === 'continuation' ? 'long' : 'short';
}

export function ensureSingleTheme(theme, themes = []) {
  if (theme && QUESTION_THEME_CANDIDATES.includes(theme)) return theme;
  const list = Array.isArray(themes) ? themes : [];
  return list.find((item) => QUESTION_THEME_CANDIDATES.includes(item)) || '';
}

export function ensureThemeArray(theme, themes = []) {
  const single = ensureSingleTheme(theme, themes);
  return single ? [single] : [];
}

export function inferDefaultScore({ sourceRegion = '', sourcePaper = '', type = '' } = {}) {
  const region = String(sourceRegion || '');
  const paper = String(sourcePaper || '');

  if (region === '新高考' || region === '浙江') {
    return type === 'continuation' ? 25 : 15;
  }

  if (region === '北京') return 20;
  if (region === '天津') return 25;

  if (region === '全国' || /甲卷|乙卷|I卷|II卷|III卷|全国/.test(paper)) {
    return 25;
  }

  return type === 'continuation' ? 25 : null;
}
