import { useMemo } from 'react';

import { hasUsableRecognizedText, matchStudentOption } from './shared.js';

/**
 * @param {{
 *   items: Array<Record<string, any>>,
 *   selectedAssignmentId: string,
 *   studentOptions: Array<Record<string, any>>,
 * }} params
 */
export function useBatchGradingDerivedState({
  items,
  selectedAssignmentId,
  studentOptions,
}) {
  return useMemo(() => {
    const canResolveStudent = (item) => {
      if (item.studentTargetKey) return true;
      if (!studentOptions.length) return Boolean(item.studentName || item.detectedName);
      return Boolean(matchStudentOption({
        detectedName: item.studentName || item.detectedName || '',
        fileName: item.file?.name || '',
        studentOptions,
      }));
    };

    const doneCount = items.filter((item) => item.status === 'done').length;
    const errorCount = items.filter((item) => item.status === 'error').length;
    const canceledCount = items.filter((item) => item.status === 'canceled').length;
    const confirmedCount = items.filter((item) => item.status === 'confirmed').length;
    const incompleteCount = items.filter((item) => ['confirmed', 'canceled', 'grading'].includes(item.status)).length;
    const pendingConfirmItems = items.filter((item) => item.status === 'confirm' || item.status === 'error');
    const itemsNeedingTextRetry = pendingConfirmItems.filter((item) => !hasUsableRecognizedText(item.recognizedText));
    const itemsNeedingStudent = pendingConfirmItems.filter((item) => !canResolveStudent(item));
    const canConfirmAll = pendingConfirmItems.length > 0
      && itemsNeedingStudent.length === 0
      && itemsNeedingTextRetry.length === 0;
    const confirmBlockReason = itemsNeedingTextRetry.length > 0
      ? `请先重试识别失败的作文（${itemsNeedingTextRetry.length} 份）`
      : itemsNeedingStudent.length > 0
        ? `请先选择学生（${itemsNeedingStudent.length} 份）`
        : '请先确认所有学生姓名';
    const canFillByRosterOrder = items.some((item) => (item.status === 'confirm' || item.status === 'error') && !item.studentTargetKey)
      && studentOptions.some((item) => item.type === 'user');
    const canStartGrading = items.length > 0
      && Boolean(selectedAssignmentId)
      && items.every((item) => item.status === 'confirmed' || item.status === 'done');
    const progress = items.length > 0
      ? Math.round(((doneCount + errorCount + canceledCount) / items.length) * 100)
      : 0;

    return {
      doneCount,
      errorCount,
      canceledCount,
      confirmedCount,
      incompleteCount,
      canConfirmAll,
      confirmBlockReason,
      canFillByRosterOrder,
      canStartGrading,
      progress,
    };
  }, [items, selectedAssignmentId, studentOptions]);
}
