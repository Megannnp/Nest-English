import {
  assertMaxLength,
  buildQuestionInsertMeta,
  createValidationError,
  db,
  insertUserQuestion,
  nanoid,
  safeJsonParse,
  toClientQuestion,
} from './helpers.js';

export async function createQuestionForUser({ userId, payload }) {
  const { title, type, themes = [], theme, promptText, compositionSize, defaultScore } = payload;
  const prepared = buildQuestionInsertMeta({
    title,
    promptText,
    type,
    themes,
    theme,
    compositionSize,
    defaultScore,
  });

  if (!prepared.promptText) throw createValidationError('写作内容与要求不能为空');
  assertMaxLength(title, 200, '标题不能超过200字');

  const id = nanoid();
  await insertUserQuestion({
    id,
    userId,
    prepared: {
      ...prepared,
      sourceYear: '',
      sourceRegion: '',
      sourcePaper: '',
      sourceLabel: '',
    },
    createdAt: Date.now(),
  });

  const row = await db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  return toClientQuestion(row);
}

export async function duplicateQuestionForUser({ userId, questionId }) {
  const row = await db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!row) throw createValidationError('题目不存在', 404);

  const isSystemQuestion = (row.source_type || 'user') === 'system';
  const isOwnerQuestion = row.user_id === userId;
  if (isSystemQuestion) throw createValidationError('内置题目不支持复制', 403);
  if (!isOwnerQuestion) throw createValidationError('无权限复制该题目', 403);

  const prepared = buildQuestionInsertMeta({
    title: row.title,
    promptText: row.prompt_text,
    type: row.type,
    themes: safeJsonParse(row.themes, row.theme ? [row.theme] : []),
    theme: row.theme,
    compositionSize: row.composition_size,
    defaultScore: row.default_score,
    sourceYear: row.source_year,
    sourceRegion: row.source_region,
    sourcePaper: row.source_paper,
    sourceLabel: row.source_label ? `${row.source_label} · 已复制` : '复制题目',
  });

  const id = nanoid();
  await insertUserQuestion({
    id,
    userId,
    prepared: {
      ...prepared,
      classificationMode: 'runtime_mode',
      typeConfidence: 'medium',
      themeConfidence: 'medium',
      needsReview: 0,
    },
    createdAt: Date.now(),
  });

  const created = await db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  return toClientQuestion(created);
}

export async function updateQuestionForUser({ userId, questionId, payload }) {
  const row = await db.prepare('SELECT * FROM questions WHERE id = ? AND user_id = ?').get(questionId, userId);
  if (!row) throw createValidationError('题目不存在或无权限', 404);

  const nextPayload = {
    title: payload.title === undefined ? row.title : payload.title,
    type: payload.type === undefined ? row.type : payload.type,
    themes: payload.themes === undefined ? safeJsonParse(row.themes, row.theme ? [row.theme] : []) : payload.themes,
    theme: payload.theme === undefined ? row.theme : payload.theme,
    promptText: payload.promptText === undefined ? row.prompt_text : payload.promptText,
    compositionSize: payload.compositionSize === undefined ? row.composition_size : payload.compositionSize,
    defaultScore: payload.defaultScore === undefined ? row.default_score : payload.defaultScore,
    sourceYear: row.source_year,
    sourceRegion: row.source_region,
    sourcePaper: row.source_paper,
    sourceLabel: row.source_label,
  };

  if (payload.promptText !== undefined && !nextPayload.promptText) {
    throw createValidationError('写作内容与要求不能为空');
  }
  if (payload.title !== undefined) assertMaxLength(payload.title, 200, '标题不能超过200字');

  const prepared = buildQuestionInsertMeta(nextPayload);

  await db.prepare(`
    UPDATE questions
    SET title = ?, type = ?, themes = ?, theme = ?, composition_size = ?, default_score = ?,
        prompt_text = ?, normalized_title = ?, prompt_fingerprint = ?, classification_mode = 'runtime_mode'
    WHERE id = ? AND user_id = ?
  `).run(
    prepared.title,
    prepared.type,
    JSON.stringify(prepared.themes),
    prepared.theme,
    prepared.compositionSize,
    prepared.defaultScore,
    prepared.promptText,
    prepared.normalizedTitle,
    prepared.promptFingerprint,
    questionId,
    userId
  );

  const updated = await db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  return toClientQuestion(updated);
}

export async function deleteQuestionForUser({ userId, questionId }) {
  const info = await db.prepare('DELETE FROM questions WHERE id = ? AND user_id = ?').run(questionId, userId);
  if (info.changes === 0) throw createValidationError('题目不存在或无权限', 404);
}
