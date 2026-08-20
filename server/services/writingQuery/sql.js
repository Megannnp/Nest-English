export const WRITING_LIST_SQL = `
  SELECT writings.id AS id, user_id, user_name, class_name, question_id, assignment_id,
    writing_title, prompt_text, selected_type, selected_themes,
    text_snippet, word_count, max_score, source,
    submitted_by_teacher, teacher_comment, writings.created_at AS created_at,
    JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.totalScore'))    as total_score,
    JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.tier'))          as tier,
    JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.summary'))       as fb_summary,
    JSON_EXTRACT(feedback, '$.categories')    as fb_categories,
    COALESCE(
      JSON_EXTRACT(feedback, '$.grammarIssues'),
      JSON_EXTRACT(feedback, '$.grammar'),
      JSON_EXTRACT(feedback, '$.grammar_errors')
    ) as fb_grammar,
    JSON_EXTRACT(feedback, '$.weaknesses')    as fb_weaknesses,
    JSON_EXTRACT(feedback, '$.highlights')    as fb_highlights,
    JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.status'))      as analysis_status,
    JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.updatedAt'))   as analysis_updated_at,
    JSON_EXTRACT(feedback, '$.degraded')                  as analysis_degraded,
    JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.errorCode'))   as analysis_error_code,
    JSON_EXTRACT(feedback, '$.analysisMeta.timings')      as analysis_timings,
    JSON_EXTRACT(feedback, '$.analysisMeta.schema')       as analysis_schema,
    JSON_EXTRACT(feedback, '$.analysisMeta.retryCount')   as analysis_retry_count,
    JSON_EXTRACT(feedback, '$.analysisMeta.lastAttemptAt') as analysis_last_attempt_at,
    JSON_EXTRACT(feedback, '$.analysisMeta.lastSuccessAt') as analysis_last_success_at,
    JSON_EXTRACT(feedback, '$.analysisMeta.lastFailureAt') as analysis_last_failure_at,
    JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.analysisMeta.lastError')) as analysis_last_error,
    JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.analysisMeta.queueState')) as analysis_queue_state,
    JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.analysisMeta.supplementalStatus')) as supplemental_status,
    qa.status as task_status,
    qa.queue_name as task_queue_name,
    qa.attempts as task_attempts,
    qa.error_message as task_error_message,
    qa.next_run_at as task_next_run_at,
    qa.last_heartbeat_at as task_last_heartbeat_at,
    qa.dead_lettered_at as task_dead_lettered_at,
    grading.status as grading_task_status,
    detailed.status as detailed_task_status
  FROM writings
  LEFT JOIN writing_tasks qa ON qa.writing_id = writings.id AND qa.task_type = 'question_analysis'
  LEFT JOIN writing_tasks grading ON grading.writing_id = writings.id AND grading.task_type = 'grading'
  LEFT JOIN writing_tasks detailed ON detailed.writing_id = writings.id AND detailed.task_type = 'detailed_feedback'
  WHERE user_id = ?
  ORDER BY writings.created_at DESC LIMIT 50
`;
