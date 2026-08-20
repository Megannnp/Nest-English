import db from '../db/database.js';

export async function loadBatchGradingJobRow(jobId) {
  return db.prepare('SELECT * FROM batch_grading_jobs WHERE id = ? LIMIT 1').get(jobId);
}

export async function loadOwnedBatchGradingJobRow(jobId, teacherId) {
  return db.prepare(`
    SELECT *
    FROM batch_grading_jobs
    WHERE id = ? AND teacher_id = ?
    LIMIT 1
  `).get(jobId, teacherId);
}

export async function loadBatchGradingItemRows(jobId) {
  return db.prepare(`
    SELECT *
    FROM batch_grading_items
    WHERE job_id = ?
    ORDER BY sort_order ASC, created_at ASC
  `).all(jobId);
}

export async function loadBatchGradingItemRowsByJobIds(jobIds = []) {
  if (!jobIds.length) return {};
  const placeholders = jobIds.map(() => '?').join(',');
  const rows = await db.prepare(`
    SELECT *
    FROM batch_grading_items
    WHERE job_id IN (${placeholders})
    ORDER BY job_id ASC, sort_order ASC, created_at ASC
  `).all(...jobIds);

  return rows.reduce((accumulator, row) => {
    const key = row.job_id;
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(row);
    return accumulator;
  }, {});
}

export async function listBatchGradingJobRowsForTeacher({
  teacherId,
  filterClause = '',
  filterParams = [],
  scopeClauses = [],
  scopeParams = [],
  limit,
}) {
  return db.prepare(`
    SELECT *
    FROM batch_grading_jobs
    WHERE teacher_id = ?
      ${filterClause}
      ${scopeClauses.join('\n      ')}
    ORDER BY updated_at DESC, created_at DESC
    LIMIT ?
  `).all(teacherId, ...filterParams, ...scopeParams, limit);
}

export async function refreshBatchGradingJobCounters(jobId, itemStatus) {
  const counters = await db.prepare(`
    SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN status IN (?, ?, ?) THEN 1 ELSE 0 END) AS processed_count,
      SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS success_count,
      SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS failed_count
    FROM batch_grading_items
    WHERE job_id = ?
  `).get(
    itemStatus.SUCCEEDED,
    itemStatus.FAILED,
    itemStatus.CANCELED,
    itemStatus.SUCCEEDED,
    itemStatus.FAILED,
    jobId
  );

  await db.prepare(`
    UPDATE batch_grading_jobs
    SET total_count = ?, processed_count = ?, success_count = ?, failed_count = ?, updated_at = ?
    WHERE id = ?
  `).run(
    Number(counters?.total_count || 0),
    Number(counters?.processed_count || 0),
    Number(counters?.success_count || 0),
    Number(counters?.failed_count || 0),
    Date.now(),
    jobId
  );
}

export async function hasRunningBatchGradingItems(jobId, runningStatus) {
  return db.prepare(`
    SELECT 1
    FROM batch_grading_items
    WHERE job_id = ? AND status = ?
    LIMIT 1
  `).get(jobId, runningStatus);
}

export async function updateBatchGradingJobLifecycle(jobId, {
  status,
  updatedAt,
  finishedAt,
  errorMessage,
}) {
  return db.prepare(`
    UPDATE batch_grading_jobs
    SET status = ?, updated_at = ?, finished_at = ?, error_message = ?
    WHERE id = ?
  `).run(status, updatedAt, finishedAt ?? null, errorMessage ?? null, jobId);
}

export async function updateBatchGradingJobStatus(jobId, status, updatedAt) {
  return db.prepare(`
    UPDATE batch_grading_jobs
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).run(status, updatedAt, jobId);
}

export async function cancelPendingBatchGradingItems(jobId, {
  canceledStatus,
  pendingStatus,
  errorCode,
  errorMessage,
  now,
}) {
  return db.prepare(`
    UPDATE batch_grading_items
    SET status = ?, updated_at = ?, finished_at = ?, error_code = ?, error_message = ?
    WHERE job_id = ? AND status = ?
  `).run(
    canceledStatus,
    now,
    now,
    errorCode,
    errorMessage,
    jobId,
    pendingStatus
  );
}

export async function resetFailedBatchGradingItems(jobId, failedStatus, pendingStatus, now) {
  return db.prepare(`
    UPDATE batch_grading_items
    SET status = ?, updated_at = ?, started_at = NULL, finished_at = NULL, last_heartbeat_at = NULL, error_code = '', error_message = NULL
    WHERE job_id = ? AND status = ?
  `).run(
    pendingStatus,
    now,
    jobId,
    failedStatus
  );
}

export async function resetIncompleteBatchGradingItems(jobId, {
  pendingStatus,
  runningStatus,
  canceledStatus,
  userCanceledCode,
  now,
}) {
  return db.prepare(`
    UPDATE batch_grading_items
    SET status = ?, updated_at = ?, started_at = NULL, finished_at = NULL, last_heartbeat_at = NULL, error_code = '', error_message = NULL
    WHERE job_id = ?
      AND (
        status IN (?, ?)
        OR (status = ? AND error_code = ?)
      )
  `).run(
    pendingStatus,
    now,
    jobId,
    pendingStatus,
    runningStatus,
    canceledStatus,
    userCanceledCode
  );
}
