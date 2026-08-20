import { useCallback, useEffect, useRef, useState } from "react";

import { createEmptyTodoState } from "./modelHelpers.js";
import { assignmentsAPI, classesAPI, questionsAPI, teacherWorkbenchAPI } from "../../api/index.js";

function normalizeAssignmentClassIds(assignment) {
  if (Array.isArray(assignment.classIds) && assignment.classIds.length) {
    return assignment.classIds.map(String);
  }
  return assignment.classId ? [String(assignment.classId)] : [];
}

function normalizeAssignmentTypeMix(assignment) {
  if (Array.isArray(assignment.selectedTypeMix) && assignment.selectedTypeMix.length) {
    return assignment.selectedTypeMix;
  }
  return assignment.selectedType ? [{ type: assignment.selectedType, percentage: 100 }] : [];
}

function buildAssignmentFormState(assignment) {
  return {
    classId: assignment.classId ? String(assignment.classId) : "",
    classIds: normalizeAssignmentClassIds(assignment),
    title: assignment.title || "",
    promptText: assignment.promptText || "",
    selectedType: assignment.selectedType || "",
    selectedTypeMix: normalizeAssignmentTypeMix(assignment),
    questionId: assignment.questionId ? String(assignment.questionId) : "",
    questionTitle: assignment.questionTitle || "",
    dueAt: assignment.dueAt ? new Date(Number(assignment.dueAt)).toISOString().slice(0, 16) : "",
    allowLate: Boolean(assignment.allowLate),
    maxScore: Number(assignment.maxScore || 15),
  };
}

function normalizeOverviewAssignments(overview) {
  return Array.isArray(overview?.recentAssignments) ? overview.recentAssignments : [];
}

function getQuestionBankFailureStatus(currentItems) {
  return currentItems.length ? "degraded" : "failed";
}

function getClassesFailureStatus(currentItems) {
  return currentItems.length ? "degraded" : "failed";
}

function resolveInitialQueueClassId(items, previousId) {
  return previousId || (Array.isArray(items) && items[0]?.id ? String(items[0].id) : "");
}

function shouldPreserveAssignmentClass(items, previousForm) {
  return (
    !Array.isArray(items)
    || !items[0]?.id
    || previousForm.classId
    || (Array.isArray(previousForm.classIds) && previousForm.classIds.length)
  );
}

function maybeFillInitialAssignmentClass(items, previousForm) {
  if (shouldPreserveAssignmentClass(items, previousForm)) return previousForm;
  return { ...previousForm, classId: String(items[0].id), classIds: [String(items[0].id)] };
}

export default function useTeacherWorkbenchData({ setActionMessage, setAssignmentForm }) {
  const [assignments, setAssignments] = useState([]);
  const [draftAssignments, setDraftAssignments] = useState([]);
  const [dueSoonAssignments, setDueSoonAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [assignmentDetail, setAssignmentDetail] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedQueueClassId, setSelectedQueueClassId] = useState("");
  const [queueWritings, setQueueWritings] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueStatus, setQueueStatus] = useState('idle');
  const [queueError, setQueueError] = useState(null);
  const [questionBank, setQuestionBank] = useState([]);
  const [questionBankStatus, setQuestionBankStatus] = useState('idle');
  const [questionBankError, setQuestionBankError] = useState(null);
  const [pendingGradings, setPendingGradings] = useState([]);
  const [pendingComments, setPendingComments] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [todo, setTodo] = useState(createEmptyTodoState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [classesStatus, setClassesStatus] = useState('idle');
  const [classesError, setClassesError] = useState(null);
  const questionBankRef = useRef([]);
  const classesRef = useRef([]);
  const queueWritingsRef = useRef([]);

  useEffect(() => {
    questionBankRef.current = questionBank;
  }, [questionBank]);

  useEffect(() => {
    classesRef.current = classes;
  }, [classes]);

  useEffect(() => {
    queueWritingsRef.current = queueWritings;
  }, [queueWritings]);

  const syncAssignmentForm = useCallback((detail) => {
    const assignment = detail?.assignment;
    if (!assignment) return;
    setAssignmentForm(buildAssignmentFormState(assignment));
  }, [setAssignmentForm]);

  const loadAssignmentDetail = useCallback(async (assignmentId) => {
    if (!assignmentId) {
      setSelectedAssignmentId("");
      setAssignmentDetail(null);
      setActionMessage("");
      return;
    }
    try {
      setDetailLoading(true);
      const detail = await assignmentsAPI.get(assignmentId);
      setSelectedAssignmentId(assignmentId);
      setAssignmentDetail(detail);
      syncAssignmentForm(detail);
    } catch (err) {
      setActionMessage(err?.message || "暂时无法加载作业详情");
    } finally {
      setDetailLoading(false);
    }
  }, [setActionMessage, syncAssignmentForm]);

  const clearAssignmentDetail = useCallback((options = {}) => {
    const { keepActionMessage = false } = options;
    setSelectedAssignmentId("");
    setAssignmentDetail(null);
    if (!keepActionMessage) setActionMessage("");
  }, [setActionMessage]);

  const loadWorkbench = useCallback(async (preserveSelectedId = "") => {
    try {
      setLoading(true);
      const [overview, drafts, dueSoon, gradings, commentRows, exceptionRows] = await Promise.all([
        teacherWorkbenchAPI.overview(),
        teacherWorkbenchAPI.drafts(),
        teacherWorkbenchAPI.dueSoon(),
        teacherWorkbenchAPI.gradings(),
        teacherWorkbenchAPI.pendingComments(),
        teacherWorkbenchAPI.exceptions(),
      ]);
      const nextAssignments = normalizeOverviewAssignments(overview);
      setAssignments(nextAssignments);
      setDraftAssignments(Array.isArray(drafts) ? drafts : []);
      setDueSoonAssignments(Array.isArray(dueSoon) ? dueSoon : []);
      setPendingGradings(Array.isArray(gradings) ? gradings : []);
      setPendingComments(Array.isArray(commentRows) ? commentRows : []);
      setExceptions(Array.isArray(exceptionRows) ? exceptionRows : []);
      setTodo(overview?.todo || createEmptyTodoState());
      setError("");

      const nextSelectedId = preserveSelectedId || "";
      if (nextSelectedId) await loadAssignmentDetail(nextSelectedId);
    } catch (err) {
      setError(err?.message || "暂时无法加载工作台数据");
    } finally {
      setLoading(false);
    }
  }, [loadAssignmentDetail]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadWorkbench();
      } catch (err) {
        if (!active) return;
        setError(err?.message || "暂时无法加载工作台数据");
      }
    })();
    return () => {
      active = false;
    };
  }, [loadWorkbench]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setQuestionBankStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'));
        setQuestionBankError(null);
        const items = await questionsAPI.list();
        if (!active) return;
        setQuestionBank(Array.isArray(items) ? items : []);
        setQuestionBankStatus('ready');
        setQuestionBankError(null);
      } catch {
        if (!active) return;
        setQuestionBankStatus(() => getQuestionBankFailureStatus(questionBankRef.current));
        setQuestionBankError({
          code: 'QUESTION_BANK_LOAD_FAILED',
          message: '题库加载失败，当前展示最近一次可用内容。',
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setClassesStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'));
        setClassesError(null);
        const items = await classesAPI.list();
        if (!active) return;
        setClasses(Array.isArray(items) ? items : []);
        setClassesStatus('ready');
        setClassesError(null);
        setSelectedQueueClassId((prev) => resolveInitialQueueClassId(items, prev));
        setAssignmentForm((prev) => maybeFillInitialAssignmentClass(items, prev));
      } catch {
        if (!active) return;
        setClassesStatus(() => getClassesFailureStatus(classesRef.current));
        setClassesError({
          code: 'CLASS_LIST_LOAD_FAILED',
          message: '班级列表加载失败，当前展示最近一次可用内容。',
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [setAssignmentForm]);

  useEffect(() => {
    if (!selectedQueueClassId) {
      setQueueWritings([]);
      setQueueLoading(false);
      setQueueStatus('idle');
      setQueueError(null);
      return;
    }
    let active = true;
    setQueueLoading(true);
    setQueueStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    setQueueError(null);
    classesAPI.getWritings(selectedQueueClassId)
      .then((items) => {
        if (!active) return;
        setQueueWritings(Array.isArray(items) ? items : []);
        setQueueStatus('ready');
        setQueueError(null);
      })
      .catch(() => {
        if (!active) return;
        setQueueStatus(() => (queueWritingsRef.current.length ? 'degraded' : 'failed'));
        setQueueError({
          code: 'CLASS_QUEUE_LOAD_FAILED',
          message: '班级作文队列加载失败，当前展示最近一次可用内容。',
        });
      })
      .finally(() => {
        if (!active) return;
        setQueueLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedQueueClassId]);

  return {
    state: {
      assignments,
      draftAssignments,
      dueSoonAssignments,
      selectedAssignmentId,
      assignmentDetail,
      classes,
      selectedQueueClassId,
      queueWritings,
      queueLoading,
      queueStatus,
      queueError,
      questionBank,
      questionBankStatus,
      questionBankError,
      pendingGradings,
      pendingComments,
      exceptions,
      todo,
      loading,
      error,
      detailLoading,
      classesStatus,
      classesError,
    },
    actions: {
      setSelectedQueueClassId,
      setSelectedAssignmentId,
      setAssignmentDetail,
      loadAssignmentDetail,
      loadWorkbench,
      clearAssignmentDetail,
    },
  };
}
