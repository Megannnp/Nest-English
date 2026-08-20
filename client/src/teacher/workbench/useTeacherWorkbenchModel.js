import { useCallback, useEffect, useMemo, useState } from "react";

import { exportAssignmentPdf } from "./assignmentPdfExport.js";
import { getWritingRiskFlags } from "./utils.js";
import { assignmentsAPI, classesAPI, questionsAPI, teacherWorkbenchAPI, usersAPI } from "../../api/index.js";

function getTodoFilterStorageKey(userId) {
  return `teacher-workbench-todo-filters:${userId || "anonymous"}`;
}

function normalizeAssignmentId(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object") {
    if (value.id != null) return String(value.id);
    if (value.assignmentId != null) return String(value.assignmentId);
  }
  return "";
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function defaultTodo() {
  return {
    draftCount: 0,
    publishedCount: 0,
    dueSoonCount: 0,
    pendingGradings: 0,
    pendingComments: 0,
    exceptionCount: 0,
  };
}

function normalizeWorkbenchData({ commentRows, drafts, dueSoon, exceptionRows, gradings, overview }) {
  return {
    assignments: asList(overview?.recentAssignments),
    draftAssignments: asList(drafts),
    dueSoonAssignments: asList(dueSoon),
    pendingGradings: asList(gradings),
    pendingComments: asList(commentRows),
    exceptions: asList(exceptionRows),
    todo: overview?.todo || defaultTodo(),
  };
}

function selectedClassIdsFromForm(form) {
  if (Array.isArray(form.classIds)) return form.classIds.filter(Boolean);
  return form.classId ? [form.classId] : [];
}

function typeMixTotal(form) {
  return asList(form.selectedTypeMix).reduce((sum, item) => sum + Number(item?.percentage || 0), 0);
}

function validateAssignmentForm(form) {
  const selectedClassIds = selectedClassIdsFromForm(form);
  if (!selectedClassIds.length) return "请先选择班级";
  if (!form.title?.trim()) return "请先填写作业标题";
  if (!form.promptText?.trim()) return "请先填写写作要求";
  if (asList(form.selectedTypeMix).length > 0 && typeMixTotal(form) !== 100) return "题型占比总和需要等于 100%";
  return "";
}

function buildAssignmentPayload(form, classId, selectedThemes = []) {
  return {
    classId,
    title: form.title,
    promptText: form.promptText,
    selectedType: form.selectedType,
    selectedTypeMix: form.selectedTypeMix || [],
    selectedThemes,
    maxScore: Number(form.maxScore || 15),
    dueAt: form.dueAt ? new Date(form.dueAt).getTime() : null,
    allowLate: form.allowLate,
    questionId: form.questionId || null,
    questionTitle: form.questionTitle || "",
  };
}

async function createAssignmentsForClasses(form) {
  const results = [];
  for (const classId of selectedClassIdsFromForm(form)) {
    results.push(await assignmentsAPI.create(buildAssignmentPayload(form, classId)));
  }
  return results;
}

async function createAndPublishAssignmentsForClasses(form) {
  for (const classId of selectedClassIdsFromForm(form)) {
    const result = await assignmentsAPI.create(buildAssignmentPayload(form, classId));
    const assignmentId = result?.assignment?.id || "";
    if (assignmentId) await assignmentsAPI.publish(assignmentId);
  }
}

export default function useTeacherWorkbenchModel({ user, onOpenWriting, onReturnToWorkbench }) {
  const [assignments, setAssignments] = useState([]);
  const [draftAssignments, setDraftAssignments] = useState([]);
  const [dueSoonAssignments, setDueSoonAssignments] = useState([]);
  const [activeTodoFilter, setActiveTodoFilter] = useState("all");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [assignmentDetail, setAssignmentDetail] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    classId: "",
    classIds: [],
    title: "",
    promptText: "",
    selectedType: "",
    selectedTypeMix: [],
    questionId: "",
    questionTitle: "",
    dueAt: "",
    allowLate: false,
    maxScore: 15,
  });
  const [classes, setClasses] = useState([]);
  const [selectedQueueClassId, setSelectedQueueClassId] = useState("");
  const [queueWritings, setQueueWritings] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [questionBank, setQuestionBank] = useState([]);
  const [pendingGradings, setPendingGradings] = useState([]);
  const [pendingComments, setPendingComments] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [autoFocusHint, setAutoFocusHint] = useState("");
  const [manualTodoFilterUntil, setManualTodoFilterUntil] = useState(0);
  const [gradingClassFilter, setGradingClassFilter] = useState("all");
  const [commentClassFilter, setCommentClassFilter] = useState("all");
  const [todo, setTodo] = useState({
    draftCount: 0,
    publishedCount: 0,
    dueSoonCount: 0,
    pendingGradings: 0,
    pendingComments: 0,
    exceptionCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const todoFilterStorageKey = useMemo(() => getTodoFilterStorageKey(user?.id), [user?.id]);

  useEffect(() => {
    const profileFilters = user?.preferences?.teacherWorkbenchFilters;
    if (profileFilters && typeof profileFilters === "object") {
      if (profileFilters.gradingClassFilter) setGradingClassFilter(profileFilters.gradingClassFilter);
      if (profileFilters.commentClassFilter) setCommentClassFilter(profileFilters.commentClassFilter);
      return;
    }

    try {
      const raw = window.localStorage.getItem(todoFilterStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.gradingClassFilter) setGradingClassFilter(parsed.gradingClassFilter);
      if (parsed?.commentClassFilter) setCommentClassFilter(parsed.commentClassFilter);
    } catch {
      // ignore persisted filter parse failures
    }
  }, [todoFilterStorageKey, user?.preferences?.teacherWorkbenchFilters]);

  const syncAssignmentForm = useCallback((detail) => {
    const assignment = detail?.assignment;
    if (!assignment) return;
    setAssignmentForm({
      classId: assignment.classId ? String(assignment.classId) : "",
      classIds: assignment.classId ? [String(assignment.classId)] : [],
      title: assignment.title || "",
      promptText: assignment.promptText || "",
      selectedType: assignment.selectedType || "",
      selectedTypeMix: Array.isArray(assignment.selectedTypeMix) && assignment.selectedTypeMix.length
        ? assignment.selectedTypeMix
        : (assignment.selectedType ? [{ type: assignment.selectedType, percentage: 100 }] : []),
      questionId: assignment.questionId ? String(assignment.questionId) : "",
      questionTitle: assignment.questionTitle || "",
      dueAt: assignment.dueAt ? new Date(Number(assignment.dueAt)).toISOString().slice(0, 16) : "",
      allowLate: Boolean(assignment.allowLate),
      maxScore: Number(assignment.maxScore || 15),
    });
  }, []);

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
      setActionMessage("");
    } catch (err) {
      setActionMessage(err?.message || "暂时无法加载作业详情");
    } finally {
      setDetailLoading(false);
    }
  }, [syncAssignmentForm]);

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
      const workbenchData = normalizeWorkbenchData({ commentRows, drafts, dueSoon, exceptionRows, gradings, overview });
      setAssignments(workbenchData.assignments);
      setDraftAssignments(workbenchData.draftAssignments);
      setDueSoonAssignments(workbenchData.dueSoonAssignments);
      setPendingGradings(workbenchData.pendingGradings);
      setPendingComments(workbenchData.pendingComments);
      setExceptions(workbenchData.exceptions);
      setTodo(workbenchData.todo);
      setError("");

      const nextSelectedId = preserveSelectedId || "";
      if (nextSelectedId) {
        await loadAssignmentDetail(nextSelectedId);
      }
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
        const items = await questionsAPI.list();
        if (!active) return;
        setQuestionBank(Array.isArray(items) ? items : []);
      } catch {
        if (!active) return;
        setQuestionBank([]);
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
        const items = await classesAPI.list();
        if (!active) return;
        setClasses(Array.isArray(items) ? items : []);
        setSelectedQueueClassId((prev) => prev || (Array.isArray(items) && items[0]?.id ? String(items[0].id) : ""));
        setAssignmentForm((prev) => {
          if ((!Array.isArray(items) || !items[0]?.id) || prev.classId || (Array.isArray(prev.classIds) && prev.classIds.length)) return prev;
          return { ...prev, classId: String(items[0].id), classIds: [String(items[0].id)] };
        });
      } catch {
        if (!active) return;
        setClasses([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedQueueClassId) {
      setQueueWritings([]);
      setQueueLoading(false);
      return;
    }

    let active = true;
    setQueueLoading(true);
    classesAPI.getWritings(selectedQueueClassId)
      .then((items) => {
        if (!active) return;
        setQueueWritings(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!active) return;
        setQueueWritings([]);
      })
      .finally(() => {
        if (!active) return;
        setQueueLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedQueueClassId]);

  useEffect(() => {
    if (manualTodoFilterUntil > Date.now()) return;
    const priorities = [
      { id: "exceptions", count: todo.exceptionCount, label: "异常待处理" },
      { id: "comments", count: todo.pendingComments, label: "待补教师评价" },
      { id: "gradings", count: todo.pendingGradings, label: "待批改作文" },
      { id: "drafts", count: todo.draftCount, label: "待发布草稿" },
      { id: "dueSoon", count: todo.dueSoonCount, label: "48小时内截止" },
    ];
    const nextPriority = priorities.find((item) => Number(item.count || 0) > 0);
    const nextFilter = nextPriority?.id || "all";
    if (nextFilter !== activeTodoFilter) setActiveTodoFilter(nextFilter);
    if (nextPriority) {
      setAutoFocusHint(`已优先聚焦「${nextPriority.label}」，当前有 ${nextPriority.count} 项更值得先处理。`);
    } else {
      setAutoFocusHint("");
    }
  }, [todo.exceptionCount, todo.pendingComments, todo.pendingGradings, todo.draftCount, todo.dueSoonCount, manualTodoFilterUntil, activeTodoFilter]);

  const handleAssignmentFieldChange = useCallback((key, value) => {
    setAssignmentForm((prev) => {
      if (key === "selectedTypeMix") {
        const nextMix = Array.isArray(value) ? value : [];
        const primary = [...nextMix].sort((a, b) => Number(b?.percentage || 0) - Number(a?.percentage || 0))[0]?.type || "";
        return {
          ...prev,
          selectedTypeMix: nextMix,
          selectedType: primary,
        };
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const clearAssignmentSelection = useCallback((options = {}) => {
    const { keepActionMessage = false } = options;
    setSelectedAssignmentId("");
    setAssignmentDetail(null);
    if (!keepActionMessage) {
      setActionMessage("");
    }
    setAssignmentForm((prev) => ({
      classId: prev.classId || (classes[0]?.id ? String(classes[0].id) : ""),
      classIds: Array.isArray(prev.classIds) && prev.classIds.length
        ? prev.classIds
        : (classes[0]?.id ? [String(classes[0].id)] : []),
      title: "",
      promptText: "",
      selectedType: "",
      selectedTypeMix: [],
      questionId: "",
      questionTitle: "",
      dueAt: "",
      allowLate: false,
      maxScore: 15,
    }));
  }, [classes]);

  const handlePickQuestion = useCallback((questionId) => {
    const picked = questionBank.find((item) => String(item.id) === String(questionId));
    if (!picked) return;
    setAssignmentForm((prev) => ({
      ...prev,
      questionId: String(picked.id),
      questionTitle: picked.title || "",
      title: prev.title?.trim() ? prev.title : (picked.title || prev.title),
      promptText: picked.promptText || prev.promptText,
      selectedType: picked.type || prev.selectedType,
      selectedTypeMix: picked.type ? [{ type: picked.type, percentage: 100 }] : prev.selectedTypeMix,
      maxScore: Number(picked.defaultScore || prev.maxScore || 15),
    }));
    setActionMessage(`已从题目来源带入「${picked.title || "未命名题目"}」`);
  }, [questionBank]);

  const runAssignmentAction = useCallback(async (runner, successMessage, assignmentId = selectedAssignmentId, options = {}) => {
    const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
    if (!normalizedAssignmentId) return;
    const { preserveSelection = true, afterSuccess = null } = options;
    try {
      setActionLoading(true);
      await runner();
      setActionMessage(successMessage);
      await loadWorkbench(preserveSelection ? normalizedAssignmentId : "");
      if (!preserveSelection) {
        clearAssignmentSelection({ keepActionMessage: true });
      }
      afterSuccess?.();
    } catch (err) {
      setActionMessage(err?.message || "操作失败，请稍后再试");
    } finally {
      setActionLoading(false);
    }
  }, [clearAssignmentSelection, loadWorkbench, selectedAssignmentId]);

  const handleSaveDraft = useCallback(() => {
    if (!selectedAssignmentId) return;
    const mixTotal = (assignmentForm.selectedTypeMix || []).reduce((sum, item) => sum + Number(item?.percentage || 0), 0);
    if ((assignmentForm.selectedTypeMix || []).length > 0 && mixTotal !== 100) {
      setActionMessage("题型占比总和需要等于 100%");
      return;
    }
    return runAssignmentAction(
      () => assignmentsAPI.update(selectedAssignmentId, {
        title: assignmentForm.title,
        promptText: assignmentForm.promptText,
        selectedType: assignmentForm.selectedType,
        selectedTypeMix: assignmentForm.selectedTypeMix || [],
        selectedThemes: assignmentDetail?.assignment?.selectedThemes || [],
        maxScore: Number(assignmentForm.maxScore || assignmentDetail?.assignment?.maxScore || 15),
        dueAt: assignmentForm.dueAt ? new Date(assignmentForm.dueAt).getTime() : null,
        allowLate: assignmentForm.allowLate,
        questionId: assignmentForm.questionId || null,
        questionTitle: assignmentForm.questionTitle || "",
      }),
      "草稿已更新"
    );
  }, [assignmentDetail, assignmentForm, runAssignmentAction, selectedAssignmentId]);

  const handleCreateDraft = useCallback(async () => {
    const validationMessage = validateAssignmentForm(assignmentForm);
    if (validationMessage) {
      setActionMessage(validationMessage);
      return;
    }

    try {
      setActionLoading(true);
      const selectedClassIds = selectedClassIdsFromForm(assignmentForm);
      const results = await createAssignmentsForClasses(assignmentForm);
      const createdId = results[0]?.assignment?.id || "";
      setActionMessage(selectedClassIds.length > 1 ? `已为 ${selectedClassIds.length} 个班级创建草稿` : "草稿已创建");
      await loadWorkbench(createdId);
    } catch (err) {
      setActionMessage(err?.message || "创建草稿失败，请稍后再试");
    } finally {
      setActionLoading(false);
    }
  }, [assignmentForm, loadWorkbench]);

  const handleCreateAndPublish = useCallback(async () => {
    const validationMessage = validateAssignmentForm(assignmentForm);
    if (validationMessage) {
      setActionMessage(validationMessage);
      return;
    }

    try {
      setActionLoading(true);
      const selectedClassIds = selectedClassIdsFromForm(assignmentForm);
      await createAndPublishAssignmentsForClasses(assignmentForm);
      setActionMessage(selectedClassIds.length > 1 ? `已为 ${selectedClassIds.length} 个班级发布任务` : "任务已发布");
      await loadWorkbench("");
      clearAssignmentSelection({ keepActionMessage: true });
      onReturnToWorkbench?.();
    } catch (err) {
      setActionMessage(err?.message || "发布任务失败，请稍后再试");
    } finally {
      setActionLoading(false);
    }
  }, [assignmentForm, clearAssignmentSelection, loadWorkbench, onReturnToWorkbench]);

  const handlePublish = useCallback(
    (assignmentId = selectedAssignmentId) => {
      const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
      return runAssignmentAction(
      () => assignmentsAPI.publish(normalizedAssignmentId),
      "作业已发布",
      normalizedAssignmentId,
      { preserveSelection: false, afterSuccess: () => onReturnToWorkbench?.() }
    );
    },
    [onReturnToWorkbench, runAssignmentAction, selectedAssignmentId]
  );
  const handleClose = useCallback(
    (assignmentId = selectedAssignmentId) => {
      const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
      return runAssignmentAction(
      () => assignmentsAPI.close(normalizedAssignmentId),
      "作业已关闭",
      normalizedAssignmentId,
      { preserveSelection: false, afterSuccess: () => onReturnToWorkbench?.() }
    );
    },
    [onReturnToWorkbench, runAssignmentAction, selectedAssignmentId]
  );
  const handleArchive = useCallback((assignmentId = selectedAssignmentId) => {
    const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
    return runAssignmentAction(
      () => assignmentsAPI.archive(normalizedAssignmentId),
      "作业已归档",
      normalizedAssignmentId
    );
  }, [runAssignmentAction, selectedAssignmentId]);

  const handleExport = useCallback(async (assignmentId = selectedAssignmentId, type = "detail") => {
    const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
    if (!normalizedAssignmentId) return;
    try {
      setActionLoading(true);
      const result = await assignmentsAPI.export(normalizedAssignmentId, type);
      setActionMessage(`${result?.filename || "班级数据"} 已开始下载`);
    } catch (err) {
      setActionMessage(err?.message || "导出失败，请稍后再试");
    } finally {
      setActionLoading(false);
    }
  }, [selectedAssignmentId]);

  const handleExportPdf = useCallback(async (assignmentId = selectedAssignmentId, modules = []) => {
    const normalizedAssignmentId = normalizeAssignmentId(assignmentId) || selectedAssignmentId;
    if (!normalizedAssignmentId || !modules.length) return;
    try {
      setActionLoading(true);
      const payload = await assignmentsAPI.getExportData(normalizedAssignmentId);
      exportAssignmentPdf({ payload, modules });
      setActionMessage("PDF 导出面板已打开，请在打印面板中保存为 PDF");
    } catch (err) {
      setActionMessage(err?.message || "PDF 导出失败，请稍后再试");
    } finally {
      setActionLoading(false);
    }
  }, [selectedAssignmentId]);

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

  const visibleSections = {
    drafts: activeTodoFilter === "all" || activeTodoFilter === "drafts",
    dueSoon: activeTodoFilter === "all" || activeTodoFilter === "dueSoon",
    gradings: activeTodoFilter === "all" || activeTodoFilter === "gradings",
    comments: activeTodoFilter === "all" || activeTodoFilter === "comments",
    exceptions: activeTodoFilter === "all" || activeTodoFilter === "exceptions",
  };

  const gradingClassOptions = Array.from(new Set(pendingGradings.map((item) => item.className).filter(Boolean)));
  const filteredPendingGradings = gradingClassFilter === "all" ? pendingGradings : pendingGradings.filter((item) => item.className === gradingClassFilter);
  const commentClassOptions = Array.from(new Set(pendingComments.map((item) => item.className).filter(Boolean)));
  const filteredPendingComments = commentClassFilter === "all" ? pendingComments : pendingComments.filter((item) => item.className === commentClassFilter);

  useEffect(() => {
    if (gradingClassFilter !== "all" && !gradingClassOptions.includes(gradingClassFilter)) setGradingClassFilter("all");
  }, [gradingClassFilter, gradingClassOptions]);

  useEffect(() => {
    if (commentClassFilter !== "all" && !commentClassOptions.includes(commentClassFilter)) setCommentClassFilter("all");
  }, [commentClassFilter, commentClassOptions]);

  useEffect(() => {
    try {
      window.localStorage.setItem(todoFilterStorageKey, JSON.stringify({ gradingClassFilter, commentClassFilter }));
    } catch {
      // ignore storage failures
    }
  }, [commentClassFilter, gradingClassFilter, todoFilterStorageKey]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const timer = window.setTimeout(() => {
      usersAPI.updateProfile({
        preferences: {
          teacherWorkbenchFilters: { gradingClassFilter, commentClassFilter },
        },
      }).catch(() => {});
    }, 350);
    return () => window.clearTimeout(timer);
  }, [commentClassFilter, gradingClassFilter, user?.id]);

  const gradingRiskCount = useMemo(() => pendingGradings.filter((item) => getWritingRiskFlags(item).isHighRisk).length, [pendingGradings]);
  const gradingOffTopicCount = useMemo(() => pendingGradings.filter((item) => getWritingRiskFlags(item).isOffTopic).length, [pendingGradings]);
  const commentRiskCount = useMemo(() => pendingComments.filter((item) => getWritingRiskFlags(item).isHighRisk).length, [pendingComments]);
  const commentOffTopicCount = useMemo(() => pendingComments.filter((item) => getWritingRiskFlags(item).isOffTopic).length, [pendingComments]);

  return {
    state: {
      assignments,
      classes,
      selectedQueueClassId,
      queueWritings,
      queueLoading,
      draftAssignments,
      dueSoonAssignments,
      activeTodoFilter,
      selectedAssignmentId,
      assignmentDetail,
      assignmentForm,
      questionBank,
      pendingGradings,
      pendingComments,
      exceptions,
      autoFocusHint,
      gradingClassFilter,
      commentClassFilter,
      todo,
      loading,
      error,
      detailLoading,
      actionLoading,
      actionMessage,
      visibleSections,
      gradingClassOptions,
      filteredPendingGradings,
      commentClassOptions,
      filteredPendingComments,
      gradingRiskCount,
      gradingOffTopicCount,
      commentRiskCount,
      commentOffTopicCount,
    },
    actions: {
      setActiveTodoFilter,
      setManualTodoFilterUntil,
      setGradingClassFilter,
      setCommentClassFilter,
      loadAssignmentDetail,
      clearAssignmentSelection,
      setSelectedQueueClassId,
      handleAssignmentFieldChange,
      handleCreateDraft,
      handleCreateAndPublish,
      handlePickQuestion,
      handleSaveDraft,
      handlePublish,
      handleClose,
      handleArchive,
      handleExport,
      handleExportPdf,
      handleOpenWriting,
    },
  };
}
