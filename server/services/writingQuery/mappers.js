import { buildAnalysisMeta, safeJsonParse } from '../../utils/writingFeedback.js';
import { buildFeedbackStatusSnapshot } from '../feedbackService.js';
import { getQuestionAnalysisQueueState } from '../questionAnalysisQueueService.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeJsonScalar(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const parsed = safeJsonParse(trimmed, undefined);
  if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean') {
    return parsed;
  }
  return value;
}

function buildLightweightFeedback(row) {
  const totalScore = normalizeJsonScalar(row.total_score);
  const tier = normalizeJsonScalar(row.tier);
  const summary = normalizeJsonScalar(row.fb_summary);
  const categories = safeJsonParse(row.fb_categories, []);
  const grammarIssues = safeJsonParse(row.fb_grammar, []);
  const weaknesses = safeJsonParse(row.fb_weaknesses, []);
  const highlights = safeJsonParse(row.fb_highlights, {});

  const hasMeaningfulFeedback =
    (totalScore !== null && totalScore !== undefined && totalScore !== '') ||
    Boolean(String(summary || '').trim()) ||
    (Array.isArray(categories) && categories.length > 0) ||
    (Array.isArray(grammarIssues) && grammarIssues.length > 0) ||
    (Array.isArray(weaknesses) && weaknesses.length > 0) ||
    (isPlainObject(highlights) && Object.keys(highlights).length > 0);

  if (!hasMeaningfulFeedback) return null;

  return {
    totalScore,
    tier,
    summary,
    categories,
    grammarIssues,
    weaknesses,
    highlights,
  };
}

export function mapWritingDetail(row) {
  const feedback = safeJsonParse(row.feedback, null);
  const task = row?.task_status ? {
    status: row.task_status,
    queueName: row.task_queue_name,
    attempts: row.task_attempts,
    errorMessage: row.task_error_message,
    nextRunAt: row.task_next_run_at,
    lastHeartbeatAt: row.task_last_heartbeat_at,
    deadLetteredAt: row.task_dead_lettered_at,
  } : null;
  const analysisMeta = buildAnalysisMeta(feedback || {}, row.selected_type, {
    queueState: getQuestionAnalysisQueueState(row.id, task),
  });
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    className: row.class_name,
    assignmentId: row.assignment_id || null,
    questionId: row.question_id,
    writingTitle: row.writing_title,
    promptText: row.prompt_text || '',
    selectedType: row.selected_type,
    selectedThemes: safeJsonParse(row.selected_themes, []),
    textSnippet: row.text_snippet,
    fullText: row.full_text,
    wordCount: row.word_count,
    maxScore: row.max_score,
    feedback: feedback ? { ...feedback, selectedType: feedback.selectedType || row.selected_type } : null,
    analysisMeta,
    teacherComment: safeJsonParse(row.teacher_comment, null),
    image: safeJsonParse(row.image_data, null),
    submittedByTeacher: safeJsonParse(row.submitted_by_teacher, null),
    source: row.source || 'self',
    versionGroupId: row.version_group_id || row.id,
    versionNo: row.version_no || 1,
    previousWritingId: row.previous_writing_id || null,
    versions: Array.isArray(row.versions) ? row.versions : null,
    createdAt: row.created_at,
  };
}

export function mapWritingListItem(row) {
  const lightweightFeedback = buildLightweightFeedback(row);
  const feedbackStatus = buildFeedbackStatusSnapshot(row, {
    detailedTaskStatus: row.detailed_task_status,
    quickTaskStatus: row.grading_task_status,
    supplementalStatus: row.supplemental_status,
    feedbackOverride: lightweightFeedback,
  });
  const task = row?.task_status ? {
    status: row.task_status,
    queueName: row.task_queue_name,
    attempts: row.task_attempts,
    errorMessage: row.task_error_message,
    nextRunAt: row.task_next_run_at,
    lastHeartbeatAt: row.task_last_heartbeat_at,
    deadLetteredAt: row.task_dead_lettered_at,
  } : null;
  const analysisMeta = buildAnalysisMeta(
    {
      status: row.analysis_status,
      updatedAt: row.analysis_updated_at,
      degraded: row.analysis_degraded,
      errorCode: row.analysis_error_code,
      analysisMeta: {
        updatedAt: row.analysis_updated_at,
        degraded: row.analysis_degraded,
        errorCode: row.analysis_error_code,
        timings: safeJsonParse(row.analysis_timings, null),
        schema: safeJsonParse(row.analysis_schema, null),
        retryCount: row.analysis_retry_count,
        lastAttemptAt: row.analysis_last_attempt_at,
        lastSuccessAt: row.analysis_last_success_at,
        lastFailureAt: row.analysis_last_failure_at,
        lastError: row.analysis_last_error,
        queueState: getQuestionAnalysisQueueState(row.id, task),
      },
    },
    row.selected_type,
    {
      updatedAt: row.analysis_updated_at,
      degraded: row.analysis_degraded,
      errorCode: row.analysis_error_code,
      retryCount: row.analysis_retry_count,
      lastAttemptAt: row.analysis_last_attempt_at,
      lastSuccessAt: row.analysis_last_success_at,
      lastFailureAt: row.analysis_last_failure_at,
      lastError: row.analysis_last_error,
      queueState: getQuestionAnalysisQueueState(row.id, task),
    }
  );
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    className: row.class_name,
    assignmentId: row.assignment_id || null,
    questionId: row.question_id,
    writingTitle: row.writing_title,
    promptText: row.prompt_text || '',
    selectedType: row.selected_type,
    selectedThemes: safeJsonParse(row.selected_themes, []),
    textSnippet: row.text_snippet,
    wordCount: row.word_count,
    maxScore: row.max_score,
    source: row.source || 'self',
    submittedByTeacher: safeJsonParse(row.submitted_by_teacher, null),
    teacherComment: safeJsonParse(row.teacher_comment, null)?.content || null,
    createdAt: row.created_at,
    feedbackStatus,
    analysisMeta,
    feedback: lightweightFeedback,
    versionGroupId: row.version_group_id || row.id,
    versionNo: row.version_no || 1,
    previousWritingId: row.previous_writing_id || null,
  };
}
