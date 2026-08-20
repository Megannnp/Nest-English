import { buildKnowledgeContext } from './knowledgeService.js';

const EXAM_ALIASES = [
  ['ielts', ['ielts', '雅思']],
  ['sat', ['sat']],
  ['gre', ['gre']],
  ['bec', ['bec', 'business english certificate', '商务英语']],
  ['gaokao', ['gaokao', '高考', '中高考']],
];

const MODULE_ALIASES = {
  writing: ['writing', 'write', '作文', '写作', 'essay'],
  reading: ['reading', '阅读'],
  grammar: ['grammar', '语法'],
  vocabulary: ['vocab', 'vocabulary', '词汇', '单词'],
  listening: ['listening', '听力'],
  speaking: ['speaking', '口语'],
};

function normalizeText(...parts) {
  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}

function includesAny(text, aliases) {
  return aliases.some((alias) => text.includes(alias.toLowerCase()));
}

function inferExam({ explicitExam = '', learningGoal = '', taskType = '', title = '', promptText = '', content = '' }) {
  const direct = String(explicitExam || '').trim().toLowerCase();
  if (direct) return direct;

  const text = normalizeText(learningGoal, taskType, title, promptText, content);
  const found = EXAM_ALIASES.find(([, aliases]) => includesAny(text, aliases));
  return found?.[0] || 'general';
}

function inferModule({ explicitModule = '', taskType = '', title = '', promptText = '', content = '' }) {
  const direct = String(explicitModule || '').trim().toLowerCase();
  if (direct) return direct;

  const text = normalizeText(taskType, title, promptText, content);
  const found = Object.entries(MODULE_ALIASES).find(([, aliases]) => includesAny(text, aliases));
  return found?.[0] || 'general';
}

function buildTaskKeywords({ module, exam, taskType, learningGoal }) {
  const normalizedTask = String(taskType || '').toLowerCase();
  const keywords = [module, exam, taskType, learningGoal].filter(Boolean);

  if (exam === 'ielts' && module === 'writing') {
    if (normalizedTask.includes('task1') || normalizedTask.includes('task 1')) {
      keywords.push('task achievement', 'overview', 'key features', 'chart', 'graph', 'table', 'map', 'process');
    } else {
      keywords.push('task response', 'thesis', 'position', 'argument', 'evidence', 'coherence', 'lexical', 'grammar');
    }
  }

  if (module === 'reading') keywords.push('定位词', '同义替换', '干扰项', '题型');
  if (module === 'grammar') keywords.push('语法', '句法', '例句', '常见错误');
  if (module === 'vocabulary') keywords.push('搭配', '同义替换', '例句', '主题词');
  if (module === 'speaking') keywords.push('口语', '回答结构', '话题词汇');
  if (module === 'listening') keywords.push('听力', '信号词', '场景词');

  return keywords;
}

function buildBoosts({ module, exam, taskType }) {
  const normalizedTask = String(taskType || '').toLowerCase();
  const boosts = [];
  if (exam === 'ielts' && module === 'writing') {
    boosts.push(
      normalizedTask.includes('task1') || normalizedTask.includes('task 1')
        ? /task 1|task achievement|overview|chart|graph|table|map|process/i
        : /task 2|task response|thesis|argument|agree|views|advantages/i
    );
  }
  if (module === 'reading') boosts.push(/reading|阅读|定位词|同义替换|干扰项/i);
  if (module === 'grammar') boosts.push(/grammar|语法|从句|时态|句法|错误/i);
  if (module === 'vocabulary') boosts.push(/vocab|vocabulary|词汇|搭配|同义替换|例句/i);
  if (module === 'speaking') boosts.push(/speaking|口语|part 1|part 2|part 3|话题/i);
  if (module === 'listening') boosts.push(/listening|听力|信号词|场景词|dictation/i);
  return boosts;
}

function buildHeading({ exam, module }) {
  const examLabel = exam === 'general' ? '通用' : exam.toUpperCase();
  const moduleLabel = {
    writing: '写作',
    reading: '阅读',
    grammar: '语法',
    vocabulary: '词汇',
    listening: '听力',
    speaking: '口语',
    general: '学习',
  }[module] || module;
  return `${examLabel} ${moduleLabel}资料库参考`;
}

export function resolveKnowledgeRoute({
  user = null,
  module = '',
  exam = '',
  taskType = '',
  learningGoal = '',
  title = '',
  promptText = '',
  content = '',
} = {}) {
  const role = String(user?.role || '').trim().toLowerCase();
  const inferredExam = inferExam({ explicitExam: exam, learningGoal, taskType, title, promptText, content });
  const inferredModule = inferModule({ explicitModule: module, taskType, title, promptText, content });

  return {
    role,
    exam: inferredExam,
    module: inferredModule,
    taskType: String(taskType || '').trim().toLowerCase(),
    learningGoal: String(learningGoal || '').trim(),
  };
}

function resolveRoutedOptions(options = {}) {
  return {
    user: options.user || null,
    module: options.module || '',
    exam: options.exam || '',
    taskType: options.taskType || '',
    learningGoal: options.learningGoal || '',
    title: options.title || '',
    promptText: options.promptText || '',
    content: options.content || '',
    heading: options.heading || '',
  };
}

export function buildRoutedKnowledgeContext(options) {
  const {
    user, module, exam, taskType, learningGoal, title, promptText, content, heading,
  } = resolveRoutedOptions(options);
  const route = resolveKnowledgeRoute({ user, module, exam, taskType, learningGoal, title, promptText, content });
  if (route.module === 'general' && route.exam === 'general' && !learningGoal) return '';

  return buildKnowledgeContext({
    module: route.module,
    exam: route.exam,
    taskType: route.taskType,
    title,
    promptText,
    content,
    keywords: buildTaskKeywords(route),
    boosts: buildBoosts(route),
    heading: heading || buildHeading(route),
    instruction: route.role === 'teacher'
      ? '请优先依据以上资料生成面向教师的诊断和教学建议；不要编造未检索到的来源。'
      : '请优先依据以上资料生成适合学习者理解和下一步练习的反馈；不要编造未检索到的来源。',
  });
}
