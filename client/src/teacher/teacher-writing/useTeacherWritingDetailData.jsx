import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { feedbackAPI, writingsAPI } from "../../api/index.js";

function _buildQuickStatusLabel(quickStatus) {
  if (quickStatus === "ready") return "基础反馈已完成";
  if (quickStatus === "failed") return "基础反馈失败";
  if (quickStatus === "running") return "基础反馈处理中";
  return "基础反馈未开始";
}

function _buildDetailedStatusLabel(detailedFeedback, supplementalActive) {
  if (supplementalActive) return "";
  const s = detailedFeedback?.status;
  if (s === "ready") return "学生侧精批已生成";
  if (s === "running" || s === "pending") return "学生侧精批生成中";
  if (s === "failed") return "学生侧精批失败";
  return "学生侧精批未生成";
}

export function useTeacherWritingDetailData(writingId, flashMessage) {
  const [writing, setWriting] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [jumpHighlight, setJumpHighlight] = useState(false);
  const [retryingQuickFeedback, setRetryingQuickFeedback] = useState(false);
  const [retryingSupplementalFeedback, setRetryingSupplementalFeedback] = useState(false);
  const syncedCommentRef = useRef("");
  const commentDirtyRef = useRef(false);

  const setCommentDraft = useCallback((value) => {
    setComment((current) => {
      const nextValue = typeof value === "function" ? value(current) : value;
      commentDirtyRef.current = nextValue !== syncedCommentRef.current;
      return nextValue;
    });
  }, []);

  useEffect(() => {
    if (!writingId) {
      setWriting(null);
      setFeedback(null);
      setComment("");
      syncedCommentRef.current = "";
      commentDirtyRef.current = false;
      setLoading(false);
      return;
    }

    setWriting(null);
    setFeedback(null);
    setComment("");
    syncedCommentRef.current = "";
    commentDirtyRef.current = false;
    setLoading(true);
  }, [writingId]);

  const loadDetail = useCallback(async () => {
    if (!writingId) {
      setWriting(null);
      setFeedback(null);
      setComment("");
      syncedCommentRef.current = "";
      commentDirtyRef.current = false;
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [writingData, feedbackData] = await Promise.all([
        writingsAPI.get(writingId),
        feedbackAPI.get(writingId),
      ]);
      setWriting(writingData);
      setFeedback(feedbackData);
      const serverComment = typeof feedbackData?.teacherComment?.result?.content === "string"
        ? feedbackData.teacherComment.result.content
        : "";
      setComment((current) => {
        const previousSyncedComment = syncedCommentRef.current;
        syncedCommentRef.current = serverComment;

        if (current === serverComment) {
          commentDirtyRef.current = false;
          return current;
        }

        if (commentDirtyRef.current && current !== previousSyncedComment) {
          return current;
        }

        commentDirtyRef.current = false;
        return serverComment;
      });
    } catch (error) {
      setMessage(error?.message || "暂时无法加载作文详情");
    } finally {
      setLoading(false);
    }
  }, [writingId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!writingId) {
      setMessage("");
      setRetryingQuickFeedback(false);
      setRetryingSupplementalFeedback(false);
      setJumpHighlight(false);
      return;
    }
    setRetryingQuickFeedback(false);
    setRetryingSupplementalFeedback(false);
    setMessage(flashMessage || "");
  }, [flashMessage, writingId]);

  useEffect(() => {
    const quickStatus = feedback?.quickFeedback?.status;
    const detailedStatus = feedback?.detailedFeedback?.status;
    const supplementalStatus = feedback?.supplementalFeedback?.status;
    const shouldPoll = quickStatus === "running" || detailedStatus === "running" || detailedStatus === "pending" || supplementalStatus === "running" || supplementalStatus === "pending";
    if (!shouldPoll || !writingId) return undefined;
    const timer = window.setInterval(() => {
      void loadDetail();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [feedback?.detailedFeedback?.status, feedback?.quickFeedback?.status, feedback?.supplementalFeedback?.status, loadDetail, writingId]);

  useEffect(() => {
    if (!flashMessage) {
      setJumpHighlight(false);
      return;
    }
    setJumpHighlight(true);
    const timer = window.setTimeout(() => setJumpHighlight(false), 1600);
    return () => window.clearTimeout(timer);
  }, [flashMessage, writingId]);

  const handleRetryQuickFeedback = useCallback(async () => {
    if (!writingId || retryingQuickFeedback) return;
    try {
      setRetryingQuickFeedback(true);
      await feedbackAPI.requestQuick(writingId);
      setMessage("已重新触发快速反馈，页面会自动刷新状态。");
      await loadDetail();
    } catch (error) {
      setMessage(error?.message || "重新触发快速反馈失败");
    } finally {
      setRetryingQuickFeedback(false);
    }
  }, [loadDetail, retryingQuickFeedback, writingId]);

  const handleRetrySupplementalFeedback = useCallback(async () => {
    if (!writingId || retryingSupplementalFeedback) return;
    try {
      setRetryingSupplementalFeedback(true);
      await feedbackAPI.retrySupplemental(writingId);
      setMessage({
        tone: "success",
        title: "已重新触发完整精批补齐",
        description: "系统会在后台重新生成完整精批内容。",
      });
      await loadDetail();
    } catch (error) {
      setMessage({
        tone: "error",
        title: error?.message || "重新触发完整精批补齐失败",
      });
    } finally {
      setRetryingSupplementalFeedback(false);
    }
  }, [loadDetail, retryingSupplementalFeedback, writingId]);

  const feedbackStatusSummary = useMemo(() => {
    if (!feedback) return "正在读取反馈信息";
    const quickStatus = feedback.quickFeedback?.status;
    const quick = _buildQuickStatusLabel(quickStatus);
    const teacherComment = feedback.teacherComment?.status === "ready" ? "教师评价已保存" : "教师评价待补充";
    const supplementalStatus = feedback.supplementalFeedback?.status;
    const supplemental = supplementalStatus === "ready"
      ? "完整精批补齐已完成"
      : supplementalStatus === "failed"
        ? "完整精批补齐失败"
        : supplementalStatus === "running" || supplementalStatus === "pending"
          ? "完整精批补齐中"
          : "";
    const supplementalActive = ["ready", "failed", "running", "pending"].includes(supplementalStatus);
    const detailed = _buildDetailedStatusLabel(feedback.detailedFeedback, supplementalActive);
    return [quick, supplemental, teacherComment, detailed].filter(Boolean).join(" · ");
  }, [feedback]);

  return {
    state: {
      writing,
      feedback,
      comment,
      loading,
      message,
      jumpHighlight,
      feedbackStatusSummary,
      retryingQuickFeedback,
      retryingSupplementalFeedback,
    },
    actions: {
      setComment: setCommentDraft,
      setMessage,
      loadDetail,
      handleRetryQuickFeedback,
      handleRetrySupplementalFeedback,
    },
  };
}
