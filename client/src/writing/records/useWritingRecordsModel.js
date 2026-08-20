import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  applySectionFilter,
  hasRunningBackgroundWork as hasRunningBackgroundWorkInRecords,
} from './writingRecordsFilters.js';
import { feedbackAPI, writingsAPI } from '../../api/index.js';

function sameId(left, right) {
  return String(left) === String(right);
}

async function loadWritingDetailSafely(writingId) {
  if (!writingId) return null;
  try {
    return await writingsAPI.get(writingId);
  } catch (error) {
    console.error('刷新完整反馈详情失败:', error?.message || error);
    return null;
  }
}

export default function useWritingRecordsModel({
  myWritings = [],
  initialViewingWritingId = '',
  onViewedWritingChange,
  onWriteNextDraft,
  enabled = true,
}) {
  const [writings, setWritings] = useState(myWritings);
  const [taskFilter, setTaskFilter] = useState('all');
  const [practiceFilter, setPracticeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState('');
  const [replayingId, setReplayingId] = useState('');
  const [detailingId, setDetailingId] = useState('');
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [viewingId, setViewingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [detailWriting, setDetailWriting] = useState(null);
  const [quickRetryingId, setQuickRetryingId] = useState('');
  const [supplementalRetryingId, setSupplementalRetryingId] = useState('');
  const [actionState, setActionState] = useState(null);
  const [listError, setListError] = useState("");

  // Keep a ref to the currently-open detail writing id so that refreshWritings
  // can read it at call time without capturing it as a dependency.  Without
  // this, every time the user opens a detail view detailWriting?.id changes,
  // refreshWritings gets a new identity, and the mount-time useEffect below
  // fires an extra list() call.
  const detailWritingIdRef = useRef(null);
  useEffect(() => {
    detailWritingIdRef.current = detailWriting?.id ?? null;
  }, [detailWriting?.id]);

  const initialViewingAttempted = useRef(false);

  useEffect(() => {
    setWritings(myWritings);
  }, [myWritings]);

  const refreshWritings = useCallback(() => {
    if (!enabled) return Promise.resolve();
    setLoading(true);
    return writingsAPI.list()
      .then(async (items) => {
        setListError("");
        setWritings(items);
        const currentDetailId = detailWritingIdRef.current;
        if (currentDetailId) {
          const latestDetail = await loadWritingDetailSafely(currentDetailId);
          if (latestDetail) {
            setDetailWriting(latestDetail);
          }
        }
      })
      .catch((error) => {
        setListError(error?.message || "批改记录加载失败，请稍后重试。");
      })
      .finally(() => setLoading(false));
  }, [enabled]); // stable between enabled changes — reads detailWritingIdRef at call time

  useEffect(() => {
    refreshWritings();
  }, [refreshWritings]);

  const hasRunningBackgroundWork = useMemo(() => hasRunningBackgroundWorkInRecords(writings), [writings]);

  useEffect(() => {
    if (!hasRunningBackgroundWork) return undefined;
    const timer = setInterval(() => {
      void refreshWritings();
    }, 4000);
    return () => clearInterval(timer);
  }, [hasRunningBackgroundWork, refreshWritings]);

  const handleRetryAnalysis = useCallback(async (writingId) => {
    if (!writingId || retryingId) return;
    setRetryingId(writingId);
    try {
      const updated = await writingsAPI.retryQuestionAnalysis(writingId);
      setWritings((current) => current.map((item) => (sameId(item.id, writingId) ? updated : item)));
      await refreshWritings();
      setTaskRefreshKey((value) => value + 1);
    } catch (error) {
      console.error('重跑题目分析失败:', error?.message || error);
      await refreshWritings();
      setActionState({
        tone: 'error',
        title: error?.message || '重跑题目分析失败',
        description: '请稍后刷新记录，再尝试重新分析。',
        actionLabel: '刷新记录',
        onAction: refreshWritings,
      });
    } finally {
      setRetryingId('');
    }
  }, [refreshWritings, retryingId]);

  const handleReplayDeadLetter = useCallback(async (writingId) => {
    if (!writingId || replayingId) return;
    setReplayingId(writingId);
    try {
      const result = await writingsAPI.replayQuestionAnalysisDeadLetter(writingId);
      if (result?.writing) {
        setWritings((current) => current.map((item) => (sameId(item.id, writingId) ? result.writing : item)));
      }
      setTaskRefreshKey((value) => value + 1);
      await refreshWritings();
    } catch (error) {
      console.error('重放死信任务失败:', error?.message || error);
      await refreshWritings();
      setActionState({
        tone: 'error',
        title: error?.message || '重放任务失败',
        description: '请稍后刷新记录，再尝试重新分析。',
        actionLabel: '刷新记录',
        onAction: refreshWritings,
      });
    } finally {
      setReplayingId('');
    }
  }, [refreshWritings, replayingId]);

  const handleViewFullFeedback = useCallback(async (writingId) => {
    if (!writingId || viewingId) return;
    setViewingId(writingId);
    try {
      const writing = await writingsAPI.get(writingId);
      setDetailWriting(writing);
      onViewedWritingChange?.(String(writingId));
    } catch (error) {
      console.error('加载完整反馈失败:', error?.message || error);
      setActionState({
        tone: 'error',
        title: error?.message || '加载完整反馈失败',
        description: '请稍后重试，或刷新页面。',
        actionLabel: '刷新记录',
        onAction: refreshWritings,
      });
    } finally {
      setViewingId('');
    }
  }, [onViewedWritingChange, refreshWritings, viewingId]);

  useEffect(() => {
    if (!initialViewingWritingId) { initialViewingAttempted.current = false; return; }
    if (initialViewingAttempted.current) return;
    if (sameId(detailWriting?.id, initialViewingWritingId) || sameId(viewingId, initialViewingWritingId)) return;
    initialViewingAttempted.current = true;
    void handleViewFullFeedback(initialViewingWritingId);
  }, [detailWriting?.id, handleViewFullFeedback, initialViewingWritingId, viewingId]);

  const handleRequestDetailedFeedback = useCallback(async (writingId) => {
    if (!writingId || detailingId) return;
    setDetailingId(writingId);
    try {
      await feedbackAPI.requestDetailed(writingId);
      await refreshWritings();
      setTaskRefreshKey((value) => value + 1);
      if (sameId(detailWriting?.id, writingId)) {
        const latestDetail = await loadWritingDetailSafely(writingId);
        if (latestDetail) {
          setDetailWriting(latestDetail);
        }
      }
    } catch (error) {
      console.error('生成详细反馈失败:', error?.message || error);
      setActionState({
        tone: 'error',
        title: error?.message || '生成详细反馈失败',
        description: '请稍后再试，或联系支持。',
        actionLabel: '刷新记录',
        onAction: refreshWritings,
      });
    } finally {
      setDetailingId('');
    }
  }, [detailWriting?.id, detailingId, refreshWritings]);

  const handleRetryQuickFeedback = useCallback(async (writingId) => {
    if (!writingId || quickRetryingId) return;
    setQuickRetryingId(writingId);
    try {
      await feedbackAPI.requestQuick(writingId);
      await refreshWritings();
      setTaskRefreshKey((value) => value + 1);
      setActionState({
        tone: 'success',
        title: '已重新触发基础反馈',
        description: '系统会在后台重新生成快速诊断结果。',
        actionLabel: '回到记录顶部',
        onAction: () => window.scrollTo?.({ top: 0, behavior: 'smooth' }),
      });
    } catch (error) {
      console.error('重试快速反馈失败:', error?.message || error);
      await refreshWritings();
      setActionState({
        tone: 'error',
        title: error?.message || '重试基础反馈失败',
        description: '请稍后刷新记录，再尝试重新触发。',
        actionLabel: '刷新记录',
        onAction: refreshWritings,
      });
    } finally {
      setQuickRetryingId('');
    }
  }, [quickRetryingId, refreshWritings]);

  const handleRetrySupplementalFeedback = useCallback(async (writingId) => {
    if (!writingId || supplementalRetryingId) return;
    setSupplementalRetryingId(writingId);
    try {
      await feedbackAPI.retrySupplemental(writingId);
      await refreshWritings();
      setTaskRefreshKey((value) => value + 1);
      if (sameId(detailWriting?.id, writingId)) {
        const latestDetail = await loadWritingDetailSafely(writingId);
        if (latestDetail) {
          setDetailWriting(latestDetail);
        }
      }
      setActionState({
        tone: 'success',
        title: '已重新触发完整精批补齐',
        description: '系统会在后台重新生成完整精批内容。',
        actionLabel: '回到记录顶部',
        onAction: () => window.scrollTo?.({ top: 0, behavior: 'smooth' }),
      });
    } catch (error) {
      console.error('重试完整精批补齐失败:', error?.message || error);
      await refreshWritings();
      setActionState({
        tone: 'error',
        title: error?.message || '重试完整精批补齐失败',
        description: '请稍后刷新记录，再尝试重新补齐。',
        actionLabel: '重新刷新',
        onAction: refreshWritings,
      });
    } finally {
      setSupplementalRetryingId('');
    }
  }, [detailWriting?.id, refreshWritings, supplementalRetryingId]);

  const handleDeleteWriting = useCallback(async (writingId) => {
    if (!writingId || deletingId) return;
    setDeletingId(writingId);
    try {
      await writingsAPI.delete(writingId);
      setWritings((current) => current.filter((item) => !sameId(item.id, writingId)));
      if (sameId(detailWriting?.id, writingId)) {
        setDetailWriting(null);
        onViewedWritingChange?.('');
      }
    } catch (error) {
      console.error('删除写作记录失败:', error?.message || error);
      await refreshWritings();
      const cleanMessage = String(error?.message || '删除失败').split('，')[0] || '删除失败';
      setActionState({
        tone: 'error',
        title: cleanMessage,
        description: '删除记录时遇到问题，请刷新后再试。',
        actionLabel: '重新刷新',
        onAction: refreshWritings,
      });
    } finally {
      setDeletingId('');
    }
  }, [deletingId, detailWriting?.id, onViewedWritingChange, refreshWritings]);

  const handleWriteNextDraft = useCallback((writing) => {
    onWriteNextDraft?.(writing);
  }, [onWriteNextDraft]);

  const taskWritings = useMemo(
    () => writings.filter((w) => Boolean(w.assignmentId) || w.source === 'homework'),
    [writings]
  );
  const practiceWritings = useMemo(
    () => writings.filter((w) => !(Boolean(w.assignmentId) || w.source === 'homework')),
    [writings]
  );

  const taskFiltered = useMemo(() => applySectionFilter(taskWritings, taskFilter), [taskFilter, taskWritings]);
  const practiceFiltered = useMemo(() => applySectionFilter(practiceWritings, practiceFilter), [practiceFilter, practiceWritings]);

  return {
    state: {
      writings,
      taskFilter,
      practiceFilter,
      loading,
      retryingId,
      replayingId,
      detailingId,
      taskRefreshKey,
      viewingId,
      deletingId,
      detailWriting,
      quickRetryingId,
      supplementalRetryingId,
      actionState,
      listError,
      taskWritings,
      practiceWritings,
      taskFiltered,
      practiceFiltered,
    },
    actions: {
      setTaskFilter,
      setPracticeFilter,
      refreshWritings,
      handleRetryAnalysis,
      handleReplayDeadLetter,
      handleViewFullFeedback,
      handleRequestDetailedFeedback,
      handleRetryQuickFeedback,
      handleRetrySupplementalFeedback,
      handleDeleteWriting,
      handleWriteNextDraft,
      setDetailWriting,
    },
  };
}
