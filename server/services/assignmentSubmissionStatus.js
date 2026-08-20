export const SUBMISSION_BIND_STATUS = {
  BOUND: 'bound',
  PENDING_BINDING: 'pending_binding',
};

export const SUBMISSION_GRADING_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  GRADING: 'grading',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
};

export const SUBMISSION_WORKFLOW_STATUS = {
  PENDING_SUBMISSION: 'pending_submission',
  FEEDBACK_GENERATING: 'feedback_generating',
  FEEDBACK_READY: 'feedback_ready',
  AWAITING_TEACHER_REVIEW: 'awaiting_teacher_review',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
  PENDING_BINDING_GENERATING: 'pending_binding_feedback_generating',
  PENDING_BINDING_READY: 'pending_binding_feedback_ready',
};

const WORKFLOW_STATUS_META = {
  [SUBMISSION_WORKFLOW_STATUS.PENDING_SUBMISSION]: {
    label: '未提交',
    nextAction: 'wait_submission',
    queueSection: 'pending_submission',
  },
  [SUBMISSION_WORKFLOW_STATUS.FEEDBACK_GENERATING]: {
    label: '反馈生成中',
    nextAction: 'wait_feedback',
    queueSection: 'pending_grading',
  },
  [SUBMISSION_WORKFLOW_STATUS.FEEDBACK_READY]: {
    label: '反馈已生成',
    nextAction: 'view_feedback',
    queueSection: 'feedback_ready',
  },
  [SUBMISSION_WORKFLOW_STATUS.AWAITING_TEACHER_REVIEW]: {
    label: '待教师评价',
    nextAction: 'review_feedback',
    queueSection: 'pending_comment',
  },
  [SUBMISSION_WORKFLOW_STATUS.COMPLETED]: {
    label: '已完成',
    nextAction: 'completed',
    queueSection: 'completed',
  },
  [SUBMISSION_WORKFLOW_STATUS.OVERDUE]: {
    label: '已逾期',
    nextAction: 'follow_up',
    queueSection: 'overdue',
  },
  [SUBMISSION_WORKFLOW_STATUS.PENDING_BINDING_GENERATING]: {
    label: '待绑定，反馈生成中',
    nextAction: 'bind_account',
    queueSection: 'pending_binding',
  },
  [SUBMISSION_WORKFLOW_STATUS.PENDING_BINDING_READY]: {
    label: '待绑定，反馈已生成',
    nextAction: 'bind_account',
    queueSection: 'pending_binding',
  },
};

export function normalizeSubmissionBindStatus(recordType) {
  return recordType === 'pending_roster'
    ? SUBMISSION_BIND_STATUS.PENDING_BINDING
    : SUBMISSION_BIND_STATUS.BOUND;
}

export function normalizeSubmissionGradingStatus(rawStatus) {
  const normalized = String(rawStatus || '').trim().toLowerCase();
  if (Object.values(SUBMISSION_GRADING_STATUS).includes(normalized)) {
    return normalized;
  }
  return SUBMISSION_GRADING_STATUS.PENDING;
}

function isPendingBindingStatus(bindStatus) {
  return bindStatus === SUBMISSION_BIND_STATUS.PENDING_BINDING;
}

function isReturnedSubmission(gradingStatus) {
  return gradingStatus === SUBMISSION_GRADING_STATUS.RETURNED;
}

function isFeedbackGeneratingSubmission(gradingStatus) {
  return (
    gradingStatus === SUBMISSION_GRADING_STATUS.SUBMITTED
    || gradingStatus === SUBMISSION_GRADING_STATUS.GRADING
  );
}

export function deriveSubmissionWorkflowStatus({
  bindStatus,
  gradingStatus,
  feedbackGenerated,
  teacherCommentReady,
}) {
  if (isPendingBindingStatus(bindStatus)) {
    return feedbackGenerated
      ? SUBMISSION_WORKFLOW_STATUS.PENDING_BINDING_READY
      : SUBMISSION_WORKFLOW_STATUS.PENDING_BINDING_GENERATING;
  }

  if (gradingStatus === SUBMISSION_GRADING_STATUS.OVERDUE) {
    return SUBMISSION_WORKFLOW_STATUS.OVERDUE;
  }

  if (gradingStatus === SUBMISSION_GRADING_STATUS.PENDING) {
    return SUBMISSION_WORKFLOW_STATUS.PENDING_SUBMISSION;
  }

  if (isFeedbackGeneratingSubmission(gradingStatus)) {
    return SUBMISSION_WORKFLOW_STATUS.FEEDBACK_GENERATING;
  }

  if (isReturnedSubmission(gradingStatus)) {
    if (teacherCommentReady) {
      return SUBMISSION_WORKFLOW_STATUS.COMPLETED;
    }
    return SUBMISSION_WORKFLOW_STATUS.AWAITING_TEACHER_REVIEW;
  }

  return feedbackGenerated
    ? SUBMISSION_WORKFLOW_STATUS.FEEDBACK_READY
    : SUBMISSION_WORKFLOW_STATUS.FEEDBACK_GENERATING;
}

export function getSubmissionWorkflowMeta(workflowStatus) {
  return WORKFLOW_STATUS_META[workflowStatus] || WORKFLOW_STATUS_META[SUBMISSION_WORKFLOW_STATUS.PENDING_SUBMISSION];
}

function resolveSubmissionRecordType(row) {
  return row?.recordType || row?.record_type || 'task';
}

function resolveSubmissionFeedbackGenerated(row) {
  return Boolean(row?.feedbackGenerated || row?.total_score != null || row?.latest_score != null);
}

function resolveSubmissionTeacherCommentReady(row) {
  return Boolean(row?.teacherCommentReady || row?.teacher_comment);
}

function resolveBoundSubmissionGradingStatus(row) {
  return normalizeSubmissionGradingStatus(
    row?.gradingStatus || row?.raw_task_status || row?.taskStatus || row?.task_status
  );
}

function resolveSubmissionGradingStatus({ bindStatus, feedbackGenerated, row }) {
  if (isPendingBindingStatus(bindStatus)) {
    return feedbackGenerated
      ? SUBMISSION_GRADING_STATUS.RETURNED
      : SUBMISSION_GRADING_STATUS.GRADING;
  }

  return resolveBoundSubmissionGradingStatus(row);
}

export function deriveSubmissionStatusSummary(row) {
  const recordType = resolveSubmissionRecordType(row);
  const bindStatus = normalizeSubmissionBindStatus(recordType);
  const feedbackGenerated = resolveSubmissionFeedbackGenerated(row);
  const teacherCommentReady = resolveSubmissionTeacherCommentReady(row);
  const gradingStatus = resolveSubmissionGradingStatus({
    bindStatus,
    feedbackGenerated,
    row,
  });
  const workflowStatus = deriveSubmissionWorkflowStatus({
    bindStatus,
    gradingStatus,
    feedbackGenerated,
    teacherCommentReady,
  });
  const meta = getSubmissionWorkflowMeta(workflowStatus);

  return {
    bindStatus,
    gradingStatus,
    workflowStatus,
    workflowLabel: meta.label,
    statusLabel: meta.label,
    nextAction: meta.nextAction,
    queueSection: meta.queueSection,
  };
}
