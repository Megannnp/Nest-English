import db from '../../db/database.js';
import { nanoid } from '../../utils/nanoid.js';
import {
  assertMaxLength,
  createValidationError,
} from '../../utils/routeValidation.js';
import {
  buildQuestionInsertMeta,
  safeJsonParse,
  toClientQuestion,
} from '../questionMetadataService.js';

export {
  assertMaxLength,
  buildQuestionInsertMeta,
  createValidationError,
  db,
  nanoid,
  safeJsonParse,
  toClientQuestion,
};

export const userQuestionInsertSql = `
  INSERT INTO questions (
    id, user_id, title, type, themes, theme, composition_size, default_score,
    prompt_text, normalized_title, prompt_fingerprint, classification_mode,
    type_confidence, theme_confidence, needs_review, created_at,
    source_type, source_year, source_region, source_paper, source_label
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?, ?, ?)
`;

export async function insertUserQuestion({ id, userId, prepared, createdAt }) {
  await db.prepare(userQuestionInsertSql).run(
    id,
    userId,
    prepared.title,
    prepared.type,
    JSON.stringify(prepared.themes),
    prepared.theme,
    prepared.compositionSize,
    prepared.defaultScore,
    prepared.promptText,
    prepared.normalizedTitle,
    prepared.promptFingerprint,
    prepared.classificationMode,
    prepared.typeConfidence,
    prepared.themeConfidence,
    prepared.needsReview,
    createdAt,
    prepared.sourceYear || '',
    prepared.sourceRegion || '',
    prepared.sourcePaper || '',
    prepared.sourceLabel || ''
  );
}
