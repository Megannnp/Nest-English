import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { mapWritingListItem } from '../services/writingQuery/mappers.js';

test('mapWritingListItem unquotes JSON scalar feedback fields from list SQL', () => {
  const item = mapWritingListItem({
    id: 'writing-1',
    user_id: 'user-1',
    user_name: 'Student',
    class_name: 'Class A',
    question_id: null,
    assignment_id: null,
    writing_title: 'My Letter',
    prompt_text: '',
    selected_type: 'letter',
    selected_themes: '[]',
    text_snippet: 'Dear Tom...',
    word_count: 120,
    max_score: 15,
    source: 'self',
    submitted_by_teacher: null,
    teacher_comment: null,
    created_at: 1000,
    total_score: '12',
    tier: '"第四档"',
    fb_summary: '"交际目的清楚，但细节不足。"',
    fb_categories: '[]',
    fb_grammar: '[]',
    fb_weaknesses: '[]',
    fb_highlights: '{}',
    analysis_status: 'ready',
    grading_task_status: 'success',
    detailed_task_status: null,
    supplemental_status: null,
  });

  assert.equal(item.feedback.totalScore, 12);
  assert.equal(item.feedback.tier, '第四档');
  assert.equal(item.feedback.summary, '交际目的清楚，但细节不足。');
  assert.equal(item.feedbackStatus.quickFeedbackStatus, 'ready');
});

test('mapWritingListItem keeps grammar fallback extracted by list SQL', () => {
  const item = mapWritingListItem({
    id: 'writing-2',
    user_id: 'user-1',
    user_name: 'Student',
    class_name: 'Class A',
    question_id: null,
    assignment_id: null,
    writing_title: 'My Essay',
    prompt_text: '',
    selected_type: 'general',
    selected_themes: '[]',
    text_snippet: 'He go...',
    word_count: 100,
    max_score: 15,
    source: 'self',
    submitted_by_teacher: null,
    teacher_comment: null,
    created_at: 1000,
    total_score: null,
    tier: null,
    fb_summary: null,
    fb_categories: '[]',
    fb_grammar: '[{"type":"主谓一致","original":"He go","corrected":"He goes"}]',
    fb_weaknesses: '[]',
    fb_highlights: '{}',
    analysis_status: 'ready',
    grading_task_status: 'success',
    detailed_task_status: null,
    supplemental_status: null,
  });

  assert.equal(item.feedback.grammarIssues.length, 1);
  assert.equal(item.feedback.grammarIssues[0].corrected, 'He goes');
  assert.equal(item.feedbackStatus.quickFeedbackStatus, 'ready');
});

test('mapWritingListItem marks successful quick task without lightweight feedback as failed', () => {
  const item = mapWritingListItem({
    id: 'writing-3',
    user_id: 'user-1',
    user_name: 'Student',
    class_name: 'Class A',
    question_id: null,
    assignment_id: null,
    writing_title: 'Empty Feedback',
    prompt_text: '',
    selected_type: 'general',
    selected_themes: '[]',
    text_snippet: 'Draft...',
    word_count: 100,
    max_score: 15,
    source: 'self',
    submitted_by_teacher: null,
    teacher_comment: null,
    created_at: 1000,
    total_score: null,
    tier: null,
    fb_summary: null,
    fb_categories: '[]',
    fb_grammar: '[]',
    fb_weaknesses: '[]',
    fb_highlights: '{}',
    analysis_status: 'ready',
    grading_task_status: 'success',
    detailed_task_status: null,
    supplemental_status: null,
  });

  assert.equal(item.feedback, null);
  assert.equal(item.feedbackStatus.quickFeedbackStatus, 'failed');
});
