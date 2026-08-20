/* eslint-disable complexity */
import {
  buildBatchGradingSuccessPayload,
  isCancelRequestedStatus,
  isPauseRequestedStatus,
  resolveFinalBatchGradingJobStatus,
} from './batchGradingRuntimeDomain.js';
import {
  cancelActiveItemsForCanceledJob,
  claimBatchGradingItemCandidate,
  claimBatchGradingJobCandidate,
  loadBatchGradingItemRow,
  resetRunningItemsForPausedJob,
  selectNextBatchGradingItemCandidate,
  selectNextBatchGradingJobCandidate,
  touchTransitioningBatchGradingJob,
} from './batchGradingRuntimeRepository.js';
import { createWorkerLoopBackoff } from './workerLoopBackoff.js';

export function createBatchGradingRuntime({
  db,
  loadBatchGradingJobRow,
  loadWritingById,
  runQuickFeedbackGeneration,
  assertAIBudgetAvailable,
  parseJson,
  classifyBatchGradingFailure,
  markBatchGradingItemFailed,
  markBatchGradingItemSuccess,
  refreshBatchGradingJobCounters,
  recordBatchGradingFailureMetric,
  recordBatchGradingMetric,
  logError,
  constants,
  repository = {},
  runtimeDomain = {},
}) {
  const {
    jobStatus,
    itemStatus,
    itemErrorCode,
    legacyCancelledStatus,
    workerId,
    pollIntervalMs,
    recoveryIntervalMs,
    staleMs,
    itemConcurrency = 4,
  } = constants;

  let batchGradingWorkerTimer = null;
  let batchGradingRecoveryTimer = null;
  let batchGradingActive = false;
  const batchGradingWorkerBackoff = createWorkerLoopBackoff({
    baseDelayMs: pollIntervalMs,
    maxDelayMs: recoveryIntervalMs,
  });
  const {
    cancelActiveItemsForCanceledJob: cancelActiveItemsForCanceledJobImpl = cancelActiveItemsForCanceledJob,
    claimBatchGradingItemCandidate: claimBatchGradingItemCandidateImpl = claimBatchGradingItemCandidate,
    claimBatchGradingJobCandidate: claimBatchGradingJobCandidateImpl = claimBatchGradingJobCandidate,
    loadBatchGradingItemRow: loadBatchGradingItemRowImpl = loadBatchGradingItemRow,
    resetRunningItemsForPausedJob: resetRunningItemsForPausedJobImpl = resetRunningItemsForPausedJob,
    selectNextBatchGradingItemCandidate: selectNextBatchGradingItemCandidateImpl = selectNextBatchGradingItemCandidate,
    selectNextBatchGradingJobCandidate: selectNextBatchGradingJobCandidateImpl = selectNextBatchGradingJobCandidate,
    touchTransitioningBatchGradingJob: touchTransitioningBatchGradingJobImpl = touchTransitioningBatchGradingJob,
  } = repository;
  const {
    buildBatchGradingSuccessPayload: buildBatchGradingSuccessPayloadImpl = buildBatchGradingSuccessPayload,
    isCancelRequestedStatus: isCancelRequestedStatusImpl = isCancelRequestedStatus,
    isPauseRequestedStatus: isPauseRequestedStatusImpl = isPauseRequestedStatus,
    resolveFinalBatchGradingJobStatus: resolveFinalBatchGradingJobStatusImpl = resolveFinalBatchGradingJobStatus,
  } = runtimeDomain;

  async function claimNextBatchGradingJob() {
    const staleBefore = Date.now() - staleMs;
    const candidate = await selectNextBatchGradingJobCandidateImpl(db, {
      pendingStatus: jobStatus.PENDING,
      runningStatus: jobStatus.RUNNING,
      pausingStatus: jobStatus.PAUSING,
      cancelingStatus: jobStatus.CANCELING,
      staleBefore,
    });

    if (!candidate) return null;
    const recoveringStale = candidate.status === jobStatus.RUNNING;
    if ([jobStatus.PAUSING, jobStatus.CANCELING].includes(candidate.status)) {
      await touchTransitioningBatchGradingJobImpl(db, {
        jobId: candidate.id,
        status: candidate.status,
        now: Date.now(),
      });
      return loadBatchGradingJobRow(candidate.id);
    }

    const now = Date.now();
    const result = await claimBatchGradingJobCandidateImpl(db, {
      jobId: candidate.id,
      runningStatus: jobStatus.RUNNING,
      workerId,
      now,
      pendingStatus: jobStatus.PENDING,
      staleRunningStatus: jobStatus.RUNNING,
      staleBefore,
    });

    if (!result?.changes) {
      if (recoveringStale) {
        recordBatchGradingMetric("recovery_failed", {
          jobId: candidate.id,
          reason: "job_claim_conflict",
        });
      }
      return null;
    }
    if (recoveringStale) {
      recordBatchGradingMetric("recovery_succeeded", {
        jobId: candidate.id,
        reason: "stale_job_claimed",
      });
    }
    return loadBatchGradingJobRow(candidate.id);
  }

  async function claimNextBatchGradingItem(jobId) {
    const staleBefore = Date.now() - staleMs;
    const candidate = await selectNextBatchGradingItemCandidateImpl(db, {
      jobId,
      pendingStatus: itemStatus.PENDING,
      runningStatus: itemStatus.RUNNING,
      staleBefore,
    });

    if (!candidate) return null;
    const recoveringStale = candidate.status === itemStatus.RUNNING;

    const now = Date.now();
    const attempts = Math.max(1, Number(candidate.attempts || 0) + 1);
    const result = await claimBatchGradingItemCandidateImpl(db, {
      itemId: candidate.id,
      runningStatus: itemStatus.RUNNING,
      attempts,
      now,
      pendingStatus: itemStatus.PENDING,
      staleRunningStatus: itemStatus.RUNNING,
      staleBefore,
    });

    if (!result?.changes) {
      if (recoveringStale) {
        recordBatchGradingMetric("recovery_failed", {
          jobId,
          itemId: candidate.id,
          reason: "item_claim_conflict",
        });
      }
      return null;
    }
    if (recoveringStale) {
      recordBatchGradingMetric("recovery_succeeded", {
        jobId,
        itemId: candidate.id,
        reason: "stale_item_claimed",
      });
    }
    return loadBatchGradingItemRowImpl(db, candidate.id);
  }

  async function markBatchGradingHeartbeat(jobId, itemId = "") {
    const now = Date.now();
    await db.prepare("UPDATE batch_grading_jobs SET last_heartbeat_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, jobId);
    if (itemId) {
      await db.prepare("UPDATE batch_grading_items SET last_heartbeat_at = ?, updated_at = ? WHERE id = ?")
        .run(now, now, itemId);
    }
  }

  async function finalizeBatchGradingJob(jobId, fallbackStatus = "") {
    await refreshBatchGradingJobCounters(jobId);
    const row = await loadBatchGradingJobRow(jobId);
    if (!row) return;

    const hasPending = await db.prepare(`
      SELECT 1
      FROM batch_grading_items
      WHERE job_id = ? AND status = ?
      LIMIT 1
    `).get(jobId, itemStatus.PENDING);
    const hasRunning = await db.prepare(`
      SELECT 1
      FROM batch_grading_items
      WHERE job_id = ? AND status = ?
      LIMIT 1
    `).get(jobId, itemStatus.RUNNING);
    const hasCanceled = await db.prepare(`
      SELECT 1
      FROM batch_grading_items
      WHERE job_id = ? AND status IN (?, ?)
      LIMIT 1
    `).get(jobId, itemStatus.CANCELED, legacyCancelledStatus);
    const nextStatus = resolveFinalBatchGradingJobStatusImpl({
      row,
      fallbackStatus,
      hasPending: Boolean(hasPending),
      hasRunning: Boolean(hasRunning),
      hasCanceled: Boolean(hasCanceled),
      jobStatus,
      legacyCancelledStatus,
    });

    await db.prepare(`
      UPDATE batch_grading_jobs
      SET status = ?, updated_at = ?, finished_at = ?, last_heartbeat_at = ?
      WHERE id = ?
    `).run(nextStatus, Date.now(), Date.now(), Date.now(), jobId);
  }

  async function processBatchGradingItem(jobRow, itemRow) {
    const startedAt = Date.now();
    const heartbeat = setInterval(() => {
      void markBatchGradingHeartbeat(jobRow.id, itemRow.id).catch((error) => {
        logError("batch_grading_heartbeat_failed", {
          jobId: jobRow.id,
          itemId: itemRow.id,
          message: error.message,
        });
      });
    }, 4000);
    heartbeat.unref?.();

    try {
      await assertAIBudgetAvailable({
        feature: "grading",
        user: {
          id: jobRow.teacher_id,
          role: "teacher",
          classId: jobRow.class_id || "",
        },
      });
      const quickResult = await runQuickFeedbackGeneration({
        writingId: itemRow.writing_id,
        user: null,
      });
      const writingRow = await loadWritingById(itemRow.writing_id);
      const feedback = parseJson(writingRow?.feedback, {});
      if (quickResult?.status === "failed") {
        const errorCode = classifyBatchGradingFailure({
          message: quickResult.errorMessage || "批量批改失败",
          code: quickResult.errorCode,
        });
        await markBatchGradingItemFailed(itemRow.id, quickResult.errorMessage || "批量批改失败", errorCode);
        recordBatchGradingFailureMetric(errorCode, {
          jobId: jobRow.id,
          itemId: itemRow.id,
          durationMs: Date.now() - startedAt,
        });
        return;
      }
      await markBatchGradingItemSuccess(itemRow.id, buildBatchGradingSuccessPayloadImpl({
        feedback,
        writingId: itemRow.writing_id,
      }));
    } catch (error) {
      const errorCode = classifyBatchGradingFailure(error);
      await markBatchGradingItemFailed(itemRow.id, error.message || "批量批改失败", errorCode);
      recordBatchGradingFailureMetric(errorCode, {
        jobId: jobRow.id,
        itemId: itemRow.id,
        durationMs: Date.now() - startedAt,
      });
    } finally {
      clearInterval(heartbeat);
      await refreshBatchGradingJobCounters(jobRow.id);
    }
  }

  async function processBatchGradingJob(jobRow) {
    // Each lane independently claims-and-processes items in a loop; claiming is
    // DB-row-atomic (see claimBatchGradingItemCandidate), so running several
    // lanes concurrently is safe and turns a fully serial N-item batch into
    // roughly N/itemConcurrency times the single-item latency.
    let stopReason = null;

    async function runLane() {
      while (!stopReason) {
        const freshJob = await loadBatchGradingJobRow(jobRow.id);
        if (!freshJob) {
          stopReason = stopReason || "missing";
          return;
        }
        if (isPauseRequestedStatusImpl(freshJob.status, jobStatus)) {
          stopReason = stopReason || "paused";
          return;
        }
        if (isCancelRequestedStatusImpl(freshJob.status, jobStatus, legacyCancelledStatus)) {
          stopReason = stopReason || "canceled";
          return;
        }

        const itemRow = await claimNextBatchGradingItem(jobRow.id);
        if (!itemRow) {
          stopReason = stopReason || "exhausted";
          return;
        }
        await processBatchGradingItem(freshJob, itemRow);
      }
    }

    const lanes = [];
    for (let i = 0; i < Math.max(1, itemConcurrency); i += 1) {
      lanes.push(runLane());
    }
    await Promise.all(lanes);

    if (stopReason === "paused") {
      await resetRunningItemsForPausedJobImpl(db, {
        jobId: jobRow.id,
        pendingStatus: itemStatus.PENDING,
        now: Date.now(),
        runningStatus: itemStatus.RUNNING,
      });
      await finalizeBatchGradingJob(jobRow.id, jobStatus.PAUSED);
      return;
    }
    if (stopReason === "canceled") {
      await cancelActiveItemsForCanceledJobImpl(db, {
        jobId: jobRow.id,
        canceledStatus: itemStatus.CANCELED,
        now: Date.now(),
        userCanceledCode: itemErrorCode.USER_CANCELED,
        errorMessage: "用户已停止，未继续处理",
        pendingStatus: itemStatus.PENDING,
        runningStatus: itemStatus.RUNNING,
      });
      await finalizeBatchGradingJob(jobRow.id, jobStatus.CANCELED);
      return;
    }
    if (stopReason === "missing") return;
    await finalizeBatchGradingJob(jobRow.id);
  }

  async function processBatchGradingQueue() {
    if (batchGradingActive) return;
    batchGradingActive = true;
    try {
      while (true) {
        const job = await claimNextBatchGradingJob();
        if (!job?.id) break;
        try {
          await processBatchGradingJob(job);
        } catch (error) {
          logError("batch_grading_job_failed", {
            jobId: job.id,
            message: error.message,
          });
          await db.prepare(`
            UPDATE batch_grading_jobs
            SET status = ?, error_message = ?, updated_at = ?, finished_at = ?
            WHERE id = ?
          `).run(
            jobStatus.FAILED,
            error.message || "批量批改任务失败",
            Date.now(),
            Date.now(),
            job.id
          );
        }
      }
    } finally {
      batchGradingActive = false;
    }
  }

  function kickBatchGradingWorker() {
    if (batchGradingWorkerBackoff.shouldSkip()) {
      return;
    }

    void processBatchGradingQueue().then(() => {
      batchGradingWorkerBackoff.recordSuccess();
    }, (error) => {
      const retryAfterMs = batchGradingWorkerBackoff.recordFailure();
      logError("batch_grading_queue_loop_failed", {
        message: error.message,
        retryAfterMs,
      });
    });
  }

  function startBatchGradingWorkerLoop() {
    if (batchGradingWorkerTimer) return;
    batchGradingWorkerTimer = setInterval(() => {
      kickBatchGradingWorker();
    }, pollIntervalMs);
    batchGradingWorkerTimer.unref?.();
    kickBatchGradingWorker();
  }

  function startBatchGradingRecoveryLoop() {
    if (batchGradingRecoveryTimer) return;
    batchGradingRecoveryTimer = setInterval(() => {
      kickBatchGradingWorker();
    }, recoveryIntervalMs);
    batchGradingRecoveryTimer.unref?.();
  }

  function stopBatchGradingLoops() {
    if (batchGradingWorkerTimer) {
      clearInterval(batchGradingWorkerTimer);
      batchGradingWorkerTimer = null;
    }
    if (batchGradingRecoveryTimer) {
      clearInterval(batchGradingRecoveryTimer);
      batchGradingRecoveryTimer = null;
    }
  }

  return {
    kickBatchGradingWorker,
    startBatchGradingWorkerLoop,
    startBatchGradingRecoveryLoop,
    stopBatchGradingLoops,
  };
}
