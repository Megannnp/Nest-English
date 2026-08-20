// 高考英语试卷批量导入主服务。
// 组装 Job 创建、进度查询、后台 Worker 运行时：
//   - createExamImportJob：上传文件 → 落盘 → 创建 job + items → 唤醒 worker → 返回任务
//   - getExamImportJob / listExamImportJobs：进度查询
//   - 启动/停止 Worker 轮询循环
import { createExamImportJobCreator, createExamImportQueryService } from './examImportJobCreationService.js';
import { createExamImportPersistence } from './examImportPersistenceService.js';
import { createExamImportRepository } from './examImportRepository.js';
import { createExamImportRuntime } from './examImportRuntimeService.js';
import db from '../db/database.js';
import { logError } from '../utils/logger.js';

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

const EXAM_IMPORT_WORKER_ID = 'exam_import_worker';
const EXAM_IMPORT_POLL_INTERVAL_MS = 1500;
const EXAM_IMPORT_RECOVERY_INTERVAL_MS = 30000;
const EXAM_IMPORT_STALE_MS = 2 * 60 * 1000;
// 每份试卷需要 textutil 子进程转换，CPU 密集且单线程 Node 下避免并发过高。
const EXAM_IMPORT_ITEM_CONCURRENCY = 2;

const createExamImportJob = createExamImportJobCreator({ dbDependency: db });
const examImportQuery = createExamImportQueryService({ dbDependency: db });
const examImportRepository = createExamImportRepository({ dbDependency: db });
const examImportPersistence = createExamImportPersistence({ dbDependency: db });
const examImportRuntime = createExamImportRuntime({
  db,
  repository: examImportRepository,
  constants: {
    jobStatus: EXAM_IMPORT_JOB_STATUS,
    itemStatus: EXAM_IMPORT_ITEM_STATUS,
    workerId: EXAM_IMPORT_WORKER_ID,
    pollIntervalMs: EXAM_IMPORT_POLL_INTERVAL_MS,
    recoveryIntervalMs: EXAM_IMPORT_RECOVERY_INTERVAL_MS,
    staleMs: EXAM_IMPORT_STALE_MS,
    itemConcurrency: EXAM_IMPORT_ITEM_CONCURRENCY,
  },
  persistPaperResultImpl: examImportPersistence.persistPaperResult,
  logError,
});

export function kickExamImportWorker() {
  examImportRuntime.kickWorker();
}

export function startExamImportWorkerLoop() {
  examImportRuntime.startWorkerLoop();
}

export function startExamImportRecoveryLoop() {
  examImportRuntime.startRecoveryLoop();
}

export function stopExamImportLoops() {
  examImportRuntime.stopLoops();
}

export async function createExamImportJobEntry({ user, files, answerFiles, years, regions, papers }) {
  const { id, totalCount } = await createExamImportJob({
    user,
    files,
    answerFiles,
    years,
    regions,
    papers,
  });
  kickExamImportWorker();
  return {
    id,
    totalCount,
    status: EXAM_IMPORT_JOB_STATUS.PENDING,
  };
}

export async function getExamImportJobEntry({ uploaderId, jobId }) {
  return examImportQuery.getJob({ uploaderId, jobId });
}

export async function listExamImportJobEntries({ uploaderId, limit }) {
  return examImportQuery.listJobs({ uploaderId, limit });
}