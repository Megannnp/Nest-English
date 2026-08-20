export function mapWorkbenchDraft(item) {
  return {
    id: item.id,
    classId: item.classId,
    className: item.className || '',
    classNames: Array.isArray(item.classNames) ? item.classNames : [],
    status: item.status || 'draft',
    title: item.title || '未命名作业',
    maxScore: item.maxScore == null ? null : Number(item.maxScore),
    dueAt: item.dueAt || null,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || item.createdAt || null,
  };
}

export function mapDueSoonAssignment(row) {
  return {
    id: row.id,
    classId: row.class_id,
    className: row.class_name || '',
    title: row.title || '未命名作业',
    maxScore: row.max_score == null ? null : Number(row.max_score),
    dueAt: row.due_at || null,
    updatedAt: row.updated_at || null,
    totalCount: Number(row.total_count || 0),
    returnedCount: Number(row.returned_count || 0),
    unfinishedCount: Number(row.unfinished_count || 0),
  };
}

function _mapWorkbenchStatusFields(row) {
  return {
    recordType: row.recordType || row.record_type || 'writing',
    bindStatus: row.bindStatus || row.bind_status || '',
    gradingStatus: row.gradingStatus || row.grading_status || '',
    workflowStatus: row.workflowStatus || row.workflow_status || '',
    workflowLabel: row.workflowLabel || row.workflow_label || '',
    statusLabel: row.statusLabel || row.status_label || '',
  };
}

function _mapWorkbenchQueueFields(row) {
  return {
    nextAction: row.nextAction || row.next_action || '',
    queueSection: row.queueSection || row.queue_section || '',
    isPendingRoster: Boolean(row.isPendingRoster ?? row.is_pending_roster),
    taskStatus: row.taskStatus || row.task_status || '',
    quickSummary: row.quickSummary || row.quick_summary || '',
  };
}

function _mapWorkbenchIdentityFields(row) {
  return {
    userId: row.userId || row.studentId || row.user_id || null,
    rosterId: row.rosterId ?? row.roster_id ?? null,
    userName: row.userName || row.studentName || row.user_name || '',
    classId: row.classId || row.class_id || '',
    className: row.className || row.class_name || '',
  };
}

function _mapWorkbenchTitleFields(row) {
  return {
    assignmentId: row.assignmentId || row.assignment_id || '',
    assignmentTitle: row.assignmentTitle || row.assignment_title || '未命名任务',
    writingTitle: row.writingTitle || row.writing_title || '未命名写作',
  };
}

export function mapWorkbenchGrading(row) {
  const rawMaxScore = row.max_score ?? row.maxScore;
  const rawTotalScore = row.total_score ?? row.totalScore ?? row.latestScore;
  return {
    id: row.id,
    ..._mapWorkbenchStatusFields(row),
    ..._mapWorkbenchQueueFields(row),
    ..._mapWorkbenchIdentityFields(row),
    ..._mapWorkbenchTitleFields(row),
    createdAt: row.createdAt ?? row.created_at ?? null,
    maxScore: rawMaxScore == null ? null : Number(rawMaxScore),
    totalScore: rawTotalScore == null ? null : Number(rawTotalScore),
    teacherCommentReady: Boolean(row.teacherCommentReady ?? row.teacher_comment),
  };
}

export function mapPendingComment(row) {
  const rawMaxScore = row.max_score ?? row.maxScore;
  const rawTotalScore = row.total_score ?? row.totalScore ?? row.latestScore;
  return {
    id: row.id,
    ..._mapWorkbenchStatusFields(row),
    ..._mapWorkbenchQueueFields(row),
    ..._mapWorkbenchIdentityFields(row),
    ..._mapWorkbenchTitleFields(row),
    createdAt: row.createdAt ?? row.created_at ?? null,
    maxScore: rawMaxScore == null ? null : Number(rawMaxScore),
    totalScore: rawTotalScore == null ? null : Number(rawTotalScore),
  };
}

export function mapWorkbenchException(row) {
  return {
    id: row.id,
    taskType: row.task_type,
    status: row.status,
    errorMessage: row.error_message || '处理失败，请重试',
    updatedAt: row.updated_at,
    writingId: row.writing_id,
    userName: row.user_name || '未知学生',
    classId: row.class_id,
    className: row.class_name || '',
    assignmentTitle: row.assignment_title || '未命名任务',
  };
}
