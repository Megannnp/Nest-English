export function getTodoFilterStorageKey(userId) {
  return `teacher-workbench-todo-filters:${userId || "anonymous"}`;
}

export function normalizeAssignmentId(value) {
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

export function createEmptyAssignmentForm(defaultClassId = "") {
  const classId = defaultClassId ? String(defaultClassId) : "";
  return {
    classId,
    classIds: classId ? [classId] : [],
    title: "",
    promptText: "",
    selectedType: "",
    selectedTypeMix: [],
    questionId: "",
    questionTitle: "",
    dueAt: "",
    allowLate: false,
    maxScore: 15,
  };
}

export function createEmptyTodoState() {
  return {
    draftCount: 0,
    publishedCount: 0,
    dueSoonCount: 0,
    pendingGradings: 0,
    pendingComments: 0,
    exceptionCount: 0,
  };
}

export function deriveAutoFocus(todo) {
  const priorities = [
    { id: "exceptions", count: todo.exceptionCount, label: "异常待处理" },
    { id: "comments", count: todo.pendingComments, label: "待补教师评价" },
    { id: "gradings", count: todo.pendingGradings, label: "待批改作文" },
    { id: "drafts", count: todo.draftCount, label: "待发布草稿" },
    { id: "dueSoon", count: todo.dueSoonCount, label: "48小时内截止" },
  ];
  const nextPriority = priorities.find((item) => Number(item.count || 0) > 0);
  return {
    nextFilter: nextPriority?.id || "all",
    hint: nextPriority
      ? `已优先聚焦「${nextPriority.label}」，当前有 ${nextPriority.count} 项更值得先处理。`
      : "",
  };
}

export function buildVisibleSections(activeTodoFilter) {
  return {
    drafts: activeTodoFilter === "all" || activeTodoFilter === "drafts",
    dueSoon: activeTodoFilter === "all" || activeTodoFilter === "dueSoon",
    gradings: activeTodoFilter === "all" || activeTodoFilter === "gradings",
    comments: activeTodoFilter === "all" || activeTodoFilter === "comments",
    exceptions: activeTodoFilter === "all" || activeTodoFilter === "exceptions",
  };
}
