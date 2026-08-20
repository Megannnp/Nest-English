import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { resolveSelectedAssignmentState } from './selectionHelpers.js';
import { reconcileBatchItemTargets, revokePreviewList, sameId } from './shared.js';
import { useBatchGradingData } from './useBatchGradingData.js';
import { useBatchGradingDerivedState } from './useBatchGradingDerivedState.js';
import { useBatchGradingJobRuntime } from './useBatchGradingJobRuntime.js';
import { useBatchGradingUploadActions } from './useBatchGradingUploadActions.js';

const EMPTY_STUDENTS = [];

/**
 * @typedef {Object} BatchGradingStudentOption
 * @property {string} key
 * @property {'user'|'roster'} type
 * @property {string} id
 * @property {string} name
 * @property {string} className
 * @property {string} label
 */

/**
 * @typedef {Object} BatchGradingItem
 * @property {File | { name?: string }} file
 * @property {string} preview
 * @property {'pending'|'ocr'|'confirm'|'uploading'|'confirmed'|'grading'|'done'|'canceled'|'error'} status
 * @property {string} studentName
 * @property {string} studentTargetKey
 * @property {string | null} detectedName
 * @property {string} recognizedText
 * @property {Record<string, any> | null} feedback
 * @property {string | null} errorMsg
 * @property {string} writingId
 * @property {string} writingOwnerId
 */

/**
 * @param {{
 *   user: { id?: string, role?: string, classId?: string, className?: string, realName?: string, name?: string },
 *   questions: Array<Record<string, any>>,
 *   studentsInClass?: Array<Record<string, any>>,
 * }} params
 */
export function useBatchGradingModel({ user, questions, studentsInClass = EMPTY_STUDENTS }) {
  /** @type {[BatchGradingItem[], Function]} */
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classesError, setClassesError] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(user?.classId || '');
  const [classStudents, setClassStudents] = useState(studentsInClass);
  const [rosterItems, setRosterItems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [selectedQId, setSelectedQId] = useState('');
  const [promptText, setPromptText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [phase, setPhase] = useState('setup');
  const [isPaused, setIsPaused] = useState(false);
  const [currentJobId, setCurrentJobId] = useState('');
  const [currentJobStatus, setCurrentJobStatus] = useState('');
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentJobsLoading, setRecentJobsLoading] = useState(false);
  const [recentJobsFilter, setRecentJobsFilter] = useState('active');
  const fileRef = useRef(null);
  const abortRef = useRef(false);
  const pauseRef = useRef(false);
  const itemsRef = useRef([]);
  const gradingRequestRef = useRef(null);

  useEffect(() => () => { revokePreviewList(itemsRef.current); }, []);

  useBatchGradingData({
    user,
    selectedClassId,
    selectedAssignmentId,
    setClasses,
    setSelectedClassId,
    setClassStudents,
    setRosterItems,
    setAssignments,
    setSelectedAssignmentId,
    setClassesError,
    studentsInClass,
  });

  const selectedAssignment = assignments.find(a => sameId(a.id, selectedAssignmentId));
  const selectedQuestion = questions.find(q => sameId(q.id, selectedQId));
  const questionType = selectedQuestion?.type || selectedAssignment?.selectedType || 'general';
  const max = selectedAssignment?.maxScore || 15;

  const mapRemoteStatusToLocalStatus = useCallback((remote, currentStatus = '') => {
    if (remote.status === 'running') return 'grading';
    if (remote.status === 'pending') return 'confirmed';
    if (remote.status === 'succeeded') return 'done';
    if (remote.status === 'failed') return 'error';
    if (remote.status === 'canceled' || remote.status === 'cancelled') {
      return currentStatus === 'done' ? 'done' : 'canceled';
    }
    return currentStatus || 'confirmed';
  }, []);

  /** @type {BatchGradingStudentOption[]} */
  const studentOptions = useMemo(() => [
    ...classStudents.map(student => ({
      key: `user:${student.id}`, type: 'user', id: student.id,
      name: student.realName || student.name || '',
      className: student.className || '',
      label: `${student.studentNo ? `${student.studentNo} · ` : ''}${student.realName || student.name || '未命名学生'} · 已注册`,
    })),
    ...rosterItems.filter(item => item.status !== 'linked' && !item.userId).map(item => ({
      key: `roster:${item.id}`, type: 'roster', id: item.id,
      name: item.studentName || '',
      className: classes.find(cls => sameId(cls.id, item.classId))?.className || user.className || '',
      label: `${item.studentNo ? `${item.studentNo} · ` : ''}${item.studentName || '未命名学生'} · 待认领名单`,
    })),
  ], [classStudents, rosterItems, classes, user.className]);

  const studentCandidates = useMemo(
    () => studentOptions.map(item => ({ id: item.id, name: item.name, label: item.label })),
    [studentOptions]
  );

  useEffect(() => {
    setItems((prev) => {
      const next = reconcileBatchItemTargets(prev, studentOptions);
      if (next === prev) return prev;
      itemsRef.current = next;
      return next;
    });
  }, [studentOptions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__batchGradingDebug = {
      selectedClassId,
      selectedAssignmentId,
      classStudents,
      rosterItems,
      studentOptions,
      items: itemsRef.current,
    };
  }, [classStudents, rosterItems, selectedAssignmentId, selectedClassId, studentOptions]);

  const applyResolvedSelection = useCallback((nextSelection) => {
    setSelectedAssignmentId(nextSelection.selectedAssignmentId);
    setSelectedQId(nextSelection.selectedQId);
    setPromptText(nextSelection.promptText);
  }, []);

  const syncAssignmentSelection = useCallback((nextAssignmentId) => {
    const nextSelection = resolveSelectedAssignmentState({
      assignments,
      questions,
      selectedAssignmentId: nextAssignmentId,
    });
    applyResolvedSelection(nextSelection);
  }, [applyResolvedSelection, assignments, questions]);

  const handleSelectAssignment = useCallback((id) => {
    syncAssignmentSelection(id);
  }, [syncAssignmentSelection]);

  const handleSelectClass = useCallback((id) => {
    setSelectedClassId(id);
    syncAssignmentSelection('');
  }, [setSelectedClassId, syncAssignmentSelection]);

  const sessionController = useMemo(() => ({
    setJobIdentity: (jobId, jobStatus = '') => {
      setCurrentJobId(jobId);
      setCurrentJobStatus(jobStatus);
    },
    resetJob: () => {
      setCurrentJobId('');
      setCurrentJobStatus('');
    },
    syncFromRemoteJob: (jobStatus) => {
      const normalizedStatus = jobStatus || '';
      const running = ['running', 'pending', 'pausing', 'canceling'].includes(normalizedStatus);
      setCurrentJobStatus(normalizedStatus);
      setIsRunning(running);
      setIsPaused(normalizedStatus === 'paused');
      if (['completed', 'failed', 'partial_failed', 'canceled', 'cancelled'].includes(normalizedStatus)) {
        setPhase('done');
        setIsRunning(false);
        return;
      }
      if (['paused', 'pausing', 'running', 'pending', 'canceling'].includes(normalizedStatus)) {
        setPhase('grading');
      }
    },
    markRunStarting: () => {
      setPhase('grading');
      setIsRunning(true);
      setIsPaused(false);
    },
    markRunFailedBackToConfirm: () => {
      setIsRunning(false);
      setIsPaused(false);
      setPhase('confirm');
    },
    markRunFinished: () => {
      setIsRunning(false);
      setIsPaused(false);
      setPhase('done');
    },
    markLocalCancelWithoutJob: () => {
      setIsRunning(false);
      setIsPaused(false);
      setPhase('confirm');
    },
    markOcrRunning: () => {
      setPhase('confirm');
      setIsRunning(true);
    },
    markOcrFinished: () => {
      setIsRunning(false);
    },
  }), []);

  const handleRecentJobsFilterChange = useCallback((nextFilter) => {
    setRecentJobsFilter(nextFilter);
  }, []);

  const resetBatchSession = useCallback(() => {
    setPhase('setup');
    syncAssignmentSelection('');
  }, [syncAssignmentSelection]);

  useEffect(() => {
    if (!selectedAssignmentId) return;
    const nextSelection = resolveSelectedAssignmentState({
      assignments,
      questions,
      selectedAssignmentId,
    });
    if (nextSelection.selectedAssignmentId !== selectedAssignmentId) {
      applyResolvedSelection(nextSelection);
      return;
    }
    if (nextSelection.selectedQId !== selectedQId || nextSelection.promptText !== promptText) {
      applyResolvedSelection(nextSelection);
    }
  }, [applyResolvedSelection, assignments, promptText, questions, selectedAssignmentId, selectedQId]);

  const {
    addFiles,
    updateItem,
    createBoundWritingForItem,
    handleStudentSelect,
    removeItem,
    clearAllItems,
    handleConfirmItem,
    confirmAll,
    fillUnmatchedByRosterOrder,
    retryOCR,
    runOCR,
  } = useBatchGradingUploadActions({
    itemsRef,
    setItems,
    sessionController,
    selectedAssignmentId,
    selectedAssignment,
    selectedQuestion,
    selectedQId,
    promptText,
    questionType,
    max,
    studentOptions,
    studentCandidates,
    user,
  });

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDropFiles = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);
    addFiles(event.dataTransfer.files);
  }, [addFiles]);

  const {
    loadRecentBatchJobs,
    attachBatchJob,
    runGrading,
    pauseBatchJob,
    resumeBatchJob,
    cancelBatchJob,
    retryFailedBatchJob,
    continueIncompleteBatchJob,
  } = useBatchGradingJobRuntime({
    currentJobId,
    itemsRef,
    max,
    pauseRef,
    phase,
    recentJobsFilter,
    runGradingFallback: { abortRef },
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
    loadRecentBatchJobsState: {
      recentJobsFilter,
      setRecentJobs,
      setRecentJobsLoading,
      setSelectedAssignmentId,
      setSelectedClassId,
    },
  });

  const {
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
  } = useBatchGradingDerivedState({
    items,
    selectedAssignmentId,
    studentOptions,
  });

  return {
    items,
    classes,
    classesError,
    selectedClassId,
    rosterItems,
    assignments,
    selectedAssignmentId,
    selectedQId,
    promptText,
    isRunning,
    isDragOver,
    phase,
    isPaused,
    fileRef,
    pauseRef,
    abortRef,
    gradingRequestRef,
    selectedAssignment,
    selectedQuestion,
    questionType,
    max,
    studentOptions,
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
    currentJobId,
    currentJobStatus,
    recentJobs,
    recentJobsLoading,
    recentJobsFilter,
    addFiles,
    handleSelectAssignment,
    handleSelectClass,
    handleRecentJobsFilterChange,
    handleDragOver,
    handleDragLeave,
    handleDropFiles,
    resetBatchSession,
    updateItem,
    handleStudentSelect,
    removeItem,
    clearAllItems,
    handleConfirmItem,
    confirmAll,
    fillUnmatchedByRosterOrder,
    retryOCR,
    runOCR,
    runGrading,
    pauseBatchJob,
    resumeBatchJob,
    cancelBatchJob,
    retryFailedBatchJob,
    continueIncompleteBatchJob,
    attachBatchJob,
    loadRecentBatchJobs,
  };
}
