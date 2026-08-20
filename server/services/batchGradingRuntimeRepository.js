export async function selectNextBatchGradingJobCandidate(db, {
  pendingStatus,
  runningStatus,
  pausingStatus,
  cancelingStatus,
  staleBefore,
}) {
  return db.prepare(`
    SELECT *
    FROM batch_grading_jobs
    WHERE status = ?
       OR (status = ? AND last_heartbeat_at IS NOT NULL AND last_heartbeat_at < ?)
       OR status IN (?, ?)
    ORDER BY updated_at ASC
    LIMIT 1
  `).get(
    pendingStatus,
    runningStatus,
    staleBefore,
    pausingStatus,
    cancelingStatus
  );
}

export async function touchTransitioningBatchGradingJob(db, {
  jobId,
  status,
  now,
}) {
  return db.prepare(`
    UPDATE batch_grading_jobs
    SET last_heartbeat_at = ?, updated_at = ?
    WHERE id = ? AND status = ?
  `).run(now, now, jobId, status);
}

export async function claimBatchGradingJobCandidate(db, {
  jobId,
  runningStatus,
  workerId,
  now,
  pendingStatus,
  staleRunningStatus,
  staleBefore,
}) {
  return db.prepare(`
    UPDATE batch_grading_jobs
    SET status = ?, queue_name = ?, updated_at = ?, started_at = COALESCE(started_at, ?), finished_at = NULL, last_heartbeat_at = ?, error_message = NULL
    WHERE id = ?
      AND (
        status = ?
        OR (status = ? AND last_heartbeat_at IS NOT NULL AND last_heartbeat_at < ?)
      )
  `).run(
    runningStatus,
    workerId,
    now,
    now,
    now,
    jobId,
    pendingStatus,
    staleRunningStatus,
    staleBefore
  );
}

export async function selectNextBatchGradingItemCandidate(db, {
  jobId,
  pendingStatus,
  runningStatus,
  staleBefore,
}) {
  return db.prepare(`
    SELECT *
    FROM batch_grading_items
    WHERE job_id = ?
      AND (
        status = ?
        OR (status = ? AND last_heartbeat_at IS NOT NULL AND last_heartbeat_at < ?)
      )
    ORDER BY sort_order ASC, updated_at ASC
    LIMIT 1
  `).get(jobId, pendingStatus, runningStatus, staleBefore);
}

export async function claimBatchGradingItemCandidate(db, {
  itemId,
  runningStatus,
  attempts,
  now,
  pendingStatus,
  staleRunningStatus,
  staleBefore,
}) {
  return db.prepare(`
    UPDATE batch_grading_items
    SET status = ?, attempts = ?, updated_at = ?, started_at = COALESCE(started_at, ?), finished_at = NULL, last_heartbeat_at = ?, error_message = NULL
    WHERE id = ?
      AND (
        status = ?
        OR (status = ? AND last_heartbeat_at IS NOT NULL AND last_heartbeat_at < ?)
      )
  `).run(
    runningStatus,
    attempts,
    now,
    now,
    now,
    itemId,
    pendingStatus,
    staleRunningStatus,
    staleBefore
  );
}

export async function loadBatchGradingItemRow(db, itemId) {
  return db.prepare('SELECT * FROM batch_grading_items WHERE id = ? LIMIT 1').get(itemId);
}

export async function resetRunningItemsForPausedJob(db, {
  jobId,
  pendingStatus,
  now,
  runningStatus,
}) {
  return db.prepare(`
    UPDATE batch_grading_items
    SET status = ?, updated_at = ?, started_at = NULL, finished_at = NULL, last_heartbeat_at = NULL
    WHERE job_id = ? AND status = ?
  `).run(
    pendingStatus,
    now,
    jobId,
    runningStatus
  );
}

export async function cancelActiveItemsForCanceledJob(db, {
  jobId,
  canceledStatus,
  now,
  userCanceledCode,
  errorMessage,
  pendingStatus,
  runningStatus,
}) {
  return db.prepare(`
    UPDATE batch_grading_items
    SET status = ?, updated_at = ?, finished_at = ?, error_code = ?, error_message = ?
    WHERE job_id = ? AND status IN (?, ?)
  `).run(
    canceledStatus,
    now,
    now,
    userCanceledCode,
    errorMessage,
    jobId,
    pendingStatus,
    runningStatus
  );
}
