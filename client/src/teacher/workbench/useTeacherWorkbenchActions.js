import { useCallback, useRef } from "react";

import {
  buildAssignmentPayload,
  getSelectedClassIds,
  getTypeMixTotal,
  validateAssignmentForm,
} from "./assignmentActionHelpers.js";
import { exportAssignmentPdf } from "./assignmentPdfExport.js";
import { normalizeAssignmentId } from "./modelHelpers.js";
import { assignmentsAPI } from "../../api/index.js";

function normalizeClassSelection(classIds = []) {
  return Array.from(new Set((Array.isArray(classIds) ? classIds : []).filter(Boolean).map(String))).sort();
}

function resolveAssignmentClassIds(assignmentForm, assignmentDetail) {
  const selectedClassIds = getSelectedClassIds(assignmentForm);
  const originalClassId = String(
    assignmentForm.classId
    || selectedClassIds[0]
    || assignmentDetail?.assignment?.classId
    || ""
  );

  return { selectedClassIds, originalClassId };
}

function validateTypeMix(assignmentForm) {
  const mixTotal = getTypeMixTotal(assignmentForm.selectedTypeMix || []);
  if ((assignmentForm.selectedTypeMix || []).length > 0 && mixTotal !== 100) {
    return "题型占比总和需要等于 100%";
  }
  return "";
}

function hasLockedClassSelectionChange(assignmentDetail, selectedClassIds) {
  const currentStatus = String(assignmentDetail?.assignment?.status || "");
  const originalClassIds = normalizeClassSelection(
    Array.isArray(assignmentDetail?.assignment?.classIds) && assignmentDetail.assignment.classIds.length
      ? assignmentDetail.assignment.classIds
      : (assignmentDetail?.assignment?.classId ? [assignmentDetail.assignment.classId] : [])
  );
  const editedClassIds = normalizeClassSelection(selectedClassIds);

  return (
    (currentStatus === "published" || currentStatus === "closed")
    && JSON.stringify(originalClassIds) !== JSON.stringify(editedClassIds)
  );
}

function buildSaveDraftMessage(status) {
  if (status === "closed" || status === "published") {
    return "任务已更新";
  }
  return "草稿已更新";
}

function buildSaveDraftRequest(assignmentForm, assignmentDetail, selectedClassIds, originalClassId) {
  return buildAssignmentPayload(assignmentForm, {
    classId: originalClassId || undefined,
    classIds: selectedClassIds,
    selectedThemes: assignmentDetail?.assignment?.selectedThemes || [],
    maxScore: Number(assignmentForm.maxScore || assignmentDetail?.assignment?.maxScore || 15),
  });
}

export default function useTeacherWorkbenchActions({
  assignmentDetail,
  assignmentForm,
  clearAssignmentSelection,
  loadWorkbench,
  onOpenWriting,
  onReturnToWorkbench,
  selectedAssignmentId,
  setActionLoading,
  setActionMessage,
}) {
  // Track the pending clear-timer so rapid successive calls don't stack up
  // multiple timers that all try to wipe the message at different times.
  const actionMessageTimerRef = useRef(null);

  const showActionMessage = useCallback((message, duration = 3000) => {
    if (actionMessageTimerRef.current !== null) {
      window.clearTimeout(actionMessageTimerRef.current);
    }
    setActionMessage(message);
    actionMessageTimerRef.current = window.setTimeout(() => {
      actionMessageTimerRef.current = null;
      setActionMessage("");
    }, duration);
  }, [setActionMessage]);

  const runAssignmentAction = useCallback(async (runner, successMessage, assignmentId = selectedAssignmentId, options = {}) => {
    const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
    if (!normalizedAssignmentId) return;
    const { preserveSelection = true, afterSuccess = null } = options;
    try {
      setActionLoading(true);
      await runner();
      await loadWorkbench(preserveSelection ? normalizedAssignmentId : "");
      if (!preserveSelection) {
        clearAssignmentSelection({ keepActionMessage: true });
      }
      afterSuccess?.();
      showActionMessage(successMessage);
    } catch (err) {
      setActionMessage(err?.message || "操作失败，请稍后再试");
    } finally {
      setActionLoading(false);
    }
  }, [
    clearAssignmentSelection,
    loadWorkbench,
    selectedAssignmentId,
    setActionLoading,
    setActionMessage,
    showActionMessage,
  ]);

  const handleSaveDraft = useCallback((assignmentId = selectedAssignmentId) => {
    const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
    if (!normalizedAssignmentId) {
      setActionMessage("未找到可保存的任务，请先重新打开任务详情");
      return;
    }
    const { selectedClassIds, originalClassId } = resolveAssignmentClassIds(assignmentForm, assignmentDetail);
    const mixValidationMessage = validateTypeMix(assignmentForm);
    if (mixValidationMessage) {
      setActionMessage(mixValidationMessage);
      return;
    }
    if (hasLockedClassSelectionChange(assignmentDetail, selectedClassIds)) {
      setActionMessage("已发布或已关闭任务暂不支持更换班级，如需调整请新建任务");
      return;
    }
    const successMessage = buildSaveDraftMessage(assignmentDetail?.assignment?.status);
    const payload = buildSaveDraftRequest(assignmentForm, assignmentDetail, selectedClassIds, originalClassId);

    return runAssignmentAction(
      () => assignmentsAPI.update(normalizedAssignmentId, payload),
      successMessage,
      normalizedAssignmentId
    );
  }, [
    assignmentDetail,
    assignmentForm,
    runAssignmentAction,
    selectedAssignmentId,
    setActionMessage,
  ]);

  const handleCreateDraft = useCallback(async () => {
    const selectedClassIds = getSelectedClassIds(assignmentForm);
    const validationMessage = validateAssignmentForm(assignmentForm);
    if (validationMessage) {
      setActionMessage(validationMessage);
      return;
    }
    try {
      setActionLoading(true);
      const results = [];
      for (const classId of selectedClassIds) {
        const result = await assignmentsAPI.create(buildAssignmentPayload(assignmentForm, {
          classId,
          classIds: [classId],
        }));
        results.push(result);
      }
      const createdId = results[0]?.assignment?.id || "";
      await loadWorkbench(createdId);
      showActionMessage(
        selectedClassIds.length > 1
          ? `已为 ${selectedClassIds.length} 个班级创建草稿`
          : "草稿已创建"
      );
    } catch (err) {
      setActionMessage(err?.message || "创建草稿失败，请稍后再试");
    } finally {
      setActionLoading(false);
    }
  }, [
    assignmentForm,
    loadWorkbench,
    setActionLoading,
    setActionMessage,
    showActionMessage,
  ]);

  const handleCreateAndPublish = useCallback(async () => {
    const selectedClassIds = getSelectedClassIds(assignmentForm);
    const validationMessage = validateAssignmentForm(assignmentForm);
    if (validationMessage) {
      setActionMessage(validationMessage);
      return;
    }
    try {
      setActionLoading(true);
      for (const classId of selectedClassIds) {
        const result = await assignmentsAPI.create(buildAssignmentPayload(assignmentForm, {
          classId,
          classIds: [classId],
        }));
        const assignmentId = result?.assignment?.id || "";
        if (assignmentId) await assignmentsAPI.publish(assignmentId);
      }
      await loadWorkbench("");
      clearAssignmentSelection({ keepActionMessage: true });
      onReturnToWorkbench?.();
      showActionMessage(
        selectedClassIds.length > 1
          ? `已为 ${selectedClassIds.length} 个班级发布任务`
          : "任务已发布"
      );
    } catch (err) {
      setActionMessage(err?.message || "发布任务失败，请稍后再试");
    } finally {
      setActionLoading(false);
    }
  }, [
    assignmentForm,
    clearAssignmentSelection,
    loadWorkbench,
    onReturnToWorkbench,
    setActionLoading,
    setActionMessage,
    showActionMessage,
  ]);

  const handlePublish = useCallback((assignmentId = selectedAssignmentId) => {
    const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
    return runAssignmentAction(
      () => assignmentsAPI.publish(normalizedAssignmentId),
      "作业已发布",
      normalizedAssignmentId,
      { preserveSelection: false, afterSuccess: () => onReturnToWorkbench?.() }
    );
  }, [onReturnToWorkbench, runAssignmentAction, selectedAssignmentId]);

  const handleClose = useCallback((assignmentId = selectedAssignmentId) => {
    const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
    return runAssignmentAction(
      () => assignmentsAPI.close(normalizedAssignmentId),
      "作业已关闭",
      normalizedAssignmentId,
      { preserveSelection: false, afterSuccess: () => onReturnToWorkbench?.() }
    );
  }, [onReturnToWorkbench, runAssignmentAction, selectedAssignmentId]);

  const handleArchive = useCallback((assignmentId = selectedAssignmentId) => {
    const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
    return runAssignmentAction(
      () => assignmentsAPI.archive(normalizedAssignmentId),
      "作业已归档",
      normalizedAssignmentId
    );
  }, [runAssignmentAction, selectedAssignmentId]);

  const handleExport = useCallback(async (assignmentIdOrType = selectedAssignmentId, type = "detail") => {
    const isTypeOnlyCall = assignmentIdOrType === "detail" || assignmentIdOrType === "summary";
    const normalizedAssignmentId = isTypeOnlyCall
      ? selectedAssignmentId
      : (normalizeAssignmentId(assignmentIdOrType) || selectedAssignmentId);
    const exportType = isTypeOnlyCall ? assignmentIdOrType : type;
    if (!normalizedAssignmentId) return;
    try {
      setActionLoading(true);
      const result = await assignmentsAPI.export(normalizedAssignmentId, exportType);
      showActionMessage(`${result?.filename || "班级数据"} 已开始下载`);
    } catch (err) {
      setActionMessage(err?.message || "导出失败，请稍后再试");
    } finally {
      setActionLoading(false);
    }
  }, [selectedAssignmentId, setActionLoading, setActionMessage, showActionMessage]);

  const handleExportPdf = useCallback(async (assignmentId = selectedAssignmentId, modules = []) => {
    const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
    if (!normalizedAssignmentId || !modules.length) return;
    try {
      setActionLoading(true);
      const payload = await assignmentsAPI.getExportData(normalizedAssignmentId);
      exportAssignmentPdf({ payload, modules });
      showActionMessage("PDF 导出面板已打开，请在打印面板中保存为 PDF", 5000);
    } catch (err) {
      setActionMessage(err?.message || "PDF 导出失败，请稍后再试");
    } finally {
      setActionLoading(false);
    }
  }, [selectedAssignmentId, setActionLoading, setActionMessage, showActionMessage]);

  const handleOpenWriting = useCallback((item, fallbackTab = "teacher_pending", sequence = [], sourceLabel = "") => {
    const writingId = item?.writingId || item?.id;
    if (!writingId || !item?.classId) return;
    onOpenWriting?.({
      classId: item.classId,
      writingId,
      tab: fallbackTab,
      sourceLabel,
      sequence: Array.isArray(sequence)
        ? sequence.map((entry) => ({
          writingId: entry?.writingId || entry?.id,
          classId: entry?.classId,
          tab: fallbackTab,
        })).filter((entry) => entry.writingId && entry.classId)
        : [],
    });
  }, [onOpenWriting]);

  return {
    handleSaveDraft,
    handleCreateDraft,
    handleCreateAndPublish,
    handlePublish,
    handleClose,
    handleArchive,
    handleExport,
    handleExportPdf,
    handleOpenWriting,
  };
}
