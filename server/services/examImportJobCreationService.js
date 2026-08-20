// 高考英语试卷批量导入「创建作业」专用服务。
//
// 复用 batch_grading_jobs 的思路，但使用独立的 exam_import_jobs / exam_import_items 表：
//   - 接收多文件上传（原卷 + 可选解析版答案文件）
//   - 文件落盘到 data/exam-imports/{jobId}/ 目录
//   - 每个文件一个 item，事务写入 job + items
//   - 提供任务列表 / 详情（进度）查询
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import db from '../db/database.js';
import { nanoid } from '../utils/nanoid.js';

export const EXAM_IMPORT_JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  PARTIAL_FAILED: 'partial_failed',
  FAILED: 'failed',
};

export const EXAM_IMPORT_ITEM_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
};

export const EXAM_IMPORT_WORKER_ID = 'exam_import_worker';
export const MAX_EXAM_IMPORT_FILES = 200;
export const MAX_EXAM_IMPORT_BYTES = 20 * 1024 * 1024;
export const ALLOWED_EXAM_FILE_EXTS = new Set(['.doc', '.docx', '.txt']);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const EXAM_IMPORT_ROOT = path.resolve(__dirname, '../data/exam-imports');

function inferYearFromFileName(fileName) {
  const match = String(fileName || '').match(/20\d{2}/);
  return match ? match[0] : '';
}

function inferRegionFromFileName(fileName) {
  const name = String(fileName || '');
  if (/全国/.test(name) || /新课标/.test(name) || /新高考/.test(name)) return '全国';
  const region = name.match(/(北京|上海|天津|浙江|江苏|山东|广东|湖北|湖南|河北|福建|辽宁|重庆|海南|河南|四川|陕西|山西|安徽|江西|广西|云南|贵州|甘肃|青海|宁夏|新疆|西藏|吉林|黑龙江|内蒙古)/);
  return region ? region[1] : '';
}

function inferPaperFromFileName(fileName) {
  const name = String(fileName || '');
  if (/I{1,3}卷|Ⅰ卷|Ⅱ卷|卷I|卷Ⅱ/.test(name)) {
    const match = name.match(/(?:I+|Ⅰ+|Ⅱ+|III+)\s*卷?/);
    if (match) return match[0].replace(/\s/g, '');
  }
  if (/甲卷/.test(name)) return '甲卷';
  if (/乙卷/.test(name)) return '乙卷';
  const match = name.match(/(?:全国|新高考|新课标)[^_\-（）()\s]*[IⅠⅡⅢ]+/);
  if (match) return match[0];
  return '';
}

function optionalString(value, maxLength = 64) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function sanitizeFileName(fileName) {
  const base = path.basename(String(fileName || ''));
  return base.replace(/[^\w.\u4e00-\u9fff-]/g, '_').slice(0, 120) || `file_${Date.now()}`;
}

function getFileExt(fileName) {
  const ext = path.extname(String(fileName || '')).toLowerCase();
  return ALLOWED_EXAM_FILE_EXTS.has(ext) ? ext : '';
}

function assertCanUpload(user, fileCount) {
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    const error = new Error('只有管理员和教师可以导入试卷');
    error.status = 403;
    throw error;
  }
  if (!fileCount) {
    const error = new Error('请至少上传一份试卷文件');
    error.status = 400;
    throw error;
  }
  if (fileCount > MAX_EXAM_IMPORT_FILES) {
    const error = new Error(`单次最多导入 ${MAX_EXAM_IMPORT_FILES} 份试卷，请分批上传`);
    error.status = 400;
    throw error;
  }
}

function normalizeMetaArrays(value) {
  if (Array.isArray(value)) return value.map((v) => optionalString(v));
  return [optionalString(value)];
}

function buildItemMeta({ file, index, years, regions, papers }) {
  const fileName = String(file?.originalname || '');
  const year = years[index] || inferYearFromFileName(fileName);
  const region = regions[index] || inferRegionFromFileName(fileName);
  const paper = papers[index] || inferPaperFromFileName(fileName);
  const ext = getFileExt(fileName);
  if (!ext) {
    const error = new Error(`第 ${index + 1} 个文件 "${fileName}" 不是支持的格式（支持 .doc / .docx / .txt）`);
    error.status = 400;
    throw error;
  }
  return { fileName, ext, year, region, paper };
}

async function writeUploadFile({ jobDir, index, file }) {
  const safeName = sanitizeFileName(file.originalname);
  const filePath = path.join(jobDir, `${index + 1}-${safeName}`);
  await fs.writeFile(filePath, file.buffer);
  return filePath;
}

async function normalizeExamImportFiles({ files, answerFiles, years, regions, papers, root = EXAM_IMPORT_ROOT }) {
  const normalized = [];
  const jobId = nanoid();
  const jobDir = path.join(root, jobId);
  await fs.mkdir(jobDir, { recursive: true });

  try {
    const answerPaths = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const meta = buildItemMeta({ file, index, years, regions, papers });
      const filePath = await writeUploadFile({ jobDir, index, file });
      let answerFilePath = '';
      const answerFile = answerFiles?.[index];
      if (answerFile) {
        const answerPath = await writeUploadFile({ jobDir, index: files.length + index, file: answerFile });
        answerPaths.push(answerPath);
        answerFilePath = answerPath;
      }
      normalized.push({
        filePath,
        answerFilePath,
        ...meta,
      });
    }
    // If we fail part-way, best-effort remove the job dir to avoid orphan files.
    return { normalized, jobDir };
  } catch (error) {
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

function buildExamImportJobInsertParams({ id, uploaderId, totalCount, now }) {
  return [
    id,
    uploaderId,
    EXAM_IMPORT_JOB_STATUS.PENDING,
    EXAM_IMPORT_WORKER_ID,
    JSON.stringify({ source: 'admin_upload' }),
    null,
    totalCount,
    0,
    0,
    0,
    now,
    now,
    null,
    null,
    null,
  ];
}

async function insertExamImportJob(connection, { id, uploaderId, totalCount, now }) {
  await connection.query(`
    INSERT INTO exam_import_jobs
      (id, uploader_id, status, queue_name, payload, error_message,
       total_count, processed_count, success_count, failed_count, created_at, updated_at, started_at, finished_at, last_heartbeat_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, buildExamImportJobInsertParams({ id, uploaderId, totalCount, now }));
}

async function insertExamImportItems(connection, { jobId, normalized, now }) {
  if (!normalized.length) return;
  const rows = normalized.map((item, index) => [
    nanoid(),
    jobId,
    item.fileName,
    item.filePath,
    item.ext,
    item.year,
    item.region,
    item.paper,
    item.answerFilePath || '',
    index,
    EXAM_IMPORT_ITEM_STATUS.PENDING,
    0,
    null, // result
    '',
    null, // error_message
    now,
    now,
    null, // started_at
    null, // finished_at
    null, // last_heartbeat_at
  ]);
  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  await connection.query(
    `INSERT INTO exam_import_items
       (id, job_id, file_name, file_path, file_ext, year, region, paper, answer_file_path, sort_order,
        status, attempts, result, error_code, error_message, created_at, updated_at, started_at, finished_at, last_heartbeat_at)
     VALUES ${placeholders}`,
    rows.flat()
  );
}

async function persistExamImportJob({ pool, id, uploaderId, normalized, now }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await insertExamImportJob(connection, { id, uploaderId, totalCount: normalized.length, now });
    await insertExamImportItems(connection, { jobId: id, normalized, now });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function createExamImportJobCreator({ dbDependency = db, root = EXAM_IMPORT_ROOT } = {}) {
  const pool = dbDependency?.pool || {};

  return async function createExamImportJob({ user, files = [], answerFiles = [], years = [], regions = [], papers = [] }) {
    if (!Array.isArray(files) || !files.length) {
      const error = new Error('请至少上传一份试卷文件');
      error.status = 400;
      throw error;
    }
    assertCanUpload(user, files.length);
    const normalized = await normalizeExamImportFiles({
      files,
      answerFiles: Array.isArray(answerFiles) ? answerFiles : [],
      years: normalizeMetaArrays(years),
      regions: normalizeMetaArrays(regions),
      papers: normalizeMetaArrays(papers),
      root,
    });

    const id = nanoid();
    const now = Date.now();
    try {
      await persistExamImportJob({ pool, id, uploaderId: user.id, normalized: normalized.normalized, now });
    } catch (error) {
      await fs.rm(normalized.jobDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
    return { id, totalCount: normalized.normalized.length };
  };
}

function mapExamImportJobRow(row) {
  return {
    id: row.id,
    status: row.status,
    totalCount: Number(row.total_count || 0),
    processedCount: Number(row.processed_count || 0),
    successCount: Number(row.success_count || 0),
    failedCount: Number(row.failed_count || 0),
    errorMessage: row.error_message || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    items: [],
  };
}

// 查询用 repository（任务列表/详情）。注意与 examImportRepository.js 的 worker 领单
// repository 职责不同、函数名不同，避免同名混淆。
export function createExamImportQueryRepository({ dbDependency = db } = {}) {
  const pool = dbDependency?.pool || {};

  return {
    async loadJobRow(jobId) {
      const [rows] = await pool.query(
        'SELECT * FROM exam_import_jobs WHERE id = ? LIMIT 1',
        [jobId]
      );
      return rows[0];
    },

    async loadOwnedJobRow(jobId, uploaderId) {
      const [rows] = await pool.query(
        'SELECT * FROM exam_import_jobs WHERE id = ? AND uploader_id = ? LIMIT 1',
        [jobId, uploaderId]
      );
      return rows[0];
    },

    async loadItemRows(jobId) {
      const [rows] = await pool.query(
        'SELECT * FROM exam_import_items WHERE job_id = ? ORDER BY sort_order ASC',
        [jobId]
      );
      return rows;
    },

    async loadItemRowsByJobIds(jobIds) {
      if (!jobIds.length) return [];
      const placeholders = jobIds.map(() => '?').join(', ');
      const [rows] = await pool.query(
        `SELECT * FROM exam_import_items WHERE job_id IN (${placeholders}) ORDER BY sort_order ASC`,
        jobIds
      );
      return rows;
    },

    async listJobRowsForUploader({ uploaderId, limit = 10 }) {
      const [rows] = await pool.query(
        'SELECT * FROM exam_import_jobs WHERE uploader_id = ? ORDER BY created_at DESC LIMIT ?',
        [uploaderId, limit]
      );
      return rows;
    },
  };
}

function mapExamImportItemRow(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    fileName: row.file_name,
    year: row.year || '',
    region: row.region || '',
    paper: row.paper || '',
    sortOrder: Number(row.sort_order || 0),
    status: row.status,
    attempts: Number(row.attempts || 0),
    result: row.result ? JSON.parse(row.result) : null,
    errorCode: row.error_code || '',
    errorMessage: row.error_message || '',
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

export async function buildExamImportJobDetail(jobRow, itemRows) {
  if (!jobRow) return null;
  const detail = mapExamImportJobRow(jobRow);
  detail.items = (itemRows || []).map(mapExamImportItemRow);
  return detail;
}

export function createExamImportQueryService({ dbDependency = db } = {}) {
  const repository = createExamImportQueryRepository({ dbDependency });

  return {
    async getJob({ uploaderId, jobId }) {
      const row = await repository.loadOwnedJobRow(jobId, uploaderId);
      if (!row) return null;
      const items = await repository.loadItemRows(jobId);
      return buildExamImportJobDetail(row, items);
    },

    async listJobs({ uploaderId, limit = 10 }) {
      const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
      const rows = await repository.listJobRowsForUploader({ uploaderId, limit: normalizedLimit });
      if (!rows.length) return [];
      const itemRows = await repository.loadItemRowsByJobIds(rows.map((row) => row.id));
      const itemsByJobId = new Map();
      for (const item of itemRows) {
        if (!itemsByJobId.has(item.job_id)) itemsByJobId.set(item.job_id, []);
        itemsByJobId.get(item.job_id).push(item);
      }
      return rows.map((row) => buildExamImportJobDetail(row, itemsByJobId.get(row.id) || []));
    },
  };
}