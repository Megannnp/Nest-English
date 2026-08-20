import { ValidationError } from '../utils/appError.js';

const VALID_PREP_EXAM_IDS = new Set([
  'k12',
  'zhongkao',
  'gaokao',
  'cet4',
  'cet6',
  'kaoyan',
  'ielts',
  'toefl',
]);

export function normalizePrepExamPreference(prepExamId) {
  const normalized = String(prepExamId || '').trim();
  if (!normalized) return '';
  if (!VALID_PREP_EXAM_IDS.has(normalized)) {
    throw new ValidationError('备考目标无效');
  }
  return normalized;
}

