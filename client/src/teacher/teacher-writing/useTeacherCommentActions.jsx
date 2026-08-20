import { useCallback, useEffect, useState } from "react";

import { feedbackAPI } from "../../api/index.js";

export function useTeacherCommentActions({
  writingId,
  comment,
  loadDetail,
  nextWriting,
  writingContext,
  onOpenWriting,
  onBackToWorkbench,
  setMessage,
}) {
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaving(false);
  }, [writingId]);

  const handleSaveComment = useCallback(async () => {
    if (!writingId) return;
    try {
      setSaving(true);
      await feedbackAPI.saveTeacherComment(writingId, comment);
      setMessage("教师评价已保存");
      await loadDetail();
    } catch (error) {
      setMessage(error?.message || "保存教师评价失败，请稍后再试");
    } finally {
      setSaving(false);
    }
  }, [comment, loadDetail, setMessage, writingId]);

  const handleSaveAndMoveNext = useCallback(async () => {
    if (!writingId) return;
    try {
      setSaving(true);
      await feedbackAPI.saveTeacherComment(writingId, comment);
      if (nextWriting) {
        onOpenWriting?.({
          ...writingContext,
          writingId: nextWriting.writingId,
          classId: nextWriting.classId || writingContext?.classId,
          tab: nextWriting.tab || writingContext?.tab || "teacher_pending",
          flashMessage: "已保存上一篇教师评价，已自动切到下一篇待处理。",
        });
        return;
      }
      setMessage("教师评价已保存，当前队列已经处理到最后一篇。");
      await loadDetail();
    } catch (error) {
      setMessage(error?.message || "保存教师评价失败，请稍后再试");
    } finally {
      setSaving(false);
    }
  }, [comment, loadDetail, nextWriting, onOpenWriting, setMessage, writingContext, writingId]);

  const handleSaveAndBack = useCallback(async () => {
    if (!writingId) return;
    try {
      setSaving(true);
      await feedbackAPI.saveTeacherComment(writingId, comment);
      onBackToWorkbench?.();
    } catch (error) {
      setMessage(error?.message || "保存教师评价失败，请稍后再试");
    } finally {
      setSaving(false);
    }
  }, [comment, onBackToWorkbench, setMessage, writingId]);

  return {
    state: {
      saving,
    },
    actions: {
      handleSaveComment,
      handleSaveAndMoveNext,
      handleSaveAndBack,
    },
  };
}
