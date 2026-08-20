import {
  buildQuestionInsertMeta,
  createValidationError,
  db,
  nanoid,
  toClientQuestion,
  userQuestionInsertSql,
} from './helpers.js';

function _itemContentFields(item) {
  return {
    title: item?.title,
    promptText: item?.promptText,
    type: item?.type,
    themes: item?.themes,
    theme: item?.theme,
    compositionSize: item?.compositionSize,
    defaultScore: item?.defaultScore,
  };
}

function _itemMetaFields(item) {
  return {
    sourceYear: item?.sourceYear,
    sourceRegion: item?.sourceRegion,
    sourcePaper: item?.sourcePaper,
    sourceLabel: item?.sourceLabel,
    classificationMode: item?.classificationMode,
    typeConfidence: item?.typeConfidence,
    themeConfidence: item?.themeConfidence,
    needsReview: item?.needsReview,
  };
}

export async function bulkImportQuestionsForUser({ userId, items }) {
  if (!Array.isArray(items) || !items.length) {
    throw createValidationError('请至少提供一道题目');
  }
  if (items.length > 50) {
    throw createValidationError('单次最多导入 50 道题目');
  }

  const now = Date.now();
  const createdIds = [];
  let connection;

  try {
    connection = await db.pool.getConnection();
    await connection.beginTransaction();

    for (const [index, item] of items.entries()) {
      const prepared = buildQuestionInsertMeta({
        ..._itemContentFields(item),
        ..._itemMetaFields(item),
      });

      if (!prepared.promptText) {
        throw createValidationError(`第 ${index + 1} 题的写作内容不能为空`);
      }

      const id = nanoid();
      createdIds.push(id);

      await connection.query(userQuestionInsertSql, [
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
        now + index,
        prepared.sourceYear || '',
        prepared.sourceRegion || '',
        prepared.sourcePaper || '',
        prepared.sourceLabel || '',
      ]);
    }

    await connection.commit();

    const placeholders = createdIds.map(() => '?').join(',');
    const createdRows = await db.prepare(
      `SELECT * FROM questions WHERE id IN (${placeholders}) ORDER BY created_at DESC`
    ).all(...createdIds);

    return createdRows.map(toClientQuestion);
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch { /* intentional */ }
    }
    throw error;
  } finally {
    connection?.release();
  }
}
