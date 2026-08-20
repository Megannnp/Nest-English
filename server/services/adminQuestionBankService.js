/* eslint-disable complexity */
import { callVolcengineAI } from './aiProviderService.js';
import { parseAIJsonPayload } from './aiService.js';
import {
  buildQuestionInsertMeta,
  toClientQuestion,
} from './questionMetadataService.js';
import db from '../db/database.js';
import { nanoid } from '../utils/nanoid.js';
import {
  assertMaxLength,
  createValidationError,
} from '../utils/routeValidation.js';

const ADMIN_RESOURCES = {
  modules: {
    table: 'modules',
    orderBy: 'sort_order ASC, name ASC',
    searchable: ['name', 'code', 'description'],
    fields: {
      code: { max: 64, required: true },
      name: { max: 128, required: true },
      icon: { max: 64 },
      color: { max: 32 },
      description: { max: 512 },
      sort_order: { type: 'int', defaultValue: 0 },
      status: { max: 16, defaultValue: 'active' },
    },
  },
  'learning-systems': {
    table: 'learning_systems',
    orderBy: 'sort_order ASC, name ASC',
    searchable: ['name', 'code', 'description'],
    fields: {
      parent_id: { max: 64, nullable: true },
      code: { max: 64, required: true },
      name: { max: 128, required: true },
      description: { max: 512 },
      sort_order: { type: 'int', defaultValue: 0 },
      status: { max: 16, defaultValue: 'active' },
    },
  },
  categories: {
    table: 'categories',
    orderBy: 'sort_order ASC, name ASC',
    searchable: ['name', 'code', 'description'],
    fields: {
      module_id: { max: 64, required: true },
      system_id: { max: 64, nullable: true },
      parent_id: { max: 64, nullable: true },
      code: { max: 64, required: true },
      name: { max: 128, required: true },
      description: { max: 512 },
      sort_order: { type: 'int', defaultValue: 0 },
      status: { max: 16, defaultValue: 'active' },
    },
  },
  difficulties: {
    table: 'difficulties',
    orderBy: 'sort_order ASC, level ASC, name ASC',
    searchable: ['name', 'description'],
    fields: {
      module_id: { max: 64, nullable: true },
      system_id: { max: 64, nullable: true },
      name: { max: 128, required: true },
      level: { type: 'int', defaultValue: 0 },
      color: { max: 32 },
      description: { max: 512 },
      sort_order: { type: 'int', defaultValue: 0 },
      status: { max: 16, defaultValue: 'active' },
    },
  },
  tags: {
    table: 'tags',
    orderBy: 'type ASC, name ASC',
    searchable: ['name', 'type', 'description'],
    fields: {
      name: { max: 128, required: true },
      color: { max: 32 },
      type: { max: 32, defaultValue: 'general' },
      description: { max: 512 },
    },
  },
  'knowledge-points': {
    table: 'knowledge_points',
    orderBy: 'sort_order ASC, name ASC',
    searchable: ['name', 'description'],
    fields: {
      module_id: { max: 64, nullable: true },
      parent_id: { max: 64, nullable: true },
      name: { max: 128, required: true },
      description: { max: 512 },
      sort_order: { type: 'int', defaultValue: 0 },
      status: { max: 16, defaultValue: 'active' },
    },
  },
};

const MATERIAL_FIELDS = {
  module_id: { max: 64, nullable: true },
  title: { max: 256, required: true },
  material_type: { max: 32, required: true },
  content: { type: 'text' },
  audio_url: { max: 1024 },
  video_url: { max: 1024 },
  image_url: { max: 1024 },
  attachment_url: { max: 1024 },
  word_count: { type: 'int', nullable: true },
  duration: { type: 'int', nullable: true },
  source_id: { max: 64, nullable: true },
  source: { max: 256 },
  status: { max: 16, defaultValue: 'active' },
};

const QUESTION_FIELDS = {
  module_id: { max: 64, required: true },
  system_id: { max: 64, nullable: true },
  category_id: { max: 64, nullable: true },
  difficulty_id: { max: 64, nullable: true },
  title: { max: 256, required: true },
  question_type: { max: 64, nullable: true },
  content: { type: 'text' },
  material_id: { max: 64, nullable: true },
  answer: { type: 'text' },
  analysis: { type: 'text' },
  estimated_time: { type: 'int', nullable: true },
  score: { type: 'number', nullable: true },
  source_id: { max: 64, nullable: true },
  source_type: { max: 20, defaultValue: 'system' },
  source_label: { max: 128 },
  is_official: { type: 'bool', defaultValue: 0 },
  status: { max: 20, defaultValue: 'active' },
};

function getResourceConfig(resource) {
  const config = ADMIN_RESOURCES[resource];
  if (!config) throw createValidationError('不支持的题库资源', 404);
  return config;
}

function normalizeFieldValue(raw, rule, field) {
  if (rule.type === 'int') {
    if ((raw === undefined || raw === null || raw === '') && rule.nullable) return null;
    const value = Number(raw ?? rule.defaultValue ?? 0);
    if (!Number.isFinite(value)) throw createValidationError(`${field} 必须是数字`, 400);
    return Math.trunc(value);
  }
  if (rule.type === 'number') {
    if ((raw === undefined || raw === null || raw === '') && rule.nullable) return null;
    const value = Number(raw ?? rule.defaultValue ?? 0);
    if (!Number.isFinite(value)) throw createValidationError(`${field} 必须是数字`, 400);
    return value;
  }
  if (rule.type === 'bool') return raw === true || raw === 1 || raw === '1' ? 1 : 0;
  if (rule.type === 'text') return raw == null ? '' : String(raw);

  const normalized = String(raw ?? rule.defaultValue ?? '').trim().slice(0, rule.max || 255);
  if (!normalized && rule.required) throw createValidationError(`${field} 不能为空`);
  if (!normalized && rule.nullable) return null;
  return normalized;
}

function normalizePayload(payload, fields, { partial = false } = {}) {
  const entries = [];
  for (const [field, rule] of Object.entries(fields)) {
    if (partial && !Object.prototype.hasOwnProperty.call(payload || {}, field)) continue;
    entries.push([field, normalizeFieldValue(payload?.[field], rule, field)]);
  }
  if (!entries.length) throw createValidationError('没有可保存的字段');
  return entries;
}

function translateDuplicateError(err, message = '资源已存在') {
  if (err?.code === 'ER_DUP_ENTRY') throw createValidationError(message, 409);
  throw err;
}

async function runTransaction(work) {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (err) {
    try {
      await connection.rollback();
    } catch { /* intentional */ }
    throw err;
  } finally {
    connection.release();
  }
}

function entriesToObject(entries) {
  return Object.fromEntries(entries);
}

function mergeEntries(base, entries) {
  return { ...(base || {}), ...entriesToObject(entries) };
}

function withQuestionBankScopeEntries(resource, entries, data) {
  const filtered = entries.filter(([field]) => ![
    'system_scope',
    'parent_scope',
    'module_scope',
  ].includes(field));

  if (resource === 'categories') {
    return [
      ...filtered,
      ['system_scope', data.system_id || '__none__'],
      ['parent_scope', data.parent_id || '__root__'],
    ];
  }
  if (resource === 'difficulties') {
    return [
      ...filtered,
      ['module_scope', data.module_id || '__all__'],
      ['system_scope', data.system_id || '__all__'],
    ];
  }
  return filtered;
}

async function fetchById(table, id) {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

async function ensureExists(table, id, label) {
  if (!id) return null;
  const row = await fetchById(table, id);
  if (!row) throw createValidationError(`${label}不存在`, 400);
  return row;
}

function assertResourceAvailable(row, label) {
  if (!row) return;
  if (['disabled', 'deleted'].includes(String(row.status || '').toLowerCase())) {
    throw createValidationError(`${label}已停用`, 400);
  }
}

async function countRows(sql, params = []) {
  const row = await db.prepare(sql).get(...params);
  return Number(row?.count || 0);
}

async function assertQuestionBankResourceCanDisable(resource, id) {
  if (!id) return;
  const checks = {
    modules: [
      ['questions', 'SELECT COUNT(*) AS count FROM questions WHERE module_id = ? AND COALESCE(status, ?) <> ?', [id, 'active', 'deleted']],
      ['materials', 'SELECT COUNT(*) AS count FROM materials WHERE module_id = ? AND COALESCE(status, ?) <> ?', [id, 'active', 'deleted']],
    ],
    'learning-systems': [
      ['questions', 'SELECT COUNT(*) AS count FROM questions WHERE system_id = ? AND COALESCE(status, ?) <> ?', [id, 'active', 'deleted']],
      ['categories', 'SELECT COUNT(*) AS count FROM categories WHERE system_id = ? AND COALESCE(status, ?) <> ?', [id, 'active', 'deleted']],
      ['difficulties', 'SELECT COUNT(*) AS count FROM difficulties WHERE system_id = ? AND COALESCE(status, ?) <> ?', [id, 'active', 'deleted']],
    ],
    categories: [
      ['questions', 'SELECT COUNT(*) AS count FROM questions WHERE category_id = ? AND COALESCE(status, ?) <> ?', [id, 'active', 'deleted']],
      ['children', 'SELECT COUNT(*) AS count FROM categories WHERE parent_id = ? AND COALESCE(status, ?) <> ?', [id, 'active', 'deleted']],
    ],
    difficulties: [
      ['questions', 'SELECT COUNT(*) AS count FROM questions WHERE difficulty_id = ? AND COALESCE(status, ?) <> ?', [id, 'active', 'deleted']],
    ],
    tags: [
      ['questions', `
        SELECT COUNT(*) AS count
        FROM question_tags qt
        JOIN questions q ON q.id = qt.question_id
        WHERE qt.tag_id = ? AND COALESCE(q.status, ?) <> ?
      `, [id, 'active', 'deleted']],
    ],
    'knowledge-points': [
      ['questions', `
        SELECT COUNT(*) AS count
        FROM question_knowledge_points qkp
        JOIN questions q ON q.id = qkp.question_id
        WHERE qkp.knowledge_point_id = ? AND COALESCE(q.status, ?) <> ?
      `, [id, 'active', 'deleted']],
      ['children', 'SELECT COUNT(*) AS count FROM knowledge_points WHERE parent_id = ? AND COALESCE(status, ?) <> ?', [id, 'active', 'deleted']],
    ],
  }[resource] || [];

  for (const [, sql, params] of checks) {
    if (await countRows(sql, params)) throw createValidationError('该配置正在被题目或下级配置引用，不能停用', 409);
  }
}

async function assertMaterialCanDisable(id) {
  if (!id) return;
  const direct = await countRows(
    'SELECT COUNT(*) AS count FROM questions WHERE material_id = ? AND COALESCE(status, ?) <> ?',
    [id, 'active', 'deleted']
  );
  const related = await countRows(`
    SELECT COUNT(*) AS count
    FROM question_materials qm
    JOIN questions q ON q.id = qm.question_id
    WHERE qm.material_id = ? AND COALESCE(q.status, ?) <> ?
  `, [id, 'active', 'deleted']);
  if (direct || related) throw createValidationError('该材料正在被题目引用，不能停用', 409);
}

async function assertNoParentCycle(table, id, parentId, label) {
  if (!parentId) return;
  if (parentId === id) throw createValidationError(`${label}不能选择自己作为父级`, 400);

  let cursor = parentId;
  for (let depth = 0; depth < 50 && cursor; depth += 1) {
    if (cursor === id) throw createValidationError(`${label}父级不能形成循环`, 400);
    const row = await db.prepare(`SELECT parent_id FROM ${table} WHERE id = ?`).get(cursor);
    cursor = row?.parent_id || '';
  }
}

async function validateResourcePayload(resource, id, data) {
  if (resource === 'learning-systems') {
    await assertNoParentCycle('learning_systems', id, data.parent_id, '学习体系');
    await ensureExists('learning_systems', data.parent_id, '父级学习体系');
    return;
  }

  if (resource === 'categories') {
    await ensureExists('modules', data.module_id, '模块');
    await ensureExists('learning_systems', data.system_id, '学习体系');
    await assertNoParentCycle('categories', id, data.parent_id, '分类');
    const parent = await ensureExists('categories', data.parent_id, '父级分类');
    if (parent) {
      if (parent.module_id !== data.module_id) throw createValidationError('父级分类必须属于同一模块', 400);
      if ((parent.system_id || '') !== (data.system_id || '')) throw createValidationError('父级分类必须属于同一学习体系', 400);
    }
    return;
  }

  if (resource === 'difficulties') {
    await ensureExists('modules', data.module_id, '模块');
    await ensureExists('learning_systems', data.system_id, '学习体系');
    return;
  }

  if (resource === 'knowledge-points') {
    await ensureExists('modules', data.module_id, '模块');
    await assertNoParentCycle('knowledge_points', id, data.parent_id, '知识点');
    const parent = await ensureExists('knowledge_points', data.parent_id, '父级知识点');
    if (parent && (parent.module_id || '') !== (data.module_id || '')) {
      throw createValidationError('父级知识点必须属于同一模块', 400);
    }
  }
}

function buildSearchWhere(searchable, keyword, params) {
  const trimmed = String(keyword || '').trim();
  if (!trimmed) return '';
  const like = `%${trimmed}%`;
  searchable.forEach(() => params.push(like));
  return `WHERE (${searchable.map((field) => `${field} LIKE ?`).join(' OR ')})`;
}

export async function getAdminQuestionBankMetadata() {
  const [modules, systems, categories, difficulties, tags, knowledgePoints] = await Promise.all([
    listAdminQuestionBankResource('modules'),
    listAdminQuestionBankResource('learning-systems'),
    listAdminQuestionBankResource('categories'),
    listAdminQuestionBankResource('difficulties'),
    listAdminQuestionBankResource('tags'),
    listAdminQuestionBankResource('knowledge-points'),
  ]);
  return { modules, systems, categories, difficulties, tags, knowledge_points: knowledgePoints };
}

export async function listAdminQuestionBankResource(resource, { keyword = '' } = {}) {
  const config = getResourceConfig(resource);
  const params = [];
  const where = buildSearchWhere(config.searchable, keyword, params);
  return db.prepare(`
    SELECT *
    FROM ${config.table}
    ${where}
    ORDER BY ${config.orderBy}
    LIMIT 1000
  `).all(...params);
}

export async function saveAdminQuestionBankResource(resource, payload) {
  const config = getResourceConfig(resource);
  const now = Date.now();
  const id = String(payload?.id || `${resource.replace(/s$/, '')}-${nanoid(16)}`).trim().slice(0, 64);
  let entries = normalizePayload(payload, config.fields);
  const data = entriesToObject(entries);
  await validateResourcePayload(resource, id, data);
  entries = withQuestionBankScopeEntries(resource, entries, data);
  const columns = ['id', ...entries.map(([field]) => field), 'created_at', 'updated_at'];
  const values = [id, ...entries.map(([, value]) => value), now, now];

  try {
    await db.prepare(`
      INSERT INTO ${config.table} (${columns.join(', ')})
      VALUES (${columns.map(() => '?').join(', ')})
    `).run(...values);
  } catch (err) {
    translateDuplicateError(err, '同名或同 code 的资源已存在，请改用编辑');
  }

  return fetchById(config.table, id);
}

export async function updateAdminQuestionBankResource(resource, id, payload) {
  const config = getResourceConfig(resource);
  const current = await fetchById(config.table, id);
  if (!current) throw createValidationError('资源不存在', 404);
  let entries = normalizePayload(payload, config.fields, { partial: true });
  const data = mergeEntries(current, entries);
  await validateResourcePayload(resource, id, data);
  if (data.status === 'disabled' && current.status !== 'disabled') {
    await assertQuestionBankResourceCanDisable(resource, id);
  }
  entries = withQuestionBankScopeEntries(resource, entries, data);
  const fields = entries.map(([field]) => `${field} = ?`).concat('updated_at = ?');
  const params = [...entries.map(([, value]) => value), Date.now(), id];
  let result;
  try {
    result = await db.prepare(`
      UPDATE ${config.table}
      SET ${fields.join(', ')}
      WHERE id = ?
    `).run(...params);
  } catch (err) {
    translateDuplicateError(err, '同名或同 code 的资源已存在');
  }
  if (!result.changes) throw createValidationError('资源不存在', 404);
  return fetchById(config.table, id);
}

async function validateMaterialPayload(data) {
  await ensureExists('modules', data.module_id, '模块');
  await ensureExists('sources', data.source_id, '来源');
}

export async function listAdminMaterials({ keyword = '', moduleId = '' } = {}) {
  const where = [];
  const params = [];
  if (moduleId) {
    where.push('m.module_id = ?');
    params.push(moduleId);
  }
  if (keyword) {
    where.push('(m.title LIKE ? OR m.content LIKE ? OR m.source LIKE ?)');
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  return db.prepare(`
    SELECT m.*, mo.name AS module_name
    FROM materials m
    LEFT JOIN modules mo ON mo.id = m.module_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY m.updated_at DESC
    LIMIT 500
  `).all(...params);
}

export async function saveAdminMaterial(payload, adminId) {
  const now = Date.now();
  const id = String(payload?.id || `material-${nanoid(16)}`).trim().slice(0, 64);
  const entries = normalizePayload(payload, MATERIAL_FIELDS);
  await validateMaterialPayload(entriesToObject(entries));
  const columns = ['id', ...entries.map(([field]) => field), 'created_by', 'updated_by', 'created_at', 'updated_at'];
  const values = [id, ...entries.map(([, value]) => value), adminId, adminId, now, now];

  try {
    await db.prepare(`
      INSERT INTO materials (${columns.join(', ')})
      VALUES (${columns.map(() => '?').join(', ')})
    `).run(...values);
  } catch (err) {
    translateDuplicateError(err, '材料已存在，请改用编辑');
  }
  return fetchById('materials', id);
}

export async function updateAdminMaterial(id, payload, adminId) {
  const current = await fetchById('materials', id);
  if (!current) throw createValidationError('材料不存在', 404);
  const entries = normalizePayload(payload, MATERIAL_FIELDS, { partial: true });
  const data = mergeEntries(current, entries);
  await validateMaterialPayload(data);
  if (data.status === 'disabled' && current.status !== 'disabled') await assertMaterialCanDisable(id);
  const fields = entries.map(([field]) => `${field} = ?`).concat('updated_by = ?', 'updated_at = ?');
  const params = [...entries.map(([, value]) => value), adminId, Date.now(), id];
  const result = await db.prepare(`
    UPDATE materials
    SET ${fields.join(', ')}
    WHERE id = ?
  `).run(...params);
  if (!result.changes) throw createValidationError('材料不存在', 404);
  return fetchById('materials', id);
}

export async function listAdminQuestionBankQuestions({ keyword = '', moduleId = '', systemId = '', status = '' } = {}) {
  const where = ['q.source_type = ?', 'q.module_id IS NOT NULL'];
  const params = ['system'];
  if (moduleId) {
    where.push('q.module_id = ?');
    params.push(moduleId);
  }
  if (systemId) {
    where.push('q.system_id = ?');
    params.push(systemId);
  }
  if (status) {
    where.push('q.status = ?');
    params.push(status);
  } else {
    where.push("COALESCE(q.status, 'active') <> 'deleted'");
  }
  if (keyword) {
    where.push('(q.title LIKE ? OR q.content LIKE ? OR q.prompt_text LIKE ? OR q.source_label LIKE ?)');
    const like = `%${keyword}%`;
    params.push(like, like, like, like);
  }
  return db.prepare(`
    SELECT
      q.*,
      mo.name AS module_name,
      ls.name AS system_name,
      c.name AS category_name,
      d.name AS difficulty_name,
      m.title AS material_title,
      (
        SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ')
        FROM question_tags qt
        JOIN tags t ON t.id = qt.tag_id
        WHERE qt.question_id = q.id
      ) AS tag_names,
      (
        SELECT GROUP_CONCAT(kp.name ORDER BY kp.name SEPARATOR ', ')
        FROM question_knowledge_points qkp
        JOIN knowledge_points kp ON kp.id = qkp.knowledge_point_id
        WHERE qkp.question_id = q.id
      ) AS knowledge_point_names
    FROM questions q
    LEFT JOIN modules mo ON mo.id = q.module_id
    LEFT JOIN learning_systems ls ON ls.id = q.system_id
    LEFT JOIN categories c ON c.id = q.category_id
    LEFT JOIN difficulties d ON d.id = q.difficulty_id
    LEFT JOIN materials m ON m.id = q.material_id
    WHERE ${where.join(' AND ')}
    ORDER BY COALESCE(q.updated_at, q.created_at) DESC
    LIMIT 500
  `).all(...params);
}

async function validateQuestionPayload(data) {
  const module = await ensureExists('modules', data.module_id, '模块');
  const system = await ensureExists('learning_systems', data.system_id, '学习体系');
  const category = await ensureExists('categories', data.category_id, '分类');
  const difficulty = await ensureExists('difficulties', data.difficulty_id, '难度');
  const material = await ensureExists('materials', data.material_id, '材料');
  await ensureExists('sources', data.source_id, '来源');
  assertQuestionContent(data);
  assertResourceAvailable(module, '模块');
  assertResourceAvailable(system, '学习体系');
  assertResourceAvailable(category, '分类');
  assertResourceAvailable(difficulty, '难度');
  assertResourceAvailable(material, '材料');

  if (category) {
    if (module && category.module_id !== module.id) throw createValidationError('分类必须属于所选模块', 400);
    if (category.system_id && (!system || category.system_id !== system.id)) throw createValidationError('分类必须属于所选学习体系', 400);
  }
  if (difficulty) {
    if (module && difficulty.module_id && difficulty.module_id !== module.id) throw createValidationError('难度必须属于所选模块', 400);
    if (difficulty.system_id && (!system || difficulty.system_id !== system.id)) throw createValidationError('难度必须属于所选学习体系', 400);
  }
  if (material && module && material.module_id && material.module_id !== module.id) {
    throw createValidationError('材料必须属于所选模块', 400);
  }
  return { module };
}

function assertQuestionContent(data) {
  if (!String(data?.content || '').trim()) throw createValidationError('题干不能为空', 400);
}

const MODULE_DETAIL_MAP = [
  { code: 'writing',     table: 'writing_questions' },
  { code: 'reading',     table: 'reading_questions' },
  { code: 'listening',   table: 'listening_questions' },
  { code: 'translation', table: 'translation_questions' },
  { code: 'speaking',    table: 'speaking_questions' },
  { code: 'grammar',     table: 'grammar_questions' },
  { code: 'vocabulary',  table: 'vocabulary_questions' },
  { code: 'phonetics',   table: 'phonetics_questions' },
];

const QUESTION_DETAIL_TABLES = MODULE_DETAIL_MAP.map((m) => m.table);
const MODULE_CODE_TO_TABLE = Object.fromEntries(MODULE_DETAIL_MAP.map((m) => [m.code, m.table]));

function toJsonParam(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    try { JSON.parse(value); return value; } catch { return JSON.stringify(value); }
  }
  return JSON.stringify(value);
}

function nullableInt(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeIdList(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(',');
  return [...new Set(raw.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 100);
}

function normalizeLookupKey(value) {
  return String(value || '').trim().toLowerCase();
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function makeLookup(rows, keys = ['id', 'code', 'name']) {
  const map = new Map();
  for (const row of rows) {
    for (const key of keys) {
      const value = normalizeLookupKey(row[key]);
      if (value && !map.has(value)) map.set(value, row);
    }
  }
  return map;
}

function resolveLookup(lookup, value) {
  if (!value) return null;
  return lookup.get(normalizeLookupKey(value)) || null;
}

async function assertAllExist(table, ids, label) {
  if (!ids.length) return;
  const rows = await db.prepare(`
    SELECT id
    FROM ${table}
    WHERE id IN (${ids.map(() => '?').join(', ')})
  `).all(...ids);
  if (rows.length !== ids.length) throw createValidationError(`${label}不存在`, 400);
}

async function assertQuestionRelationScopes(data, payload) {
  const materialIds = normalizeIdList(payload?.material_ids);
  if (materialIds.length && data.module_id) {
    const rows = await db.prepare(`
      SELECT id, module_id, status
      FROM materials
      WHERE id IN (${materialIds.map(() => '?').join(', ')})
    `).all(...materialIds);
    if (rows.some((row) => ['disabled', 'deleted'].includes(String(row.status || '').toLowerCase()))) {
      throw createValidationError('附加材料已停用', 400);
    }
    if (rows.some((row) => row.module_id && row.module_id !== data.module_id)) {
      throw createValidationError('附加材料必须属于所选模块', 400);
    }
  }
  const knowledgePointIds = normalizeIdList(payload?.knowledge_point_ids);
  if (knowledgePointIds.length && data.module_id) {
    const rows = await db.prepare(`
      SELECT id, module_id, status
      FROM knowledge_points
      WHERE id IN (${knowledgePointIds.map(() => '?').join(', ')})
    `).all(...knowledgePointIds);
    if (rows.some((row) => ['disabled', 'deleted'].includes(String(row.status || '').toLowerCase()))) {
      throw createValidationError('知识点已停用', 400);
    }
    if (rows.some((row) => row.module_id && row.module_id !== data.module_id)) {
      throw createValidationError('知识点必须属于所选模块', 400);
    }
  }
}

function normalizeQuestionMaterialIds(data, payload) {
  return normalizeIdList([data?.material_id, ...normalizeIdList(payload?.material_ids)]);
}

async function syncQuestionRelations(connection, questionId, payload, data) {
  const now = Date.now();
  const has = (key) => Object.prototype.hasOwnProperty.call(payload || {}, key);

  if (has('material_id') || has('material_ids')) {
    const materialIds = normalizeQuestionMaterialIds(data, payload);
    await connection.query('DELETE FROM question_materials WHERE question_id = ?', [questionId]);
    for (let index = 0; index < materialIds.length; index += 1) {
      await connection.query(
        'INSERT INTO question_materials (question_id, material_id, role, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
        [questionId, materialIds[index], index === 0 ? 'primary' : 'supporting', index, now]
      );
    }
  }

  if (has('tag_ids')) {
    const tagIds = normalizeIdList(payload.tag_ids);
    await connection.query('DELETE FROM question_tags WHERE question_id = ?', [questionId]);
    for (const tagId of tagIds) {
      await connection.query('INSERT INTO question_tags (question_id, tag_id, created_at) VALUES (?, ?, ?)', [questionId, tagId, now]);
    }
  }

  if (has('knowledge_point_ids')) {
    const knowledgePointIds = normalizeIdList(payload.knowledge_point_ids);
    await connection.query('DELETE FROM question_knowledge_points WHERE question_id = ?', [questionId]);
    for (const knowledgePointId of knowledgePointIds) {
      await connection.query(
        'INSERT INTO question_knowledge_points (question_id, knowledge_point_id, created_at) VALUES (?, ?, ?)',
        [questionId, knowledgePointId, now]
      );
    }
  }
}

async function upsertQuestionModuleDetails(connection, questionId, data, ext = {}) {
  const [moduleRows] = await connection.query('SELECT code FROM modules WHERE id = ? LIMIT 1', [data.module_id]);
  const code = moduleRows?.[0]?.code || '';
  const now = Date.now();

  // Validate the code is known before deleting anything
  if (code && !MODULE_CODE_TO_TABLE[code]) {
    throw createValidationError(`未知的模块类型: ${code}，请先在模块配置中补充对应的题型表`, 400);
  }

  for (const tableName of QUESTION_DETAIL_TABLES) {
    await connection.query(`DELETE FROM ${tableName} WHERE question_id = ?`, [questionId]);
  }

  if (code === 'writing') {
    await connection.query(`
      INSERT INTO writing_questions (question_id, prompt, requirements, sample_answer, scoring_rubric, min_words, max_words, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      questionId, data.content || '',
      toJsonParam(ext.requirements),
      ext.sample_answer || '',
      toJsonParam(ext.scoring_rubric),
      nullableInt(ext.min_words),
      nullableInt(ext.max_words),
      now,
    ]);
    return;
  }

  if (code === 'reading') {
    await connection.query(`
      INSERT INTO reading_questions (question_id, stem, options, correct_answer, explanation, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [questionId, data.content || '', toJsonParam(ext.options), data.answer || '', data.analysis || '', now]);
    return;
  }

  if (code === 'listening') {
    await connection.query(`
      INSERT INTO listening_questions (question_id, stem, options, transcript, timeline, correct_answer, explanation, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      questionId, data.content || '',
      toJsonParam(ext.options),
      ext.transcript || '',
      toJsonParam(ext.timeline),
      data.answer || '', data.analysis || '', now,
    ]);
    return;
  }

  if (code === 'translation') {
    await connection.query(`
      INSERT INTO translation_questions (question_id, source_language, target_language, source_text, reference_answer, scoring_rubric, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      questionId,
      ext.source_language || 'en',
      ext.target_language || 'zh',
      data.content || '', data.answer || '',
      toJsonParam(ext.scoring_rubric),
      now,
    ]);
    return;
  }

  if (code === 'speaking') {
    await connection.query(`
      INSERT INTO speaking_questions (question_id, prompt, sample_answer, scoring_rubric, prep_time, response_time, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      questionId, data.content || '', data.answer || '',
      toJsonParam(ext.scoring_rubric),
      nullableInt(ext.prep_time),
      nullableInt(ext.response_time),
      now,
    ]);
    return;
  }

  if (code === 'grammar') {
    await connection.query(`
      INSERT INTO grammar_questions (question_id, stem, options, correct_answer, explanation, grammar_focus, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [questionId, data.content || '', toJsonParam(ext.options), data.answer || '', data.analysis || '', ext.grammar_focus || '', now]);
    return;
  }

  if (code === 'vocabulary') {
    await connection.query(`
      INSERT INTO vocabulary_questions (question_id, stem, options, target_word, correct_answer, explanation, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [questionId, data.content || '', toJsonParam(ext.options), ext.target_word || '', data.answer || '', data.analysis || '', now]);
    return;
  }

  if (code === 'phonetics') {
    await connection.query(`
      INSERT INTO phonetics_questions (question_id, phoneme, sample_text, audio_url, scoring_rules, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [questionId, ext.phoneme || '', data.content || '', ext.audio_url || '', toJsonParam(ext.scoring_rules), now]);
  }
}

export async function fetchAdminQuestionBankQuestionDetail(id) {
  const question = await db.prepare(`
    SELECT q.*, mo.code AS module_code, mo.name AS module_name,
      ls.name AS system_name, c.name AS category_name, d.name AS difficulty_name
    FROM questions q
    LEFT JOIN modules mo ON mo.id = q.module_id
    LEFT JOIN learning_systems ls ON ls.id = q.system_id
    LEFT JOIN categories c ON c.id = q.category_id
    LEFT JOIN difficulties d ON d.id = q.difficulty_id
    WHERE q.id = ? AND q.source_type = 'system' AND q.module_id IS NOT NULL AND COALESCE(q.status, 'active') <> 'deleted'
  `).get(id);
  if (!question) return null;

  const table = MODULE_CODE_TO_TABLE[question.module_code];
  if (table) {
    const ext = await db.prepare(`SELECT * FROM ${table} WHERE question_id = ?`).get(id);
    if (ext) {
      const jsonFields = ['requirements', 'scoring_rubric', 'options', 'timeline', 'scoring_rules'];
      for (const field of jsonFields) {
        if (typeof ext[field] === 'string') {
          try { ext[field] = JSON.parse(ext[field]); } catch { ext[field] = null; }
        }
      }
      question.ext = ext;
    }
  }
  const [tagIds, materialIds, knowledgePointIds] = await Promise.all([
    db.prepare('SELECT tag_id FROM question_tags WHERE question_id = ? ORDER BY created_at ASC').all(id),
    db.prepare('SELECT material_id FROM question_materials WHERE question_id = ? ORDER BY sort_order ASC, created_at ASC').all(id),
    db.prepare('SELECT knowledge_point_id FROM question_knowledge_points WHERE question_id = ? ORDER BY created_at ASC').all(id),
  ]);
  question.tag_ids = tagIds.map((item) => item.tag_id);
  question.material_ids = materialIds.map((item) => item.material_id);
  question.knowledge_point_ids = knowledgePointIds.map((item) => item.knowledge_point_id);
  return question;
}

function forceSystemQuestionEntries(entries) {
  return entries.map(([field, value]) => [field, field === 'source_type' ? 'system' : value]);
}

function isDisabledStatus(status) {
  return ['disabled', 'deleted'].includes(String(status || '').trim().toLowerCase()) ? 1 : 0;
}

function buildLegacyQuestionEntries(data, moduleCode) {
  if (moduleCode !== 'writing') {
    return [
      ['type', ''],
      ['themes', '[]'],
      ['theme', ''],
      ['composition_size', ''],
      ['default_score', null],
      ['prompt_text', ''],
      ['normalized_title', ''],
      ['prompt_fingerprint', ''],
      ['classification_mode', ''],
      ['type_confidence', ''],
      ['theme_confidence', ''],
      ['needs_review', 0],
    ];
  }

  const prepared = buildQuestionInsertMeta({
    title: data.title,
    promptText: data.content,
    type: data.question_type,
    themes: [],
    theme: '',
    defaultScore: data.score,
    sourceLabel: data.source_label,
  });
  return [
    ['type', prepared.type],
    ['themes', JSON.stringify(prepared.themes)],
    ['theme', prepared.theme],
    ['composition_size', prepared.compositionSize],
    ['default_score', prepared.defaultScore],
    ['prompt_text', prepared.promptText],
    ['normalized_title', prepared.normalizedTitle],
    ['prompt_fingerprint', prepared.promptFingerprint],
    ['classification_mode', prepared.classificationMode],
    ['type_confidence', prepared.typeConfidence],
    ['theme_confidence', prepared.themeConfidence],
    ['needs_review', prepared.needsReview],
  ];
}

function shouldUpsertModuleDetails(payload, moduleChanged) {
  if (moduleChanged) return true;
  return ['ext', 'content', 'answer', 'analysis'].some((key) => Object.prototype.hasOwnProperty.call(payload || {}, key));
}

export async function saveAdminQuestionBankQuestion(payload, adminId) {
  const now = Date.now();
  const id = String(payload?.id || `question-${nanoid(16)}`).trim().slice(0, 64);
  let entries = forceSystemQuestionEntries(normalizePayload(payload, QUESTION_FIELDS));
  const data = entriesToObject(entries);
  const { module } = await validateQuestionPayload(data);
  entries = [...entries, ...buildLegacyQuestionEntries(data, module?.code)];
  await assertAllExist('tags', normalizeIdList(payload?.tag_ids), '标签');
  await assertAllExist('materials', normalizeIdList(payload?.material_ids), '材料');
  await assertAllExist('knowledge_points', normalizeIdList(payload?.knowledge_point_ids), '知识点');
  await assertQuestionRelationScopes(data, payload);
  const columns = ['id', 'user_id', ...entries.map(([field]) => field), 'is_disabled', 'created_by', 'updated_by', 'created_at', 'updated_at'];
  const values = [id, null, ...entries.map(([, value]) => value), isDisabledStatus(data.status), adminId, adminId, now, now];

  try {
    await runTransaction(async (connection) => {
      await connection.query(`
        INSERT INTO questions (${columns.join(', ')})
        VALUES (${columns.map(() => '?').join(', ')})
      `, values);
      await upsertQuestionModuleDetails(connection, id, data, payload?.ext || {});
      await syncQuestionRelations(connection, id, payload, data);
    });
  } catch (err) {
    translateDuplicateError(err, '题目已存在，请改用编辑');
  }
  return fetchById('questions', id);
}

async function buildImportLookups() {
  const [modules, systems, categories, difficulties, tags, knowledgePoints] = await Promise.all([
    listAdminQuestionBankResource('modules'),
    listAdminQuestionBankResource('learning-systems'),
    listAdminQuestionBankResource('categories'),
    listAdminQuestionBankResource('difficulties'),
    listAdminQuestionBankResource('tags'),
    listAdminQuestionBankResource('knowledge-points'),
  ]);
  return {
    moduleLookup: makeLookup(modules),
    systemLookup: makeLookup(systems),
    tagLookup: makeLookup(tags, ['id', 'name']),
    modules,
    systems,
    categories,
    difficulties,
    tags,
    knowledgePoints,
  };
}

function resolveMany(lookup, values) {
  const raw = Array.isArray(values) ? values : String(values || '').split(',');
  return normalizeIdList(raw.map((value) => resolveLookup(lookup, value)?.id || value));
}

function matchesLookupValue(row, value, keys = ['id', 'code', 'name']) {
  const normalized = normalizeLookupKey(value);
  return Boolean(normalized) && keys.some((key) => normalizeLookupKey(row?.[key]) === normalized);
}

function resolveScopedRow(rows, value, predicate, keys = ['id', 'code', 'name']) {
  if (!value) return null;
  return (rows || []).find((row) => matchesLookupValue(row, value, keys) && predicate(row)) || null;
}

function resolveManyScoped(rows, values, predicate, keys = ['id', 'name']) {
  const raw = Array.isArray(values) ? values : String(values || '').split(',');
  return normalizeIdList(raw.map((value) => resolveScopedRow(rows, value, predicate, keys)?.id || value));
}

function summarizeBatchQuestionItem(item = {}) {
  return {
    module: firstPresent(item.module_id, item.moduleId, item.module_code, item.module, item.module_name) || '',
    category: firstPresent(item.category_id, item.categoryId, item.category_code, item.category, item.category_name) || '',
    difficulty: firstPresent(item.difficulty_id, item.difficultyId, item.difficulty, item.difficulty_name, item.level) || '',
    tags: normalizeIdList(item.tag_ids || item.tags),
  };
}

function normalizeBatchQuestionItem(item, lookups) {
  const moduleValue = firstPresent(item.module_id, item.moduleId, item.module_code, item.module, item.module_name);
  const module = resolveLookup(lookups.moduleLookup, moduleValue);
  if (!module) throw createValidationError(`无法匹配模块：${moduleValue || '空'}`, 400);

  const system = resolveLookup(lookups.systemLookup, firstPresent(item.system_id, item.systemId, item.system_code, item.system, item.system_name));
  const category = resolveScopedRow(
    lookups.categories,
    firstPresent(item.category_id, item.categoryId, item.category_code, item.category, item.category_name),
    (row) => row.module_id === module.id && (!row.system_id || row.system_id === system?.id)
  );
  const difficulty = resolveScopedRow(
    lookups.difficulties,
    firstPresent(item.difficulty_id, item.difficultyId, item.difficulty, item.difficulty_name, item.level),
    (row) => (!row.module_id || row.module_id === module.id) && (!row.system_id || row.system_id === system?.id),
    ['id', 'name', 'level']
  );
  const content = firstPresent(item.content, item.prompt, item.stem, item.question, item.prompt_text, item.promptText);
  if (!content) throw createValidationError('题干不能为空', 400);

  const ext = { ...(item.ext || {}) };
  if (Array.isArray(item.options) && !ext.options) ext.options = item.options;
  if (item.sample_answer && !ext.sample_answer) ext.sample_answer = item.sample_answer;
  if (item.transcript && !ext.transcript) ext.transcript = item.transcript;

  return {
    id: item.id,
    title: String(firstPresent(item.title, item.name, content)).slice(0, 120),
    module_id: module.id,
    system_id: system?.id || '',
    category_id: category?.id || '',
    difficulty_id: difficulty?.id || '',
    question_type: firstPresent(item.question_type, item.questionType, item.type) || '',
    content,
    answer: firstPresent(item.answer, item.correct_answer, item.reference_answer) || '',
    analysis: firstPresent(item.analysis, item.explanation) || '',
    estimated_time: item.estimated_time ?? item.estimatedTime ?? null,
    score: item.score ?? item.default_score ?? null,
    source_label: firstPresent(item.source_label, item.sourceLabel, item.source) || '',
    is_official: item.is_official === true || item.isOfficial === true,
    status: item.status || 'active',
    tag_ids: resolveMany(lookups.tagLookup, item.tag_ids || item.tags),
    material_ids: normalizeIdList(item.material_ids || item.materials),
    knowledge_point_ids: resolveManyScoped(
      lookups.knowledgePoints,
      item.knowledge_point_ids || item.knowledge_points,
      (row) => !row.module_id || row.module_id === module.id
    ),
    ext,
  };
}

export async function importAdminQuestionBankQuestions(payload, adminId) {
  const items = normalizeImportItems(payload);
  const lookups = await buildImportLookups();
  const results = [];
  let created = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    try {
      const question = await saveAdminQuestionBankQuestion(normalizeBatchQuestionItem(item, lookups), adminId);
      created += 1;
      results.push({ index, ok: true, id: question.id, title: question.title });
    } catch (err) {
      results.push({
        index,
        ok: false,
        title: item.title || item.name || '',
        message: err?.message || '导入失败',
        context: summarizeBatchQuestionItem(item),
      });
    }
  }

  return { created, failed: results.length - created, results };
}

export async function validateAdminQuestionBankQuestions(payload) {
  const items = normalizeImportItems(payload);
  const lookups = await buildImportLookups();
  const results = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    try {
      const normalized = normalizeBatchQuestionItem(item, lookups);
      const { module } = await validateQuestionPayload(normalized);
      await assertAllExist('tags', normalizeIdList(normalized.tag_ids), '标签');
      await assertAllExist('materials', normalizeIdList(normalized.material_ids), '材料');
      await assertAllExist('knowledge_points', normalizeIdList(normalized.knowledge_point_ids), '知识点');
      await assertQuestionRelationScopes(normalized, normalized);
      results.push({ index, ok: true, title: normalized.title, module: module?.code || '' });
    } catch (err) {
      results.push({
        index,
        ok: false,
        title: item.title || item.name || '',
        message: err?.message || '校验失败',
        context: summarizeBatchQuestionItem(item),
      });
    }
  }

  return {
    valid: results.filter((item) => item.ok).length,
    invalid: results.filter((item) => !item.ok).length,
    results,
  };
}

export async function updateAdminQuestionBankQuestion(id, payload, adminId) {
  const current = await db.prepare(`
    SELECT *
    FROM questions
    WHERE id = ? AND source_type = 'system' AND module_id IS NOT NULL AND COALESCE(status, 'active') <> 'deleted'
  `).get(id);
  if (!current) throw createValidationError('系统题不存在', 404);
  let entries = forceSystemQuestionEntries(normalizePayload(payload, QUESTION_FIELDS, { partial: true }));
  const data = mergeEntries(current, entries);
  const moduleChanged = Object.prototype.hasOwnProperty.call(payload || {}, 'module_id')
    && data.module_id !== current.module_id;
  const { module } = await validateQuestionPayload(data);
  entries = [...entries, ...buildLegacyQuestionEntries(data, module?.code)];
  await assertAllExist('tags', normalizeIdList(payload?.tag_ids), '标签');
  await assertAllExist('materials', normalizeIdList(payload?.material_ids), '材料');
  await assertAllExist('knowledge_points', normalizeIdList(payload?.knowledge_point_ids), '知识点');
  await assertQuestionRelationScopes(data, payload);
  const fields = entries.map(([field]) => `${field} = ?`);
  const params = entries.map(([, value]) => value);
  if (Object.prototype.hasOwnProperty.call(payload || {}, 'status')) {
    fields.push('is_disabled = ?');
    params.push(isDisabledStatus(data.status));
  }
  fields.push('updated_by = ?', 'updated_at = ?');
  params.push(adminId, Date.now(), id);
  let changes = 0;
  try {
    await runTransaction(async (connection) => {
      const [result] = await connection.query(`
        UPDATE questions
        SET ${fields.join(', ')}
        WHERE id = ? AND source_type = 'system' AND module_id IS NOT NULL AND COALESCE(status, 'active') <> 'deleted'
      `, params);
      changes = result.affectedRows ?? 0;
      if (!changes) throw createValidationError('系统题不存在', 404);
      if (shouldUpsertModuleDetails(payload, moduleChanged)) {
        await upsertQuestionModuleDetails(connection, id, data, payload.ext || {});
      }
      await syncQuestionRelations(connection, id, payload, data);
    });
  } catch (err) {
    translateDuplicateError(err, '题目已存在');
  }
  return fetchById('questions', id);
}

function normalizeImportItems(payload) {
  const raw = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.questions)
      ? payload.questions
      : Array.isArray(payload)
        ? payload
        : [];
  if (!raw.length) throw createValidationError('请提供题目 JSON 数组');
  if (raw.length > 100) throw createValidationError('一次最多导入 100 道题');
  return raw;
}

function normalizeAINormalizePayload(payload = {}) {
  const text = String(payload.text || '').trim();
  if (!text) throw createValidationError('请先粘贴需要 AI 解析的题目内容');
  if (text.length > 50000) throw createValidationError('一次 AI 解析内容不能超过 50000 字');
  return {
    text,
    format: String(payload.format || 'text').trim().slice(0, 32),
    defaults: payload.defaults && typeof payload.defaults === 'object' ? payload.defaults : {},
  };
}

function summarizeCatalog(rows, fields) {
  return (rows || []).slice(0, 200).map((row) => {
    const item = {};
    for (const field of fields) {
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') item[field] = row[field];
    }
    return item;
  });
}

function buildAINormalizePrompt({ text, format, defaults }, lookups) {
  const catalog = {
    modules: summarizeCatalog(lookups.modules, ['id', 'code', 'name']),
    systems: summarizeCatalog(lookups.systems, ['id', 'code', 'name', 'parent_id']),
    categories: summarizeCatalog(lookups.categories, ['id', 'code', 'name', 'module_id', 'system_id']),
    difficulties: summarizeCatalog(lookups.difficulties, ['id', 'name', 'level', 'module_id', 'system_id']),
    tags: summarizeCatalog(lookups.tags, ['id', 'name', 'type']),
    knowledge_points: summarizeCatalog(lookups.knowledgePoints, ['id', 'name', 'module_id']),
  };

  return `你是英语学习题库录入助手。请把管理员粘贴的原始题目解析成可导入题库的 JSON。

只返回 JSON，不要解释。JSON 结构必须是：
{"items":[...]}

每个 item 字段尽量使用：
title, module_id, system_id, category_id, difficulty_id, question_type, content, answer, analysis, score, estimated_time, source_label, tag_ids, knowledge_point_ids, ext

规则：
1. 不确定的字段留空，不要编造。
2. module/system/category/difficulty/tag/knowledge_point 优先使用下面 catalog 中的 id。
3. 选择题选项放入 ext.options 数组，答案放 answer。
4. 写作题题干放 content；写作要求可放 ext.requirements。
5. 最多返回 100 道题。
6. 不要入库，只输出候选结果供人工预览确认。

默认值：
${JSON.stringify(defaults || {}, null, 2)}

可用 catalog：
${JSON.stringify(catalog, null, 2)}

输入格式：${format || 'text'}

原始内容：
${text}`;
}

function normalizeAIItemsPayload(parsed) {
  const items = Array.isArray(parsed?.items)
    ? parsed.items
    : Array.isArray(parsed?.questions)
      ? parsed.questions
      : Array.isArray(parsed)
        ? parsed
        : [];
  if (!items.length) throw createValidationError('AI 未解析出题目，请调整输入后重试');
  return items.slice(0, 100).map((item) => (item && typeof item === 'object' ? item : {}));
}

export async function aiNormalizeAdminQuestionBankQuestions(payload, _adminId, dependencies = {}) {
  const normalized = normalizeAINormalizePayload(payload);
  const lookups = await buildImportLookups();
  const runAI = dependencies.callAI || callVolcengineAI;
  const parsePayload = dependencies.parsePayload || parseAIJsonPayload;
  const raw = await runAI(
    undefined,
    [
      { role: 'system', content: '你只负责把题目内容标准化为严格 JSON，不能直接入库。' },
      { role: 'user', content: buildAINormalizePrompt(normalized, lookups) },
    ],
    4096,
    0.1,
    { _nonStream: true, response_format: { type: 'json_object' } }
  );
  const items = normalizeAIItemsPayload(parsePayload(raw || ''));
  return { items };
}

function prepareSystemQuestion(item) {
  const prepared = buildQuestionInsertMeta(item || {});
  if (!prepared.promptText) throw createValidationError('题干不能为空');
  assertMaxLength(prepared.title, 200, '标题不能超过200字');
  return prepared;
}

function resolveQuestionId(item) {
  const raw = String(item?.id || '').trim();
  if (raw && raw.length <= 64) return raw;
  return `system-${nanoid(16)}`;
}

export async function listAdminSystemQuestions({ status = '', keyword = '' } = {}) {
  const where = ['source_type = ?', 'module_id IS NULL'];
  const params = ['system'];
  if (status === 'active') where.push('COALESCE(is_disabled, 0) = 0');
  if (status === 'disabled') where.push('COALESCE(is_disabled, 0) = 1');
  if (status !== 'deleted') where.push("COALESCE(status, 'active') <> 'deleted'");
  if (keyword) {
    where.push('(title LIKE ? OR prompt_text LIKE ? OR source_label LIKE ? OR source_year LIKE ?)');
    const like = `%${keyword}%`;
    params.push(like, like, like, like);
  }
  const rows = await db.prepare(`
    SELECT *
    FROM questions
    WHERE ${where.join(' AND ')}
    ORDER BY COALESCE(is_disabled, 0) ASC, created_at DESC
    LIMIT 500
  `).all(...params);
  return rows.map(toClientQuestion);
}

export async function importAdminSystemQuestions(payload) {
  const items = normalizeImportItems(payload);
  const now = Date.now();

  const rows = items.map((item, index) => {
    const prepared = prepareSystemQuestion(item);
    const id = resolveQuestionId(item);
    return {
      id,
      params: [
        id,
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
        prepared.sourceYear,
        prepared.sourceRegion,
        prepared.sourcePaper,
        prepared.sourceLabel || '系统题库',
      ],
    };
  });

  const placeholders = rows.map(() => '(?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, \'system\', ?, ?, ?, ?)').join(', ');
  const flatParams = rows.flatMap((r) => r.params);

  await db.prepare(`
    INSERT INTO questions (
      id, user_id, title, type, themes, theme, composition_size, default_score,
      prompt_text, normalized_title, prompt_fingerprint, classification_mode,
      type_confidence, theme_confidence, needs_review, is_disabled, created_at,
      source_type, source_year, source_region, source_paper, source_label
    ) VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
      user_id = NULL,
      title = VALUES(title),
      type = VALUES(type),
      themes = VALUES(themes),
      theme = VALUES(theme),
      composition_size = VALUES(composition_size),
      default_score = VALUES(default_score),
      prompt_text = VALUES(prompt_text),
      normalized_title = VALUES(normalized_title),
      prompt_fingerprint = VALUES(prompt_fingerprint),
      classification_mode = VALUES(classification_mode),
      type_confidence = VALUES(type_confidence),
      theme_confidence = VALUES(theme_confidence),
      needs_review = VALUES(needs_review),
      is_disabled = 0,
      source_type = 'system',
      source_year = VALUES(source_year),
      source_region = VALUES(source_region),
      source_paper = VALUES(source_paper),
      source_label = VALUES(source_label)
  `).run(...flatParams);

  const ids = rows.map((r) => r.id);
  const fetched = await db.prepare(
    `SELECT * FROM questions WHERE id IN (${ids.map(() => '?').join(', ')})`
  ).all(...ids);

  const byId = new Map(fetched.map((r) => [r.id, r]));
  return ids.map((id) => toClientQuestion(byId.get(id))).filter(Boolean);
}

export async function updateAdminSystemQuestionDisabled({ id, disabled }) {
  const result = await db.prepare(`
    UPDATE questions
    SET is_disabled = ?, status = ?
    WHERE id = ? AND source_type = 'system' AND module_id IS NULL
  `).run(disabled ? 1 : 0, disabled ? 'disabled' : 'active', id);
  if (!result.changes) throw createValidationError('系统题不存在', 404);
  const row = await db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  return toClientQuestion(row);
}

export async function deleteAdminQuestionBankQuestion(id) {
  await assertQuestionCanBeDeleted(id);
  const result = await db.prepare(`
    UPDATE questions
    SET status = 'deleted', is_disabled = 1, updated_at = ?
    WHERE id = ? AND source_type = 'system' AND module_id IS NOT NULL AND COALESCE(status, 'active') <> 'deleted'
  `).run(Date.now(), id);
  if (!result.changes) throw createValidationError('系统题不存在', 404);
  return true;
}

export async function deleteAdminSystemQuestion(id) {
  await assertQuestionCanBeDeleted(id);
  const result = await db.prepare(`
    UPDATE questions
    SET status = 'deleted', is_disabled = 1, updated_at = ?
    WHERE id = ? AND source_type = 'system' AND module_id IS NULL AND COALESCE(status, 'active') <> 'deleted'
  `).run(Date.now(), id);
  if (!result.changes) throw createValidationError('系统题不存在', 404);
  return true;
}

async function assertQuestionCanBeDeleted(id) {
  if (!id) return;
  const checks = [
    ['assignments', 'SELECT COUNT(*) AS count FROM assignments WHERE question_id = ?', [id]],
    ['writings', 'SELECT COUNT(*) AS count FROM writings WHERE question_id = ?', [id]],
    ['assignment_questions', 'SELECT COUNT(*) AS count FROM assignment_questions WHERE question_id = ?', [id]],
    ['collection_questions', 'SELECT COUNT(*) AS count FROM collection_questions WHERE question_id = ?', [id]],
    ['student_answers', 'SELECT COUNT(*) AS count FROM student_answers WHERE question_id = ?', [id]],
  ];
  for (const [, sql, params] of checks) {
    if (await countRows(sql, params)) {
      throw createValidationError('该题目已有作业、提交或合集引用，请改用禁用/下架', 409);
    }
  }
}

export const __test__ = {
  assertQuestionCanBeDeleted,
  assertQuestionContent,
  assertQuestionRelationScopes,
  assertResourceAvailable,
  buildAINormalizePrompt,
  buildLegacyQuestionEntries,
  makeLookup,
  normalizeBatchQuestionItem,
  normalizeAIItemsPayload,
  normalizeFieldValue,
  normalizeIdList,
  normalizeQuestionMaterialIds,
  resolveMany,
  shouldUpsertModuleDetails,
  summarizeBatchQuestionItem,
  validateQuestionPayload,
};
