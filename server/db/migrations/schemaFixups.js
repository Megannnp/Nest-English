/* eslint-disable complexity */
export async function normalizeQuestionCreatedAtColumn(pool) {
  await pool.query(`
    UPDATE questions
    SET created_at = CASE
      WHEN created_at REGEXP '^[0-9]{10,13}$' THEN created_at
      WHEN STR_TO_DATE(created_at, '%Y/%m/%d') IS NOT NULL THEN UNIX_TIMESTAMP(STR_TO_DATE(created_at, '%Y/%m/%d')) * 1000
      WHEN STR_TO_DATE(created_at, '%Y-%m-%d') IS NOT NULL THEN UNIX_TIMESTAMP(STR_TO_DATE(created_at, '%Y-%m-%d')) * 1000
      WHEN STR_TO_DATE(created_at, '%c/%e/%Y') IS NOT NULL THEN UNIX_TIMESTAMP(STR_TO_DATE(created_at, '%c/%e/%Y')) * 1000
      ELSE UNIX_TIMESTAMP() * 1000
    END
    WHERE created_at IS NOT NULL
      AND created_at NOT REGEXP '^[0-9]{10,13}$'
  `);

  await pool.query(`ALTER TABLE questions MODIFY COLUMN created_at BIGINT NOT NULL`);
  await pool.query(`ALTER TABLE questions MODIFY COLUMN user_id VARCHAR(64) NULL`);
}

async function getColumnSet(pool, database, tableName) {
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
  `, [database, tableName]);

  return new Set(columns.map((item) => item.COLUMN_NAME));
}

function _buildMetadataAlterClauses(existing) {
  const clauses = [];
  if (!existing.has('source_type')) clauses.push(`ADD COLUMN source_type VARCHAR(20) NOT NULL DEFAULT 'user'`);
  if (!existing.has('source_year')) clauses.push(`ADD COLUMN source_year VARCHAR(16) DEFAULT ''`);
  if (!existing.has('source_region')) clauses.push(`ADD COLUMN source_region VARCHAR(64) DEFAULT ''`);
  if (!existing.has('source_paper')) clauses.push(`ADD COLUMN source_paper VARCHAR(64) DEFAULT ''`);
  if (!existing.has('source_label')) clauses.push(`ADD COLUMN source_label VARCHAR(128) DEFAULT ''`);
  if (!existing.has('theme')) clauses.push(`ADD COLUMN theme VARCHAR(50) DEFAULT ''`);
  if (!existing.has('composition_size')) clauses.push(`ADD COLUMN composition_size VARCHAR(10) DEFAULT ''`);
  if (!existing.has('default_score')) clauses.push(`ADD COLUMN default_score INT DEFAULT NULL`);
  if (!existing.has('normalized_title')) clauses.push(`ADD COLUMN normalized_title VARCHAR(255) DEFAULT ''`);
  if (!existing.has('prompt_fingerprint')) clauses.push(`ADD COLUMN prompt_fingerprint VARCHAR(128) DEFAULT ''`);
  if (!existing.has('classification_mode')) clauses.push(`ADD COLUMN classification_mode VARCHAR(20) DEFAULT ''`);
  if (!existing.has('type_confidence')) clauses.push(`ADD COLUMN type_confidence VARCHAR(20) DEFAULT ''`);
  if (!existing.has('theme_confidence')) clauses.push(`ADD COLUMN theme_confidence VARCHAR(20) DEFAULT ''`);
  if (!existing.has('needs_review')) clauses.push(`ADD COLUMN needs_review TINYINT(1) NOT NULL DEFAULT 0`);
  if (!existing.has('is_disabled')) clauses.push(`ADD COLUMN is_disabled TINYINT(1) NOT NULL DEFAULT 0`);
  return clauses;
}

export async function ensureQuestionMetadataColumns(pool, DB_CONFIG) {
  const existing = await getColumnSet(pool, DB_CONFIG.database, 'questions');
  const alterClauses = _buildMetadataAlterClauses(existing);

  if (alterClauses.length > 0) {
    await pool.query(`ALTER TABLE questions ${alterClauses.join(',\n      ')}`);
  }
}

export async function ensureUserAccountCodeColumn(pool, DB_CONFIG) {
  const existing = await getColumnSet(pool, DB_CONFIG.database, 'users');
  if (!existing.has('account_code')) {
    await pool.query(`ALTER TABLE users ADD COLUMN account_code VARCHAR(6) DEFAULT NULL AFTER id`);
  }
}

export async function ensureUserPreferencesColumn(pool, DB_CONFIG) {
  const existing = await getColumnSet(pool, DB_CONFIG.database, 'users');
  if (!existing.has('preferences')) {
    await pool.query(`ALTER TABLE users ADD COLUMN preferences JSON DEFAULT NULL AFTER class_name`);
  }
}

export async function ensureWritingTaskRuntimeColumns(pool, DB_CONFIG) {
  const existing = await getColumnSet(pool, DB_CONFIG.database, 'writing_tasks');
  const alterClauses = [];
  if (!existing.has('next_run_at')) alterClauses.push(`ADD COLUMN next_run_at BIGINT DEFAULT NULL AFTER updated_at`);
  if (!existing.has('last_heartbeat_at')) alterClauses.push(`ADD COLUMN last_heartbeat_at BIGINT DEFAULT NULL AFTER next_run_at`);
  if (!existing.has('dead_lettered_at')) alterClauses.push(`ADD COLUMN dead_lettered_at BIGINT DEFAULT NULL AFTER last_heartbeat_at`);

  if (alterClauses.length > 0) {
    await pool.query(`ALTER TABLE writing_tasks ${alterClauses.join(',\n      ')}`);
  }
}

export async function ensureWritingRosterColumns(pool, DB_CONFIG) {
  const existing = await getColumnSet(pool, DB_CONFIG.database, 'writings');
  if (!existing.has('roster_id')) {
    await pool.query(`ALTER TABLE writings ADD COLUMN roster_id VARCHAR(64) DEFAULT NULL AFTER user_id`);
  }
}

export async function ensureWritingSubmittedByTeacherColumn(pool, DB_CONFIG) {
  const existing = await getColumnSet(pool, DB_CONFIG.database, 'writings');
  if (!existing.has('submitted_by_teacher')) {
    await pool.query(`ALTER TABLE writings ADD COLUMN submitted_by_teacher JSON DEFAULT NULL AFTER image_data`);
  }
}

export async function ensureWritingAssignmentColumns(pool, DB_CONFIG) {
  const existing = await getColumnSet(pool, DB_CONFIG.database, 'writings');
  const alterClauses = [];
  if (!existing.has('assignment_id')) alterClauses.push(`ADD COLUMN assignment_id VARCHAR(64) DEFAULT NULL AFTER question_id`);
  if (!existing.has('prompt_text')) alterClauses.push(`ADD COLUMN prompt_text LONGTEXT AFTER writing_title`);
  if (alterClauses.length > 0) {
    await pool.query(`ALTER TABLE writings ${alterClauses.join(',\n      ')}`);
  }

  const assignmentExisting = await getColumnSet(pool, DB_CONFIG.database, 'assignments');
  if (!assignmentExisting.has('selected_type_mix')) {
    await pool.query(`
      ALTER TABLE assignments
      ADD COLUMN selected_type_mix VARCHAR(1024) DEFAULT '[]' AFTER selected_type
    `);
  }
}
