import {
  buildPromptFingerprint,
  ensureThemeArray,
  ensureSingleTheme,
  inferCompositionSize,
  inferDefaultScore,
  normalizeQuestionTitleValue,
} from '../../utils/questionMetadata.js';

export async function backfillUserAccountCodes(pool, DB_CONFIG, createUserAccountCode) {
  const [rows] = await pool.query(`
    SELECT id
    FROM users
    WHERE account_code IS NULL OR account_code = ''
    ORDER BY created_at ASC
  `);

  for (const row of rows) {
    const accountCode = await createUserAccountCode(pool);
    await pool.query('UPDATE users SET account_code = ? WHERE id = ?', [accountCode, row.id]);
  }

  await pool.query(`ALTER TABLE users MODIFY COLUMN account_code VARCHAR(6) NOT NULL`);

  const [indexes] = await pool.query(`
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'account_code'
  `, [DB_CONFIG.database]);

  const hasUniqueIndex = indexes.some((item) => item.INDEX_NAME === 'uniq_users_account_code');
  if (!hasUniqueIndex) {
    await pool.query('ALTER TABLE users ADD UNIQUE KEY uniq_users_account_code (account_code)');
  }
}

export async function backfillQuestionMetadata(pool) {
  const [rows] = await pool.query(`
    SELECT id, title, type, themes, theme, composition_size, default_score, prompt_text, source_region, source_paper
    FROM questions
  `);

  for (const row of rows) {
    let themes = [];
    try {
      themes = row.themes ? JSON.parse(row.themes) : [];
    } catch {
      themes = [];
    }

    const theme = ensureSingleTheme(row.theme, themes);
    const normalizedTitle = normalizeQuestionTitleValue(row.title);
    const promptFingerprint = buildPromptFingerprint(row.prompt_text || '');
    const compositionSize = row.composition_size || inferCompositionSize(row.type);
    const defaultScore = row.default_score ?? inferDefaultScore({
      sourceRegion: row.source_region,
      sourcePaper: row.source_paper,
      type: row.type,
    });

    await pool.query(`
      UPDATE questions
      SET themes = ?, theme = ?, composition_size = ?, default_score = ?,
          normalized_title = ?, prompt_fingerprint = ?,
          classification_mode = CASE WHEN classification_mode = '' OR classification_mode IS NULL THEN 'runtime_mode' ELSE classification_mode END,
          type_confidence = CASE WHEN type_confidence = '' OR type_confidence IS NULL THEN 'medium' ELSE type_confidence END,
          theme_confidence = CASE WHEN theme_confidence = '' OR theme_confidence IS NULL THEN 'medium' ELSE theme_confidence END,
          needs_review = CASE WHEN needs_review IS NULL THEN 0 ELSE needs_review END
      WHERE id = ?
    `, [
      JSON.stringify(ensureThemeArray(theme, themes)),
      theme,
      compositionSize,
      defaultScore,
      normalizedTitle,
      promptFingerprint,
      row.id,
    ]);
  }
}
