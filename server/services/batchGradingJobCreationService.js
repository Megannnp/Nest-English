// 批量批改「创建作业」专用服务。
//
// 从 batchGradingService.js 拆分出来，职责只做「创建批量批改任务」这一件事：
//   - 输入校验与权限断言
//   - 写作记录、班级归属、学生可见性等数据加载
//   - 归一化条目 + 冲突检测
//   - 事务内写入 job + items
// 状态常量（BATCH_GRADING_JOB_STATUS 等）通过 createBatchGradingJobCreator 注入，
// 避免与本文件产生循环依赖；db 也可注入以便单元测试。
import db from '../db/database.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/appError.js';
import { nanoid } from '../utils/nanoid.js';

export const MAX_BATCH_ITEMS = 200;

const DEFAULT_WORKER_ID = 'batch_grading_worker';

function normalizeBatchJobScope(payload = {}) {
  return {
    assignmentId: String(payload.assignmentId || '').trim(),
    classId: String(payload.classId || '').trim(),
    questionId: String(payload.questionId || '').trim(),
  };
}

function assertBatchJobScope(scope) {
  if (!scope.assignmentId) {
    throw new ValidationError('请先选择任务');
  }
}

function assertTeacherCanCreateBatchJob(teacher, items) {
  if (teacher?.role !== 'teacher') {
    throw new ForbiddenError('只有教师可以发起批量批改');
  }
  if (!items.length) {
    throw new ValidationError('请至少选择一篇作文后再开始批量批改');
  }
  if (items.length > MAX_BATCH_ITEMS) {
    throw new ValidationError(`单次批量批改最多 ${MAX_BATCH_ITEMS} 篇，请分批提交`);
  }
}

function normalizeBatchWritingIds(items) {
  return items.map((item, idx) => {
    const id = String(item?.writingId || '').trim();
    if (!id) throw new ValidationError(`第 ${idx + 1} 项缺少写作记录`);
    return id;
  });
}

async function loadWritingRowsByIds(connection, writingIds) {
  const placeholders = writingIds.map(() => '?').join(', ');
  const [writingRows] = await connection.query(
    `SELECT * FROM writings WHERE id IN (${placeholders})`,
    writingIds
  );
  return writingRows;
}

async function loadAccessibleStudentIds({ connection, writingRows, teacherId }) {
  const studentIds = [...new Set(writingRows.map((r) => r.user_id).filter(Boolean))];
  if (!studentIds.length) return new Set();
  const sp = studentIds.map(() => '?').join(', ');
  const [memberRows] = await connection.query(
    `SELECT DISTINCT cs.student_id
     FROM class_students cs
     JOIN classes c ON c.id = cs.class_id
     WHERE cs.student_id IN (${sp}) AND c.teacher_id = ?`,
    [...studentIds, teacherId]
  );
  return new Set(memberRows.map((r) => r.student_id));
}

async function loadScopeClassName(connection, scope) {
  if (!scope.classId) return '';
  const [classRows] = await connection.query(
    'SELECT class_name FROM classes WHERE id = ? LIMIT 1',
    [scope.classId]
  );
  return classRows[0]?.class_name || '';
}

function parseSubmittedByTeacher(row) {
  try {
    return row.submitted_by_teacher ? JSON.parse(row.submitted_by_teacher) : null;
  } catch {
    return null;
  }
}

function assertBatchItemAccess({ row, index, teacherId, accessibleStudentIds }) {
  const submittedByTeacher = parseSubmittedByTeacher(row);
  const allowed = submittedByTeacher?.teacherId === teacherId || accessibleStudentIds.has(row.user_id);
  if (!allowed) throw new ForbiddenError(`第 ${index + 1} 项：无权限批量批改该作文`);
}

function assertBatchItemScope({ row, index, scope, accessibleStudentIds, scopeClassName }) {
  if (scope.assignmentId && String(row.assignment_id || '') !== scope.assignmentId) {
    throw new ValidationError(`第 ${index + 1} 项：作文与当前任务不匹配`);
  }
  if (!scope.classId) return;
  const inClass = accessibleStudentIds.has(row.user_id) || row.class_name === scopeClassName;
  if (!inClass) {
    throw new ValidationError(`第 ${index + 1} 项：作文与当前班级不匹配`);
  }
}

function buildNormalizedBatchItem({ item, row, writingId }) {
  return {
    writingId,
    studentName: String(item?.studentName || row.user_name || '').trim().slice(0, 128),
  };
}

async function normalizeBatchGradingJobItems({ connection, teacherId, items, scope }) {
  const writingIds = normalizeBatchWritingIds(items);
  const writingRows = await loadWritingRowsByIds(connection, writingIds);
  const writingMap = new Map(writingRows.map((r) => [r.id, r]));
  const accessibleStudentIds = await loadAccessibleStudentIds({ connection, writingRows, teacherId });
  const scopeClassName = await loadScopeClassName(connection, scope);

  return items.map((item, index) => {
    const writingId = writingIds[index];
    const row = writingMap.get(writingId);
    if (!row) throw new NotFoundError(`第 ${index + 1} 项写作记录不存在`);
    assertBatchItemAccess({ row, index, teacherId, accessibleStudentIds });
    assertBatchItemScope({ row, index, scope, accessibleStudentIds, scopeClassName });
    return buildNormalizedBatchItem({ item, row, writingId });
  });
}

function buildBatchGradingJobInsertParams({ id, teacherId, scope, totalCount, now, status, workerId }) {
  return [
    id,
    teacherId,
    scope.classId || null,
    scope.assignmentId || null,
    status,
    workerId,
    JSON.stringify({
      source: 'teacher_batch',
      questionId: scope.questionId || null,
    }),
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

async function insertBatchGradingJob(connection, {
  id, teacherId, scope, normalizedItems, now, status, workerId,
}) {
  await connection.query(`
    INSERT INTO batch_grading_jobs
      (id, teacher_id, class_id, assignment_id, status, queue_name, payload, error_message,
       total_count, processed_count, success_count, failed_count, created_at, updated_at, started_at, finished_at, last_heartbeat_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, buildBatchGradingJobInsertParams({
    id,
    teacherId,
    scope,
    totalCount: normalizedItems.length,
    now,
    status,
    workerId,
  }));
}

async function insertBatchGradingItems(connection, {
  jobId, normalizedItems, now, pendingStatus,
}) {
  if (!normalizedItems.length) return;

  // Single batch INSERT instead of N round-trips
  const rows = normalizedItems.map((item, index) => [
    nanoid(),
    jobId,
    item.writingId,
    item.studentName,
    index,
    pendingStatus,
    0,
    null, // result
    null, // error_message
    now,
    now,
    null, // started_at
    null, // finished_at
    null, // last_heartbeat_at
  ]);

  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  await connection.query(
    `INSERT INTO batch_grading_items
       (id, job_id, writing_id, student_name, sort_order, status, attempts, result, error_message,
        created_at, updated_at, started_at, finished_at, last_heartbeat_at)
     VALUES ${placeholders}`,
    rows.flat()
  );
}

async function persistBatchGradingJob({
  pool,
  id, teacherId, scope, normalizedItems, now, status, workerId, pendingStatus,
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await insertBatchGradingJob(connection, {
      id,
      teacherId,
      scope,
      normalizedItems,
      now,
      status,
      workerId,
    });
    await insertBatchGradingItems(connection, {
      jobId: id,
      normalizedItems,
      now,
      pendingStatus,
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function ensureNoConflictingBatchItems({ pool, writingIds = [], jobStatus, itemStatus }) {
  if (!writingIds.length) return;
  const placeholders = writingIds.map(() => '?').join(',');
  const rows = await pool.query(`
    SELECT bgi.writing_id
    FROM batch_grading_items bgi
    JOIN batch_grading_jobs bgj ON bgj.id = bgi.job_id
    WHERE bgi.writing_id IN (${placeholders})
      AND bgj.status IN (?, ?, ?, ?, ?)
      AND bgi.status IN (?, ?)
    LIMIT 1
  `, [
    ...writingIds,
    jobStatus.PENDING,
    jobStatus.RUNNING,
    jobStatus.PAUSING,
    jobStatus.PAUSED,
    jobStatus.CANCELING,
    itemStatus.PENDING,
    itemStatus.RUNNING,
  ]);
  const [[conflict]] = rows;
  if (conflict?.writing_id) {
    throw new ConflictError('选中的作文里有记录已经在另一个批量批改任务中');
  }
}

export function createBatchGradingJobCreator(statusConstants, dbDependency = db) {
  const { jobStatus, itemStatus } = statusConstants;
  const workerId = statusConstants.workerId || DEFAULT_WORKER_ID;
  const pool = dbDependency?.pool || {};

  // 创建作业入口：校验 → 归一化 → 冲突检测 → 事务落库
  return async function createBatchGradingJob({ teacher, payload }) {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    assertTeacherCanCreateBatchJob(teacher, items);
    const scope = normalizeBatchJobScope(payload);
    assertBatchJobScope(scope);
    const normalizedItems = await normalizeBatchGradingJobItems({
      connection: pool,
      teacherId: teacher.id,
      items,
      scope,
    });

    await ensureNoConflictingBatchItems({
      pool,
      writingIds: normalizedItems.map((item) => item.writingId),
      jobStatus,
      itemStatus,
    });

    const id = nanoid();
    const now = Date.now();
    await persistBatchGradingJob({
      pool,
      id,
      teacherId: teacher.id,
      scope,
      normalizedItems,
      now,
      status: jobStatus.PENDING,
      workerId,
      pendingStatus: itemStatus.PENDING,
    });

    return { id, scope, totalCount: normalizedItems.length };
  };
}