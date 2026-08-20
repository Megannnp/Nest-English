import { useCallback, useEffect } from 'react';

import { createBatchItemId } from './shared.js';
import { batchGradingAPI } from '../../api/index.js';

function buildRemoteJobBaseItems({ hasLocalItems, localItems, jobItems, mapRemoteStatusToLocalStatus }) {
  if (hasLocalItems) return localItems;
  return (jobItems || []).map((remote) => ({
    localId: createBatchItemId(),
    file: { name: remote.studentName || `作文 ${remote.writingId || ""}` },
    preview: "",
    status: mapRemoteStatusToLocalStatus(remote),
    studentName: remote.studentName || "",
    studentTargetKey: "",
    detectedName: null,
    recognizedText: "",
    feedback: null,
    errorMsg: null,
    writingId: remote.writingId || "",
    writingOwnerId: "",
  }));
}

function buildSucceededFeedback({ item, remote, max }) {
  const currentFeedback = item.feedback || {};
  const remoteListOrCurrent = (key) =>
    Array.isArray(remote[key]) ? remote[key] : (currentFeedback[key] || []);
  const remoteHighlights =
    remote.highlights && typeof remote.highlights === 'object'
      ? remote.highlights
      : (currentFeedback.highlights || {});

  return {
    ...currentFeedback,
    totalScore: remote.totalScore ?? currentFeedback.totalScore,
    maxScore: currentFeedback.maxScore || max,
    tier: remote.tier ?? currentFeedback.tier,
    summary: remote.summary || currentFeedback.summary || "基础反馈已生成",
    categories: remoteListOrCurrent("categories"),
    highlights: remoteHighlights,
    weaknesses: remoteListOrCurrent("weaknesses"),
    mainProblems: remoteListOrCurrent("mainProblems"),
    improvements: remoteListOrCurrent("improvements"),
    nextActions: remoteListOrCurrent("nextActions"),
    writingType: remote.writingType || currentFeedback.writingType,
  };
}

function buildRemoteErrorPatch({ item, localStatus, remote, fallbackMessage }) {
  return {
    ...item,
    status: localStatus,
    errorMsg: remote.errorMessage || fallbackMessage,
  };
}

function mergeRemoteItemIntoLocal({ item, remote, mapRemoteStatusToLocalStatus, max }) {
  if (!remote) return item;

  const localStatus = mapRemoteStatusToLocalStatus(remote, item.status);

  if (remote.status === "running" || remote.status === "pending") {
    return { ...item, status: localStatus, errorMsg: null };
  }
  if (remote.status === "succeeded") {
    return {
      ...item,
      status: "done",
      errorMsg: null,
      feedback: buildSucceededFeedback({ item, remote, max }),
    };
  }
  if (remote.status === "failed") {
    return buildRemoteErrorPatch({ item, localStatus, remote, fallbackMessage: "批量批改失败" });
  }
  if (remote.status === "canceled" || remote.status === "cancelled") {
    return buildRemoteErrorPatch({ item, localStatus, remote, fallbackMessage: "用户已停止，未继续处理" });
  }
  return item;
}

function patchItemsErrorMessage({ items, statuses, message }) {
  return items.map((item) =>
    statuses.includes(item.status)
      ? { ...item, errorMsg: message }
      : item
  );
}

function buildBatchItemsFromSnapshot({ snapshot, itemsRef, createBoundWritingForItem, updateItem }) {
  return snapshot.reduce(async (promise, _, index) => {
    const batchItems = await promise;
    const currentItem = itemsRef.current[index];
    if (currentItem?.status === "done") return batchItems;
    const writingId = currentItem?.writingId || (await createBoundWritingForItem(index));
    if (!writingId) throw new Error("作文记录保存失败");
    batchItems.push({
      writingId,
      studentName: currentItem?.studentName || currentItem?.detectedName || "",
    });
    updateItem(index, { status: "confirmed", errorMsg: null, writingId });
    return batchItems;
  }, Promise.resolve([]));
}

function applyPatchedErrorToItems({ setItems, itemsRef, statuses, message }) {
  setItems((prev) => {
    const next = patchItemsErrorMessage({
      items: prev,
      statuses,
      message,
    });
    itemsRef.current = next;
    return next;
  });
}

/**
 * @typedef {Object} BatchGradingJobDTO
 * @property {string} [id]
 * @property {string} [classId]
 * @property {string} [assignmentId]
 * @property {string} [status]
 * @property {Array<{
 *   writingId?: string,
 *   studentName?: string,
 *   status?: string,
 *   totalScore?: number | null,
 *   summary?: string,
 *   errorMessage?: string,
 * }>} [items]
 */

/**
 * @param {{
 *   currentJobId: string,
 *   itemsRef: { current: Array<any> },
 *   max: number,
  *   pauseRef: { current: boolean },
  *   phase: string,
 *   recentJobsFilter: string,
 *   runGradingFallback: { abortRef: { current: boolean } },
 *   selectedAssignment: Record<string, any> | null | undefined,
 *   selectedAssignmentId: string,
 *   selectedClassId: string,
 *   selectedQId: string,
 *   sessionController: {
 *     setJobIdentity: (jobId: string, jobStatus?: string) => void,
 *     syncFromRemoteJob: (jobStatus: string) => void,
 *     markRunStarting: () => void,
 *     markRunFailedBackToConfirm: () => void,
 *     markRunFinished: () => void,
 *     markLocalCancelWithoutJob: () => void,
 *   },
 *   setItems: (value: any) => void,
 *   updateItem: (index: number, patch: Record<string, any>) => void,
 *   user: { role?: string },
 *   createBoundWritingForItem: (index: number) => Promise<string>,
 *   mapRemoteStatusToLocalStatus: (remote: Record<string, any>, currentStatus?: string) => string,
 *   loadRecentBatchJobsState: {
 *     recentJobsFilter: string,
 *     setRecentJobs: (jobs: BatchGradingJobDTO[]) => void,
 *     setRecentJobsLoading: (value: boolean) => void,
 *     setSelectedAssignmentId: (value: string) => void,
 *     setSelectedClassId: (value: string) => void,
 *   },
 * }} params
 */
export function useBatchGradingJobRuntime({
  currentJobId,
  itemsRef,
  max,
  pauseRef,
  phase,
  recentJobsFilter,
  runGradingFallback,
  selectedAssignment,
  selectedAssignmentId,
  selectedClassId,
  selectedQId,
  sessionController,
  setItems,
  updateItem,
  user,
  createBoundWritingForItem,
  mapRemoteStatusToLocalStatus,
  loadRecentBatchJobsState,
}) {
  const {
    setRecentJobs,
    setRecentJobsLoading,
    setSelectedAssignmentId,
    setSelectedClassId,
  } = loadRecentBatchJobsState;

  const loadRecentBatchJobs = useCallback(
    async (nextFilter = recentJobsFilter) => {
      if (user.role !== 'teacher') return [];
      setRecentJobsLoading(true);
      try {
        const jobs = await batchGradingAPI.listJobs({
          limit: 8,
          filter: nextFilter,
          classId: selectedClassId,
          assignmentId: selectedAssignmentId,
        });
        const normalizedJobs = Array.isArray(jobs) ? jobs : [];
        setRecentJobs(normalizedJobs);
        return normalizedJobs;
      } catch {
        setRecentJobs([]);
        return [];
      } finally {
        setRecentJobsLoading(false);
      }
    },
    [
      recentJobsFilter,
      selectedAssignmentId,
      selectedClassId,
      setRecentJobs,
      setRecentJobsLoading,
      user.role,
    ]
  );

  useEffect(() => {
    if (user.role !== 'teacher') return;
    void loadRecentBatchJobs();
  }, [loadRecentBatchJobs, recentJobsFilter, selectedAssignmentId, selectedClassId, user.role]);

  const applyBatchJobSnapshot = useCallback(
    /**
     * @param {BatchGradingJobDTO | null | undefined} job
     */
    (job) => {
      if (!job?.id) return;
      sessionController.setJobIdentity(job.id, job.status || "");
      const itemByWritingId = new Map((job.items || []).map((item) => [String(item.writingId), item]));

      setItems((prev) => {
        const hasLocalItems = prev.some((item) => item.writingId && itemByWritingId.has(String(item.writingId)));
        const baseItems = buildRemoteJobBaseItems({
          hasLocalItems,
          localItems: prev,
          jobItems: job.items,
          mapRemoteStatusToLocalStatus,
        });

        const next = baseItems.map((item) => {
          const remote = item.writingId ? itemByWritingId.get(String(item.writingId)) : null;
          return mergeRemoteItemIntoLocal({
            item,
            remote,
            mapRemoteStatusToLocalStatus,
            max,
          });
        });

        itemsRef.current = next;
        return next;
      });

      setSelectedClassId(job.classId || "");
      setSelectedAssignmentId(job.assignmentId || "");
      pauseRef.current = job.status === "paused";
      sessionController.syncFromRemoteJob(job.status || "");
    },
    [
      itemsRef,
      mapRemoteStatusToLocalStatus,
      max,
      pauseRef,
      setItems,
      setSelectedAssignmentId,
      setSelectedClassId,
      sessionController,
    ]
  );

  const attachBatchJob = useCallback(
    async (jobId) => {
      if (!jobId) return;
      const job = await batchGradingAPI.getJob(jobId);
      applyBatchJobSnapshot(job);
    },
    [applyBatchJobSnapshot]
  );

  const runGrading = useCallback(
    async (overrideItems) => {
      sessionController.markRunStarting();
      runGradingFallback.abortRef.current = false;
      pauseRef.current = false;
      const snapshot = overrideItems || itemsRef.current;

      if (user.role === "teacher") {
        const unconfirmedCount = snapshot.filter((item) => item.status !== "confirmed" && item.status !== "done").length;
        if (unconfirmedCount > 0) {
          sessionController.markRunFailedBackToConfirm();
          return;
        }
      }

      try {
        const batchItems = await buildBatchItemsFromSnapshot({
          snapshot,
          itemsRef,
          createBoundWritingForItem,
          updateItem,
        });

        if (!batchItems.length) {
          sessionController.markRunFinished();
          return;
        }

        const job = await batchGradingAPI.createJob({
          classId: selectedClassId,
          assignmentId: selectedAssignmentId,
          questionId: selectedQId || selectedAssignment?.questionId || "",
          items: batchItems,
        });
        sessionController.setJobIdentity(job.id, job.status || "");
        applyBatchJobSnapshot(job);
        void loadRecentBatchJobs();
      } catch (error) {
        sessionController.markRunFailedBackToConfirm();
        const firstPendingIndex = itemsRef.current.findIndex((item) => item.status !== "done");
        if (firstPendingIndex >= 0) {
          updateItem(firstPendingIndex, {
            status: "error",
            errorMsg: error.message || "批量批改任务创建失败",
          });
        }
      }
    },
    [
      applyBatchJobSnapshot,
      createBoundWritingForItem,
      itemsRef,
      loadRecentBatchJobs,
      pauseRef,
      selectedAssignment,
      selectedAssignmentId,
      selectedClassId,
      selectedQId,
      sessionController,
      updateItem,
      user.role,
      runGradingFallback.abortRef,
    ]
  );

  const wrapRemoteJobAction = useCallback(
    async ({ request, fallbackStatuses, onMissingJobId }) => {
      if (!currentJobId) {
        onMissingJobId?.();
        return;
      }

      try {
        const job = await request(currentJobId);
        applyBatchJobSnapshot(job);
        void loadRecentBatchJobs();
      } catch (error) {
        setItems((prev) => {
          const next = patchItemsErrorMessage({
            items: prev,
            statuses: fallbackStatuses,
            message: error.message || "批量批改操作失败，请稍后再试",
          });
          itemsRef.current = next;
          return next;
        });
      }
    },
    [applyBatchJobSnapshot, currentJobId, itemsRef, loadRecentBatchJobs, setItems]
  );

  const pauseBatchJob = useCallback(
    async () =>
      wrapRemoteJobAction({
        request: batchGradingAPI.pauseJob,
        fallbackStatuses: ["grading"],
      }),
    [wrapRemoteJobAction]
  );

  const resumeBatchJob = useCallback(
    async () =>
      wrapRemoteJobAction({
        request: batchGradingAPI.resumeJob,
        fallbackStatuses: ["confirmed"],
      }),
    [wrapRemoteJobAction]
  );

  const cancelBatchJob = useCallback(async () => {
    if (!currentJobId) {
      runGradingFallback.abortRef.current = true;
      sessionController.markLocalCancelWithoutJob();
      return;
    }
    runGradingFallback.abortRef.current = true;
    await wrapRemoteJobAction({
      request: batchGradingAPI.cancelJob,
      fallbackStatuses: ["grading"],
      onMissingJobId: undefined,
    });
  }, [currentJobId, sessionController, wrapRemoteJobAction, runGradingFallback.abortRef]);

  const retryFailedBatchJob = useCallback(async () => {
    if (!currentJobId) return runGrading(itemsRef.current);
    sessionController.markRunStarting();
    try {
      const job = await batchGradingAPI.retryFailed(currentJobId);
      applyBatchJobSnapshot(job);
      void loadRecentBatchJobs();
    } catch (error) {
      sessionController.markRunFinished();
      applyPatchedErrorToItems({
        setItems,
        itemsRef,
        statuses: ["error"],
        message: error.message || "重试失败，请稍后再试",
      });
    }
  }, [applyBatchJobSnapshot, currentJobId, itemsRef, loadRecentBatchJobs, runGrading, sessionController, setItems]);

  const continueIncompleteBatchJob = useCallback(async () => {
    if (!currentJobId) return runGrading(itemsRef.current);
    sessionController.markRunStarting();
    try {
      const job = await batchGradingAPI.continueIncomplete(currentJobId);
      applyBatchJobSnapshot(job);
      void loadRecentBatchJobs();
    } catch (error) {
      sessionController.markRunFinished();
      applyPatchedErrorToItems({
        setItems,
        itemsRef,
        statuses: ["confirmed", "canceled", "grading"],
        message: error.message || "继续未完成项失败，请稍后再试",
      });
    }
  }, [applyBatchJobSnapshot, currentJobId, itemsRef, loadRecentBatchJobs, runGrading, sessionController, setItems]);

  useEffect(() => {
    if (!currentJobId || phase !== "grading") return undefined;
    let disposed = false;
    const load = async () => {
      try {
        const job = await batchGradingAPI.getJob(currentJobId);
        if (!disposed) applyBatchJobSnapshot(job);
      } catch {
        // Keep the current UI state and retry on the next polling cycle.
      }
    };
    const timer = window.setInterval(load, 1800);
    void load();
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [applyBatchJobSnapshot, currentJobId, phase]);

  return {
    loadRecentBatchJobs,
    applyBatchJobSnapshot,
    attachBatchJob,
    runGrading,
    pauseBatchJob,
    resumeBatchJob,
    cancelBatchJob,
    retryFailedBatchJob,
    continueIncompleteBatchJob,
  };
}
