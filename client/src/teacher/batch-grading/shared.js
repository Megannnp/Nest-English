export function sameId(left, right) { return String(left) === String(right); }
export function revokePreview(item) { if (item?.preview) URL.revokeObjectURL(item.preview); }
export function revokePreviewList(items = []) { items.forEach(revokePreview); }

let localBatchItemCounter = 0;

export function createBatchItemId() {
  localBatchItemCounter += 1;
  return `batch-item-${Date.now()}-${localBatchItemCounter}`;
}

export const THEME = {
  primary: '#c8852a', primaryLight: '#fdf0d8', primaryDark: '#8b5e1a',
  border: '#e8e0d5', text: '#2a1f14', textSecondary: '#8a7d6e',
  textMuted: '#a09080', success: '#2d9e6b', successLight: '#edfaf3',
  error: '#b02020', errorLight: '#fdf0ef',
  card: '#ffffff', cardAlt: '#faf8f5', bg: '#f5f1eb',
};

export const SELECT_ARROW = {
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9' fill='none'%3E%3Cpath d='M1 1.5L7 7.5L13 1.5' stroke='%238a7d6e' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '14px 9px',
};

export const STATUS = {
  pending:   { color: THEME.textMuted,  bg: '#f0ece6', label: '待处理' },
  ocr:       { color: '#3b82f6',        bg: '#eff6ff', label: '识别中' },
  confirm:   { color: THEME.primary,    bg: THEME.primaryLight, label: '待确认' },
  uploading: { color: '#3b82f6',        bg: '#eff6ff', label: '上传中' },
  confirmed: { color: THEME.success,    bg: THEME.successLight, label: '✓ 已上传' },
  grading:   { color: '#8b5cf6',        bg: '#f5f3ff', label: '批改中' },
  done:      { color: THEME.success,    bg: THEME.successLight, label: '已完成' },
  canceled:  { color: '#8b5e1a',        bg: '#fff7ed', label: '已停止' },
  error:     { color: THEME.error,      bg: THEME.errorLight,   label: '失败' },
};

export const BATCH_AI_TIMEOUT_MS = 120000;
export const MIN_RECOGNIZED_TEXT_CHARS = 501;

export function getRecognizedTextIssue(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return '识别未完成，请先重新识别作文正文';
  if (normalized.length < MIN_RECOGNIZED_TEXT_CHARS) {
    return '识别文本疑似只有摘要，请重新识别后再确认';
  }
  return '';
}

export function hasUsableRecognizedText(text = '') {
  return !getRecognizedTextIssue(text);
}

export function extractPromptMaxScore(promptText = '') {
  const text = String(promptText || '');
  const match = text.match(/满分\s*[:：]?\s*(\d{1,3})\s*分/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function normalizeRecognizedEssayText(text = '') {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function normalizeStudentName(value = '') {
  return String(value)
    .replace(/\.[^.]+$/, '')
    .replace(/作文|英语|写作|图片|扫描|拍照|姓名|学生|同学|班级|高[一二三123]|初[一二三123]/g, '')
    .replace(/[0-9０-９_\-\s()[\]（）【】,，.。]/g, '')
    .replace(/[^\u4e00-\u9fa5·]/g, '')
    .trim();
}

export function nameDistance(left = '', right = '') {
  const a = Array.from(left);
  const b = Array.from(right);
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

export function matchStudentOption({ detectedName = '', fileName = '', studentOptions = [] }) {
  const candidates = [
    normalizeStudentName(detectedName),
    normalizeStudentName(fileName),
  ].filter(Boolean);
  const registeredOptions = studentOptions;

  for (const candidate of candidates) {
    const exact = registeredOptions.find((item) => normalizeStudentName(item.name) === candidate);
    if (exact) return exact;

    const contained = registeredOptions.find((item) => {
      const optionName = normalizeStudentName(item.name);
      return optionName && candidate.length >= 2 && (candidate.includes(optionName) || optionName.includes(candidate));
    });
    if (contained) return contained;

    if (candidate.length >= 3) {
      const near = registeredOptions
        .map((item) => ({ item, distance: nameDistance(candidate, normalizeStudentName(item.name)) }))
        .filter(({ distance }) => distance <= 1)
        .sort((left, right) => left.distance - right.distance)[0];
      if (near) return near.item;
    }
  }

  return null;
}

export function reconcileBatchItemTargets(items = [], studentOptions = []) {
  const validKeys = new Set(studentOptions.map((item) => item.key).filter(Boolean));
  let changed = false;

  const next = items.map((item) => {
    if (!item?.studentTargetKey) return item;
    if (validKeys.has(item.studentTargetKey)) return item;
    if (item.writingId) return item;

    changed = true;
    return {
      ...item,
      status: 'confirm',
      studentTargetKey: '',
      writingOwnerId: '',
      errorMsg: '当前学生目标已失效，请重新选择学生',
    };
  });

  return changed ? next : items;
}

function pickFirst(values = [], projector = (value) => value) {
  if (!Array.isArray(values) || values.length === 0) return '';
  return projector(values[0]) || '';
}

export function toFeedbackDisplayText(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  return item.detail || item.technique || item.title || item.comment || item.explanation || item.problem || item.issue || item.original || '';
}

function normalizeFeedbackList(values = []) {
  if (!Array.isArray(values)) return [];
  return values.map(toFeedbackDisplayText).filter(Boolean);
}

export function getPrimaryHighlight(feedback) {
  return (
    pickFirst(feedback?.highlights?.content, toFeedbackDisplayText) ||
    pickFirst(feedback?.highlights?.sentences, (item) => item?.comment || item?.original || '') ||
    pickFirst(feedback?.highlights?.vocabulary, (item) => item?.comment || item?.word || '') ||
    pickFirst(feedback?.strengths, toFeedbackDisplayText)
  );
}

export function getPrimaryImprovement(feedback) {
  const improvements = Array.isArray(feedback?.improvements) && feedback.improvements.length > 0
    ? feedback.improvements
    : (Array.isArray(feedback?.suggestions) ? feedback.suggestions : []);
  return pickFirst(feedback?.nextActions, toFeedbackDisplayText) || pickFirst(improvements, toFeedbackDisplayText);
}

export function getQuickProblemList(feedback) {
  const mainProblems = normalizeFeedbackList(feedback?.mainProblems);
  if (mainProblems.length > 0) return mainProblems;
  const weaknesses = normalizeFeedbackList(feedback?.weaknesses);
  if (weaknesses.length > 0) return weaknesses;
  return [];
}

export function getQuickActionList(feedback) {
  const nextActions = normalizeFeedbackList(feedback?.nextActions);
  if (nextActions.length > 0) return nextActions;
  if (Array.isArray(feedback?.improvements) && feedback.improvements.length > 0) {
    return normalizeFeedbackList(feedback.improvements);
  }
  return [];
}

export function getCategoryScoreLabel(category) {
  if (category?.score !== undefined && category?.score !== null && category?.score !== '') return `${category.score}`;
  return category?.grade || '--';
}
