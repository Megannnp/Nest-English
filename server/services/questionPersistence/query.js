import db from '../../db/database.js';
import {
  safeJsonParse,
  toClientQuestion,
} from '../questionMetadataService.js';
import { QUESTION_SELECT } from './model.js';

const WRITING_SYSTEM_QUESTION_FILTER = `
  source_type = ?
  AND COALESCE(is_disabled, 0) = 0
  AND COALESCE(status, 'active') <> 'deleted'
  AND (COALESCE(prompt_text, '') <> '' OR COALESCE(content, '') <> '')
  AND (
    module_id IS NULL
    OR module_id IN (SELECT id FROM modules WHERE code = 'writing')
  )
`;

function buildSystemQuestionFilter(systemId = '') {
  const where = [WRITING_SYSTEM_QUESTION_FILTER];
  const params = ['system'];
  if (systemId) {
    where.push('(system_id = ? OR system_id IS NULL OR system_id = ?)');
    params.push(systemId, '');
  }
  return {
    sql: where.map((clause) => `(${clause})`).join(' AND '),
    params,
  };
}

export async function listQuestionTagsForUser(userId) {
  const rows = await db.prepare(`
    SELECT themes
    FROM questions
    WHERE user_id = ? OR (${WRITING_SYSTEM_QUESTION_FILTER})
  `).all(userId, 'system');
  const tagSet = new Set();
  rows.forEach((row) => {
    const themes = safeJsonParse(row.themes, []);
    if (Array.isArray(themes)) {
      themes.forEach((tag) => {
        if (tag && tag.trim()) tagSet.add(tag.trim());
      });
    }
  });
  return Array.from(tagSet).sort();
}

export async function listQuestionsForViewer(user, { systemId = '' } = {}) {
  const systemFilter = buildSystemQuestionFilter(systemId);
  const rows = user
    ? await db.prepare(
        `${QUESTION_SELECT}
         WHERE user_id = ? OR (${systemFilter.sql})
         ORDER BY source_type ASC, created_at DESC
         LIMIT 400`
      ).all(user.id, ...systemFilter.params)
    : await db.prepare(
        `${QUESTION_SELECT}
         WHERE ${systemFilter.sql}
         ORDER BY created_at DESC
         LIMIT 400`
      ).all(...systemFilter.params);

  return rows.map(toClientQuestion);
}
