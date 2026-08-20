// 高考英语试卷解析结果 → 正式题库「落库」服务。
//
// 把 parsePaper() 解析出的结构（modules[].groups[]/questions[]/materials[]）持久化到：
//   - sources          来源（年份+地区+卷别，UPSERT）
//   - materials        材料（阅读/听力大题的文章）
//   - questions        通用题目（含 source 元数据）
//   - reading_questions / listening_questions / grammar_questions / writing_questions  模块详情
//   - question_materials 题目 ↔ 材料关联
// 使用事务批量写入，一次解析结果一次提交。
import { createHash } from 'node:crypto';

import db from '../db/database.js';
import { validateParseResult } from '../scripts/parse-gaokao-paper.mjs';
import { nanoid } from '../utils/nanoid.js';

// parsePaper 的 module 名 → 题库模块 code + 详情表
const MODULE_IMPORT_MAP = {
  reading: { moduleCode: 'reading', detailTable: 'reading_questions' },
  listening: { moduleCode: 'listening', detailTable: 'listening_questions' },
  languageUse: { moduleCode: 'grammar', detailTable: 'grammar_questions' },
  writing: { moduleCode: 'writing', detailTable: 'writing_questions' },
};

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

function optionalString(value, maxLength = 255) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function truncateContent(value, maxLength = 256) {
  const text = optionalString(value);
  if (!text) return '未命名材料';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function optionsToArray(options) {
  if (!Array.isArray(options)) return [];
  return options.map((option) => String(option ?? '').trim()).filter(Boolean);
}

function buildSourceCode({ year, region, paper }) {
  const parts = [
    'gaokao',
    String(year || '').trim(),
    String(region || '').trim().replace(/\s/g, ''),
    String(paper || '').trim().replace(/\s/g, ''),
  ].filter(Boolean);
  const code = parts.join('-') || 'gaokao-import';
  return code.toLowerCase().slice(0, 80);
}

function buildQuestionFingerprint(content) {
  // 归一化：去空白/标点，与小写化，保证同一题不同排版能匹配
  const normalized = String(content || '')
    .replace(/\s+/g, ' ')
    .replace(/[，。、””’’：:；;,.!?！？（）()【】[\]《》<>]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, 1200);
  return createHash('sha1').update(normalized).digest('hex');
}

function buildQuestionsFromModule(mod) {
  // 汇总 group 内题 + 独立题，保留材料映射
  const rows = [];
  for (const group of mod.groups || []) {
    for (const question of group.questions || []) {
      rows.push({ question, materialIndex: group.materialIndex ?? -1 });
    }
  }
  for (const question of mod.questions || []) {
    rows.push({ question, materialIndex: -1 });
  }
  return rows;
}

export function createExamImportPersistence({ dbDependency = db, idGenerator = nanoid } = {}) {
  const pool = dbDependency?.pool || {};

  async function loadModuleIdByCode(code) {
    const [rows] = await pool.query('SELECT id FROM modules WHERE code = ? LIMIT 1', [code]);
    return rows[0]?.id || '';
  }

  async function resolveQuestionModuleId(moduleName) {
    const mapping = MODULE_IMPORT_MAP[moduleName];
    if (!mapping) return { moduleId: '', detailTable: '' };
    const moduleId = await loadModuleIdByCode(mapping.moduleCode);
    return { moduleId, detailTable: mapping.detailTable };
  }

  async function upsertSource({ connection, year, region, paper, fileName }) {
    const code = buildSourceCode({ year, region, paper });
    const name = optionalString(`${year} ${region} ${paper}`.trim(), 160) || '高考真题';
    const now = Date.now();

    const [exists] = await connection.query(
      `SELECT id FROM sources WHERE code = ? LIMIT 1`,
      [code]
    );
    if (exists[0]?.id) return exists[0].id;

    const id = idGenerator();
    await connection.query(
      `INSERT INTO sources (id, name, code, source_type, year, region, description, status, created_at, updated_at)
       VALUES (?, ?, ?, 'exam', ?, ?, ?, 'active', ?, ?)`,
      [id, name, code, year || '', region || '', fileName ? `导入自 ${fileName}` : '', now, now]
    );
    return id;
  }

  async function insertMaterial({ connection, moduleId, sourceId, content, sourceLabel }) {
    const now = Date.now();
    const id = idGenerator();
    const title = truncateContent(content, 60);
    await connection.query(
      `INSERT INTO materials (id, module_id, title, material_type, content, source_id, source, status, created_at, updated_at)
       VALUES (?, ?, ?, 'passage', ?, ?, ?, 'active', ?, ?)`,
      [id, moduleId || null, title, content, sourceId || null, sourceLabel || '', now, now]
    );
    return id;
  }

  async function attachMaterial({ connection, questionId, materialId, now }) {
    if (!materialId) return;
    await connection.query(
      `INSERT IGNORE INTO question_materials (question_id, material_id, role, sort_order, created_at)
       VALUES (?, ?, 'primary', 0, ?)`,
      [questionId, materialId, now]
    );
  }

  async function insertQuestionDetail({ connection, detailTable, questionId, question, content, now }) {
    if (!detailTable) return;
    const answer = optionalString(question.answer);
    const analysis = '';
    const opts = toJsonParam(optionsToArray(question.options));

    if (detailTable === 'listening_questions') {
      await connection.query(
        `INSERT INTO listening_questions (question_id, stem, options, transcript, timeline, correct_answer, explanation, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [questionId, content, opts, '', null, answer, analysis, now]
      );
      return;
    }
    if (detailTable === 'grammar_questions') {
      await connection.query(
        `INSERT INTO grammar_questions (question_id, stem, options, correct_answer, explanation, grammar_focus, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [questionId, content, opts, answer, analysis, '', now]
      );
      return;
    }
    if (detailTable === 'writing_questions') {
      await connection.query(
        `INSERT INTO writing_questions (question_id, prompt, requirements, sample_answer, scoring_rubric, min_words, max_words, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [questionId, content, null, question.analysis || answer, null, null, null, now]
      );
      return;
    }
    // 默认 reading_questions
    await connection.query(
      `INSERT INTO reading_questions (question_id, stem, options, correct_answer, explanation, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [questionId, content, opts, answer, analysis, now]
    );
  }

  // 校验某 source 下是否已存在相同指纹的题目（同一试卷重复导入时去重）
  async function loadExistingFingerprints({ connection, sourceId, fingerprints }) {
    if (!sourceId || !fingerprints.length) return new Set();
    const placeholders = fingerprints.map(() => '?').join(', ');
    const [rows] = await connection.query(
      `SELECT prompt_fingerprint FROM questions
       WHERE source_id = ? AND prompt_fingerprint IN (${placeholders})
         AND COALESCE(status, 'active') <> 'deleted'
       LIMIT 200`,
      [sourceId, ...fingerprints]
    );
    return new Set(rows.map((row) => row.prompt_fingerprint));
  }

  async function persistQuestion({ connection, mod, question, materialId, sourceId, sourceLabel, moduleId, detailTable, now }) {
    const content = optionalString(question.stem || question.prompt || '');
    const fingerprint = buildQuestionFingerprint(content);

    const id = idGenerator();
    // 解析讲解较长，保留完整内容（questions.analysis 为 LONGTEXT）
    const analysisText = String(question.analysis || '').trim().slice(0, 20000);
    await connection.query(
      `INSERT INTO questions
         (id, user_id, title, question_type, content, material_id, answer, analysis, score,
          source_id, source_type, source_label, source_year, source_region, source_paper,
          prompt_fingerprint, is_official, status, created_by, created_at, updated_at,
          module_id, needs_review)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'system', ?, ?, ?, ?, ?, 1, 'active', NULL, ?, ?, ?, 0)`,
      [
        id,
        truncateContent(content, 200),
        mod.module,
        content,
        materialId || null,
        optionalString(question.answer),
        analysisText,
        nullableInt(question.points),
        sourceId || null,
        sourceLabel || '',
        mod.year || '',
        mod.region || '',
        mod.paper || '',
        fingerprint,
        now,
        now,
        moduleId || null,
      ]
    );
    await insertQuestionDetail({ connection, detailTable, questionId: id, question, content, now });
    await attachMaterial({ connection, questionId: id, materialId, now });
    return id;
  }

  // 入口：把一个 module 的解析结果落库
  // jsdoc: 返回 { questions, materials, skipped }
  async function persistModule({ connection, mod, sourceId, sourceLabel }) {
    const { moduleId, detailTable } = await resolveQuestionModuleId(mod.module);
    if (!moduleId) return { questions: 0, materials: 0, skipped: 0 };

    const now = Date.now();
    const questionRows = buildQuestionsFromModule(mod);
    let materialCount = 0;
    let questionCount = 0;
    let duplicateCount = 0;
    const skipped = questionRows.filter(({ question }) => !optionalString(question.stem || question.prompt)).length;

    // 预取本 source 下已存在的指纹，跳过重复题（同一试卷重复导入不会被重复入库）
    const fingerprints = questionRows
      .map(({ question }) => buildQuestionFingerprint(optionalString(question.stem || question.prompt)))
      .filter(Boolean);
    const existingFingerprints = await loadExistingFingerprints({ connection, sourceId, fingerprints });

    // 先落材料，建立索引映射
    const materialIds = [];
    for (const material of mod.materials || []) {
      if (!material?.content) continue;
      const materialId = await insertMaterial({
        connection,
        moduleId,
        sourceId,
        content: material.content,
        sourceLabel,
      });
      materialIds.push(materialId);
      materialCount += 1;
    }

    for (const { question, materialIndex } of questionRows) {
      const content = optionalString(question.stem || question.prompt || '');
      if (!content) continue; // 无题干跳过（例如纯选项行）
      // 去重：同一来源下指纹已存在则跳过，避免重复入库
      const fingerprint = buildQuestionFingerprint(content);
      if (existingFingerprints.has(fingerprint)) {
        duplicateCount += 1;
        continue;
      }
      const materialId = materialIndex >= 0 && materialIndex < materialIds.length ? materialIds[materialIndex] : null;
      await persistQuestion({
        connection,
        mod,
        question,
        materialId,
        sourceId,
        sourceLabel,
        moduleId,
        detailTable,
        now,
      });
      questionCount += 1;
    }

    return { questions: questionCount, materials: materialCount, skipped, duplicates: duplicateCount };
  }

  // 入口：把整份试卷的解析结果（paperResult）落库
  async function persistPaperResult({ paperResult, year = '', region = '', paper = '', fileName = '' }) {
    if (!paperResult?.modules?.length) {
      return { sourceId: '', importedQuestions: 0, importedMaterials: 0, skippedQuestions: 0, duplicatedQuestions: 0, moduleStats: [] };
    }
    // 防御性校验（第二道防线）：即使调用方跳过了运行时门禁，
    // 落库前仍会拦截答案类型不匹配（如语法填空单词混入选择题）的数据。
    const validation = validateParseResult(paperResult);
    if (validation.invalid > 0) {
      const examples = validation.issues
        .slice(0, 3)
        .map((issue) => `${issue.module}#${issue.number}=${issue.answer}`)
        .join('，');
      const error = new Error(`答案类型校验未通过（${validation.invalid} 道）：${examples}`);
      error.code = 'EXAM_IMPORT_INVALID_ANSWERS';
      throw error;
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const sourceId = await upsertSource({ connection, year, region, paper, fileName });
      const sourceLabel = optionalString(`${year} ${region} ${paper}`.trim(), 128) || '高考真题';
      const moduleStats = [];
      let totalQuestions = 0;
      let totalMaterials = 0;
      let totalSkipped = 0;
      let totalDuplicates = 0;

      for (const mod of paperResult.modules) {
        const result = await persistModule({ connection, mod, sourceId, sourceLabel });
        moduleStats.push({ module: mod.module, ...result });
        totalQuestions += result.questions;
        totalMaterials += result.materials;
        totalSkipped += result.skipped;
        totalDuplicates += result.duplicates || 0;
      }

      await connection.commit();
      return {
        sourceId,
        sourceLabel,
        importedQuestions: totalQuestions,
        importedMaterials: totalMaterials,
        skippedQuestions: totalSkipped,
        duplicatedQuestions: totalDuplicates,
        moduleStats,
      };
    } catch (error) {
      try { await connection.rollback(); } catch { /* ignore */ }
      throw error;
    } finally {
      connection.release();
    }
  }

  return { persistPaperResult };
}

export default createExamImportPersistence;