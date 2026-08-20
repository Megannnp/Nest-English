import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { mapWritingDetail, mapWritingListItem } from '../services/writingQuery/mappers.js';

// ── mapWritingDetail version fields ─────────────────────────────────────────

test('mapWritingDetail includes version fields with defaults for legacy row', () => {
  const row = {
    id: 'w1',
    user_id: 'u1',
    user_name: '张三',
    class_name: '',
    question_id: null,
    assignment_id: null,
    writing_title: '测试作文',
    prompt_text: '',
    selected_type: 'argumentative',
    selected_themes: '[]',
    text_snippet: '',
    full_text: '正文内容',
    word_count: 100,
    max_score: 15,
    feedback: null,
    teacher_comment: null,
    image_data: null,
    submitted_by_teacher: null,
    source: 'self',
    created_at: 1700000000000,
    // version fields absent (legacy row)
    version_group_id: null,
    version_no: null,
    previous_writing_id: null,
  };

  const result = mapWritingDetail(row);

  // Legacy row: version_group_id falls back to id, version_no defaults to 1
  assert.equal(result.versionGroupId, 'w1');
  assert.equal(result.versionNo, 1);
  assert.equal(result.previousWritingId, null);
  assert.equal(result.versions, null);
});

test('mapWritingDetail reflects version fields for a revision row', () => {
  const row = {
    id: 'w2',
    user_id: 'u1',
    user_name: '张三',
    class_name: '',
    question_id: null,
    assignment_id: null,
    writing_title: '测试作文',
    prompt_text: '',
    selected_type: 'argumentative',
    selected_themes: '[]',
    text_snippet: '',
    full_text: '第二稿正文',
    word_count: 120,
    max_score: 15,
    feedback: null,
    teacher_comment: null,
    image_data: null,
    submitted_by_teacher: null,
    source: 'self',
    created_at: 1700001000000,
    version_group_id: 'w1',
    version_no: 2,
    previous_writing_id: 'w1',
  };

  const result = mapWritingDetail(row);

  assert.equal(result.versionGroupId, 'w1');
  assert.equal(result.versionNo, 2);
  assert.equal(result.previousWritingId, 'w1');
});

test('mapWritingDetail passes through versions array when present on row', () => {
  const versions = [
    { id: 'w1', versionNo: 1, previousWritingId: null, createdAt: 1700000000000, wordCount: 100, isCurrent: false },
    { id: 'w2', versionNo: 2, previousWritingId: 'w1', createdAt: 1700001000000, wordCount: 120, isCurrent: true },
  ];

  const row = {
    id: 'w2',
    user_id: 'u1',
    user_name: '张三',
    class_name: '',
    question_id: null,
    assignment_id: null,
    writing_title: '测试作文',
    prompt_text: '',
    selected_type: 'argumentative',
    selected_themes: '[]',
    text_snippet: '',
    full_text: '第二稿正文',
    word_count: 120,
    max_score: 15,
    feedback: null,
    teacher_comment: null,
    image_data: null,
    submitted_by_teacher: null,
    source: 'self',
    created_at: 1700001000000,
    version_group_id: 'w1',
    version_no: 2,
    previous_writing_id: 'w1',
    versions,
  };

  const result = mapWritingDetail(row);

  assert.deepEqual(result.versions, versions);
});

// ── mapWritingListItem version fields ────────────────────────────────────────

test('mapWritingListItem includes version fields', () => {
  const row = {
    id: 'w3',
    user_id: 'u1',
    user_name: '李四',
    class_name: '',
    question_id: null,
    assignment_id: null,
    writing_title: '议论文练习',
    prompt_text: '',
    selected_type: 'argumentative',
    selected_themes: '[]',
    text_snippet: '简短摘要',
    word_count: 200,
    max_score: 15,
    source: 'self',
    submitted_by_teacher: null,
    teacher_comment: null,
    created_at: 1700002000000,
    version_group_id: 'w3',
    version_no: 1,
    previous_writing_id: null,
    // lightweight feedback fields expected by mapWritingListItem
    total_score: null,
    tier: null,
    fb_summary: null,
    fb_categories: null,
    fb_grammar: null,
    fb_weaknesses: null,
    fb_highlights: null,
    detailed_task_status: null,
    grading_task_status: null,
    supplemental_status: null,
    analysis_status: null,
    analysis_updated_at: null,
    analysis_degraded: null,
    analysis_error_code: null,
    analysis_timings: null,
    analysis_schema: null,
    analysis_retry_count: null,
    analysis_last_attempt_at: null,
    analysis_last_success_at: null,
    analysis_last_failure_at: null,
    analysis_last_error: null,
    task_status: null,
    task_queue_name: null,
    task_attempts: null,
    task_error_message: null,
    task_next_run_at: null,
    task_last_heartbeat_at: null,
    task_dead_lettered_at: null,
  };

  const result = mapWritingListItem(row);

  assert.equal(result.versionGroupId, 'w3');
  assert.equal(result.versionNo, 1);
  assert.equal(result.previousWritingId, null);
});

test('mapWritingListItem: legacy row with no version fields defaults correctly', () => {
  const row = {
    id: 'legacy1',
    user_id: 'u1',
    user_name: '老数据',
    class_name: '',
    question_id: null,
    assignment_id: null,
    writing_title: '旧作文',
    prompt_text: '',
    selected_type: 'general',
    selected_themes: '[]',
    text_snippet: '',
    word_count: 50,
    max_score: 15,
    source: 'self',
    submitted_by_teacher: null,
    teacher_comment: null,
    created_at: 1600000000000,
    version_group_id: null,
    version_no: null,
    previous_writing_id: null,
    total_score: null,
    tier: null,
    fb_summary: null,
    fb_categories: null,
    fb_grammar: null,
    fb_weaknesses: null,
    fb_highlights: null,
    detailed_task_status: null,
    grading_task_status: null,
    supplemental_status: null,
    analysis_status: null,
    analysis_updated_at: null,
    analysis_degraded: null,
    analysis_error_code: null,
    analysis_timings: null,
    analysis_schema: null,
    analysis_retry_count: null,
    analysis_last_attempt_at: null,
    analysis_last_success_at: null,
    analysis_last_failure_at: null,
    analysis_last_error: null,
    task_status: null,
    task_queue_name: null,
    task_attempts: null,
    task_error_message: null,
    task_next_run_at: null,
    task_last_heartbeat_at: null,
    task_dead_lettered_at: null,
  };

  const result = mapWritingListItem(row);

  // Falls back to id when version_group_id is null
  assert.equal(result.versionGroupId, 'legacy1');
  assert.equal(result.versionNo, 1);
  assert.equal(result.previousWritingId, null);
});
