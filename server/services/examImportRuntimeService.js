// 高考英语试卷批量导入「后台 Worker 运行时」。
//
// 复用 batchGradingRuntimeService 的轮询/领单/心跳/恢复模式：
//   - claimNextExamImportJob：从 pending/running 队列领取任务（含陈旧恢复）
//   - claimNextExamImportItem：领取单个文件处理权（行级原子，避免多实例重复处理）
//   - processExamImportItem：调用 parsePaper() 解析 + 将结果写入 result 字段
//   - finalizeExamImportJob：全部 item 结束后刷新计数并落最终状态
// 处理是并行的（itemConcurrency 条 lane），textutil 转换时并发不会互相阻塞。
import fs from 'node:fs/promises';

import { createWorkerLoopBackoff } from './workerLoopBackoff.js';
import { parsePaper, validateParseResult } from '../scripts/parse-gaokao-paper.mjs';

export function createExamImportRuntime({
  db,
  repository,
  constants,
  logError,
  parsePaperImpl = parsePaper,
  persistPaperResultImpl = null,
  heartbeatIntervalMs = 4000,
}) {
  const {
    jobStatus,
    itemStatus,
    workerId,
    pollIntervalMs,
    recoveryIntervalMs,
    staleMs,
    itemConcurrency = 2,
  } = constants;

  let workerTimer = null;
  let recoveryTimer = null;
  let queueActive = false;
  const backoff = createWorkerLoopBackoff({
    baseDelayMs: pollIntervalMs,
    maxDelayMs: recoveryIntervalMs,
  });

  async function claimNextExamImportJob() {
    const staleBefore = Date.now() - staleMs;
    const candidate = await repository.selectNextJobCandidate({ staleBefore });

    if (!candidate) return null;
    if (candidate.status === jobStatus.RUNNING) {
      // 陈旧任务恢复：尝试原子抢占，失败则留给其他实例
      const claimed = await repository.claimJobCandidate({
        jobId: candidate.id,
        workerId,
        now: Date.now(),
        staleBefore,
        expectedStatuses: [jobStatus.RUNNING],
        nextStatus: jobStatus.RUNNING,
      });
      if (!claimed?.changes) return null;
      return repository.loadJobRow(candidate.id);
    }
    if (candidate.status === jobStatus.PENDING) {
      const claimed = await repository.claimJobCandidate({
        jobId: candidate.id,
        workerId,
        now: Date.now(),
        staleBefore,
        expectedStatuses: [jobStatus.PENDING],
        nextStatus: jobStatus.RUNNING,
      });
      if (!claimed?.changes) return null;
      return repository.loadJobRow(candidate.id);
    }
    return null;
  }

  async function claimNextExamImportItem(jobId) {
    const staleBefore = Date.now() - staleMs;
    const candidate = await repository.selectNextItemCandidate({ jobId, staleBefore });
    if (!candidate) return null;
    const attempts = Math.max(1, Number(candidate.attempts || 0) + 1);
    const claimed = await repository.claimItemCandidate({
      itemId: candidate.id,
      attempts,
      now: Date.now(),
      staleBefore,
    });
    if (!claimed?.changes) return null;
    return repository.loadItemRow(candidate.id);
  }

  async function markHeartbeat(jobId, itemId = '') {
    const now = Date.now();
    await db.prepare(`
      UPDATE exam_import_jobs SET last_heartbeat_at = ?, updated_at = ? WHERE id = ?
    `).run(now, now, jobId);
    if (itemId) {
      await db.prepare(`
        UPDATE exam_import_items SET last_heartbeat_at = ?, updated_at = ? WHERE id = ?
      `).run(now, now, itemId);
    }
  }

  async function refreshCounters(jobId) {
    const rows = await repository.loadItemRows(jobId);
    const processed = rows.filter((r) => r.status === itemStatus.SUCCEEDED || r.status === itemStatus.FAILED).length;
    const succeeded = rows.filter((r) => r.status === itemStatus.SUCCEEDED).length;
    const failed = rows.filter((r) => r.status === itemStatus.FAILED).length;
    await db.prepare(`
      UPDATE exam_import_jobs
      SET processed_count = ?, success_count = ?, failed_count = ?, updated_at = ?
      WHERE id = ?
    `).run(processed, succeeded, failed, Date.now(), jobId);
  }

  async function finalizeJob(jobId) {
    await refreshCounters(jobId);
    const row = await repository.loadJobRow(jobId);
    if (!row) return;

    const items = await repository.loadItemRows(jobId);
    const hasPending = items.some((r) => r.status === itemStatus.PENDING);
    const hasRunning = items.some((r) => r.status === itemStatus.RUNNING);
    let nextStatus = jobStatus.COMPLETED;
    if (hasPending || hasRunning) {
      nextStatus = jobStatus.FAILED;
    } else if (Number(row.failed_count || 0) > 0 && Number(row.success_count || 0) > 0) {
      nextStatus = jobStatus.PARTIAL_FAILED;
    } else if (Number(row.failed_count || 0) > 0) {
      nextStatus = jobStatus.FAILED;
    }

    await db.prepare(`
      UPDATE exam_import_jobs
      SET status = ?, updated_at = ?, finished_at = ?, last_heartbeat_at = ?
      WHERE id = ?
    `).run(nextStatus, Date.now(), Date.now(), Date.now(), jobId);
  }

  // eslint-disable-next-line complexity -- 解析分支较多（成功/无分区/无题目/异常）
  async function processExamImportItem(jobRow, itemRow) {
    const heartbeat = setInterval(() => {
      void markHeartbeat(jobRow.id, itemRow.id).catch((error) => {
        logError('exam_import_heartbeat_failed', {
          jobId: jobRow.id,
          itemId: itemRow.id,
          message: error.message,
        });
      });
    }, heartbeatIntervalMs);
    heartbeat.unref?.();

    try {
      let result;
      try {
        result = await parsePaperImpl({
          originalPath: itemRow.file_path,
          answerPath: itemRow.answer_file_path || undefined,
          year: itemRow.year || '',
          region: itemRow.region || '',
          paper: itemRow.paper || '',
        });
      } catch (error) {
        await markItemFailed(itemRow.id, `解析失败：${error.message || '未知错误'}`);
        return;
      }

      if (!result.modules.length) {
        await markItemFailed(itemRow.id, '未能识别试卷题型分区，请检查文件是否为高考英语真题原卷');
        return;
      }
      if (!result.questionCount) {
        await markItemFailed(itemRow.id, '解析成功但未提取到题目，请检查文件格式');
        return;
      }

      // 答案合法性校验门禁：题型与答案类型必须匹配（如选择题答案必须是单个 A-G 字母），
      // 防止脏答案（如语法填空单词混入听力/阅读）写入正式题库。
      const validation = result.validation || validateParseResult(result);
      if (validation.invalid > 0) {
        const examples = validation.issues
          .slice(0, 5)
          .map((issue) => `${issue.module}#${issue.number}=${issue.answer}`)
          .join('，');
        await markItemFailed(
          itemRow.id,
          `解析结果存在 ${validation.invalid} 道答案类型异常（如选择题答案非 A-G）：${examples}。已阻止入库，请检查答案文件格式或人工复核`
        );
        return;
      }

      // 阶段一：极速入库 → 解析结构写入正式题库（sources/materials/questions/模块详情）
      let persistence = null;
      if (persistPaperResultImpl) {
        try {
          persistence = await persistPaperResultImpl({
            paperResult: result,
            year: itemRow.year || '',
            region: itemRow.region || '',
            paper: itemRow.paper || '',
            fileName: itemRow.file_name || '',
          });
        } catch (error) {
          await markItemFailed(itemRow.id, `解析成功但入库失败：${error.message || '未知错误'}`);
          return;
        }
      }

      const now = Date.now();
      await db.prepare(`
        UPDATE exam_import_items
        SET status = ?, result = ?, error_code = '', error_message = NULL, updated_at = ?, finished_at = ?, last_heartbeat_at = ?
        WHERE id = ?
      `).run(
        itemStatus.SUCCEEDED,
        JSON.stringify({
          source: result.source || { year: itemRow.year || '', region: itemRow.region || '', paper: itemRow.paper || '' },
          questionCount: result.questionCount || 0,
          answerCount: result.answerCount || 0,
          warnings: result.warnings || [],
          modules: result.modules.map((m) => ({
            module: m.module,
            questions: (m.questions || []).length,
            materials: (m.materials || []).length,
          })),
          persistence,
        }),
        now,
        now,
        now,
        itemRow.id
      );
    } catch (error) {
      await markItemFailed(itemRow.id, `处理失败：${error.message || '未知错误'}`);
    } finally {
      clearInterval(heartbeat);
      await refreshCounters(jobRow.id);
    }
  }

  async function markItemFailed(itemId, message) {
    const now = Date.now();
    await db.prepare(`
      UPDATE exam_import_items
      SET status = ?, error_code = ?, error_message = ?, updated_at = ?, finished_at = ?, last_heartbeat_at = ?
      WHERE id = ?
    `).run(
      itemStatus.FAILED,
      'parse_error',
      String(message || '解析失败').slice(0, 500),
      now,
      now,
      now,
      itemId
    );
  }

  async function processJob(jobRow) {
    let stopReason = null;

    async function runLane() {
      while (!stopReason) {
        const freshJob = await repository.loadJobRow(jobRow.id);
        if (!freshJob) {
          stopReason = stopReason || 'missing';
          return;
        }
        if (freshJob.status === jobStatus.FAILED) {
          stopReason = stopReason || 'failed';
          return;
        }
        const itemRow = await claimNextExamImportItem(jobRow.id);
        if (!itemRow) {
          stopReason = stopReason || 'exhausted';
          return;
        }
        await processExamImportItem(freshJob, itemRow);
      }
    }

    const lanes = [];
    for (let i = 0; i < Math.max(1, itemConcurrency); i += 1) {
      lanes.push(runLane());
    }
    await Promise.all(lanes);

    if (stopReason === 'missing') return;
    await finalizeJob(jobRow.id);
  }

  async function processQueue() {
    if (queueActive) return;
    queueActive = true;
    try {
      while (true) {
        const job = await claimNextExamImportJob();
        if (!job?.id) break;
        try {
          await processJob(job);
        } catch (error) {
          logError('exam_import_job_failed', {
            jobId: job.id,
            message: error.message,
          });
          await db.prepare(`
            UPDATE exam_import_jobs
            SET status = ?, error_message = ?, updated_at = ?, finished_at = ?
            WHERE id = ?
          `).run(
            jobStatus.FAILED,
            String(error.message || '试卷导入任务失败').slice(0, 500),
            Date.now(),
            Date.now(),
            job.id
          );
        }
      }
    } finally {
      queueActive = false;
    }
  }

  function kickWorker() {
    if (backoff.shouldSkip()) return;
    void processQueue().then(() => {
      backoff.recordSuccess();
    }, (error) => {
      backoff.recordFailure();
      logError('exam_import_queue_loop_failed', {
        message: error.message,
      });
    });
  }

  function startWorkerLoop() {
    if (workerTimer) return;
    workerTimer = setInterval(() => kickWorker(), pollIntervalMs);
    workerTimer.unref?.();
    kickWorker();
  }

  function startRecoveryLoop() {
    if (recoveryTimer) return;
    recoveryTimer = setInterval(() => kickWorker(), recoveryIntervalMs);
    recoveryTimer.unref?.();
  }

  function stopLoops() {
    if (workerTimer) {
      clearInterval(workerTimer);
      workerTimer = null;
    }
    if (recoveryTimer) {
      clearInterval(recoveryTimer);
      recoveryTimer = null;
    }
  }

  return {
    kickWorker,
    startWorkerLoop,
    startRecoveryLoop,
    stopLoops,
  };
}

// 提供给 Worker 启动时读取文件并清理落盘文件的辅助函数
export async function cleanupExamImportJobDir(jobDir) {
  await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
}