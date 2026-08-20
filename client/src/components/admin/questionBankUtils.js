import {
  BASE_FORM,
  MATERIAL_FORM,
  MODULE_QUESTION_TYPES,
  QUESTION_FORM,
} from './questionBankConstants.js';

export function normalizeJsonInput(value) {
  const parsed = JSON.parse(value);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.questions)) return parsed.questions;
  if (Array.isArray(parsed.items)) return parsed.items;
  throw new Error('JSON 需要是数组，或包含 questions/items 数组');
}

function normalizeAikenAnswer(value) {
  const raw = String(value || '').trim();
  if (/^(T|TRUE|正确|对)$/i.test(raw)) return 'true';
  if (/^(F|FALSE|错误|错)$/i.test(raw)) return 'false';
  const letters = raw.match(/[A-Z]/gi);
  return letters?.length ? letters.map((item) => item.toUpperCase()).join('') : raw;
}

function normalizeAikenType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (/多选|multiple|multi/.test(raw)) return 'multi_choice';
  if (/单选|single|choice/.test(raw)) return 'single_choice';
  if (/判断|true|false|tf|是非/.test(raw)) return 'true_false';
  if (/填空|blank|gap|cloze/.test(raw)) return 'fill_blank';
  if (/听写|dictation/.test(raw)) return 'dictation';
  if (/简答|short/.test(raw)) return 'short_answer';
  if (/匹配|matching|match/.test(raw)) return 'matching';
  if (/改错|correction|error/.test(raw)) return 'error_correction';
  if (/释义|definition/.test(raw)) return 'definition';
  if (/中译英|zh_to_en|chinese/.test(raw)) return 'zh_to_en';
  if (/英译中|en_to_zh/.test(raw)) return 'en_to_zh';
  return raw;
}

function getModuleQuestionType(moduleCode, explicitType, options, answer, content, fallbackType) {
  const allowed = new Set((MODULE_QUESTION_TYPES[moduleCode] || []).map((item) => item.value));
  const candidates = [
    explicitType,
    /^(true|false)$/i.test(answer) ? 'true_false' : '',
    options.length ? (answer.length > 1 ? 'multi_choice' : 'single_choice') : '',
    /_{2,}|\(\s*\)|（\s*）/.test(content) ? 'fill_blank' : '',
    fallbackType,
  ].filter(Boolean);
  return candidates.find((type) => allowed.has(type)) || candidates[0] || '';
}

export function parseAikenInput(value, moduleId, moduleCode, fallbackType = '') {
  if (!moduleId) throw new Error('Aiken 文本导入需要先选择科目');
  const blocks = value.trim().split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block, index) => {
    const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
    const typeLineIndex = lines.findIndex((line) => /^(TYPE|题型|类型)\s*[:：]/i.test(line));
    const explicitType = typeLineIndex >= 0 ? normalizeAikenType(lines[typeLineIndex].replace(/^(TYPE|题型|类型)\s*[:：]\s*/i, '')) : '';
    const bodyLines = typeLineIndex >= 0 ? lines.filter((_, lineIndex) => lineIndex !== typeLineIndex) : lines;
    const optionStart = bodyLines.findIndex((line) => /^[A-Z][.)、．]\s*/.test(line));
    const answerLineIndex = bodyLines.findIndex((line) => /^(ANSWER|答案)\s*[:：]\s*\S+/i.test(line));
    if (answerLineIndex < 0) throw new Error(`第 ${index + 1} 题缺少答案行`);
    const contentEnd = optionStart >= 0 ? optionStart : answerLineIndex;
    const content = bodyLines.slice(0, contentEnd).join('\n');
    const optionLines = optionStart >= 0 ? bodyLines.slice(optionStart, answerLineIndex) : [];
    const options = optionLines.map((line) => line.replace(/^[A-Z][.)、．]\s*/, ''));
    const answer = normalizeAikenAnswer(bodyLines[answerLineIndex].replace(/^(?:ANSWER|答案)\s*[:：]\s*/i, ''));
    if (!content || (options.length === 1) || !answer) throw new Error(`第 ${index + 1} 题内容不完整`);
    const questionType = getModuleQuestionType(moduleCode, explicitType, options, answer, content, fallbackType);
    const analysis = bodyLines.slice(answerLineIndex + 1).join('\n').replace(/^解析\s*[:：]\s*/i, '');
    return {
      module_id: moduleId,
      question_type: questionType,
      title: content.slice(0, 80),
      content,
      options,
      answer,
      analysis,
    };
  });
}

export function asOptions(items, emptyLabel = '不限定') {
  return [{ id: '', name: emptyLabel }, ...(items || []).map((item) => ({
    ...item,
    name: item.name || item.title || item.id,
  }))];
}

export function activeItems(items = []) {
  return items.filter((item) => !['disabled', 'deleted'].includes(String(item.status || '').toLowerCase()));
}

const MATERIAL_TYPE_LABELS = { article: '文章', audio: '音频', video: '视频', image: '图片', passage: '阅读语篇', document: '文档' };
export function materialTypeLabel(type) {
  return MATERIAL_TYPE_LABELS[String(type || '').toLowerCase()] || type || '';
}

const STATUS_LABELS = { active: '启用', disabled: '禁用', deleted: '已删除' };
export function statusLabel(status) {
  return STATUS_LABELS[String(status || '').toLowerCase()] || status || '';
}

const QUESTION_TYPE_LABELS = {};
Object.values(MODULE_QUESTION_TYPES).flat().forEach(({ value, label }) => {
  if (!QUESTION_TYPE_LABELS[value]) QUESTION_TYPE_LABELS[value] = label;
});
export function questionTypeLabel(type) {
  return QUESTION_TYPE_LABELS[String(type || '').toLowerCase()] || type || '';
}

const RESOURCE_FORM_FIELDS = {
  'knowledge-points': {
    module_id: '',
    parent_id: '',
    name: '',
    description: '',
    sort_order: 0,
    status: 'active',
  },
  'learning-systems': {
    parent_id: '',
    code: '',
    name: '',
    description: '',
    sort_order: 0,
    status: 'active',
  },
  categories: {
    module_id: '',
    system_id: '',
    parent_id: '',
    code: '',
    name: '',
    description: '',
    sort_order: 0,
    status: 'active',
  },
  difficulties: {
    module_id: '',
    system_id: '',
    name: '',
    level: 0,
    color: '',
    description: '',
    sort_order: 0,
    status: 'active',
  },
  tags: {
    name: '',
    type: 'general',
    color: '',
    description: '',
  },
};

function mapFields(defaults, item) {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, defaultValue]) => [key, item[key] || defaultValue])
  );
}

export function mapResourceForm(resource, item = {}) {
  const defaults = RESOURCE_FORM_FIELDS[resource];
  if (defaults) return mapFields(defaults, item);
  return {
    ...BASE_FORM,
    code: item.code || '',
    name: item.name || '',
    icon: item.icon || '',
    color: item.color || '',
    description: item.description || '',
    sort_order: item.sort_order || 0,
    status: item.status || 'active',
  };
}

export function mapMaterialForm(item = {}) {
  return Object.fromEntries(
    Object.keys(MATERIAL_FORM).map((key) => [key, item[key] ?? MATERIAL_FORM[key]])
  );
}

export function mapQuestionForm(item = {}) {
  const materialIds = Array.isArray(item.material_ids)
    ? item.material_ids.filter((id) => id && id !== item.material_id)
    : [];
  return {
    ...QUESTION_FORM,
    ...Object.fromEntries(
      Object.keys(QUESTION_FORM).filter((k) => k !== 'ext').map((key) => [key, item[key] ?? QUESTION_FORM[key]])
    ),
    is_official: item.is_official === 1 || item.is_official === true,
    tag_ids: Array.isArray(item.tag_ids) ? item.tag_ids : [],
    material_ids: materialIds,
    knowledge_point_ids: Array.isArray(item.knowledge_point_ids) ? item.knowledge_point_ids : [],
    ext: item.ext || {},
  };
}

export function validateQuestionForm(form) {
  if (!String(form.module_id || '').trim()) return '请选择科目';
  if (!String(form.title || '').trim()) return '请输入标题';
  if (!String(form.content || '').trim()) return '请输入题干';
  return '';
}

export function formatImportContext(context = {}) {
  return [context.module, context.category, context.difficulty, ...(context.tags || [])].filter(Boolean).join(' / ');
}

const QB_VALID_TABS = ['resources', 'materials', 'questions', 'batch-import'];

export function readQbTabFromHash() {
  if (typeof window === 'undefined') return 'resources';
  const match = window.location.hash.match(/(?:^|&)qb=([^&]+)/);
  if (match) {
    const value = decodeURIComponent(match[1]);
    if (QB_VALID_TABS.includes(value)) return value;
  }
  return 'resources';
}

export function writeQbTabToHash(qbTab) {
  if (typeof window === 'undefined') return;
  let hash = window.location.hash.replace(/^#/, '');
  hash = hash.replace(/(?:^|&)qb=[^&]*/, '');
  const parts = hash ? hash.split('&').filter(Boolean) : [];
  parts.push(`qb=${qbTab}`);
  window.history.replaceState(null, '', `#${parts.join('&')}`);
}
