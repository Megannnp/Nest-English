import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import { listAssignmentSubmissionRows } from '../services/assignmentSubmissionRowsService.js';
import { mapDueSoonAssignment, mapPendingComment, mapWorkbenchDraft } from '../services/teacherWorkbench/mappers.js';
import { isDueSoonAssignment, normalizeAssignmentStatus } from '../services/teacherWorkbench/status.js';

test('teacher workbench status keeps legacy active assignments as published', () => {
  assert.equal(normalizeAssignmentStatus('active'), 'published');
  assert.equal(normalizeAssignmentStatus('published'), 'published');
  assert.equal(normalizeAssignmentStatus(''), 'draft');
  assert.equal(normalizeAssignmentStatus(null), 'draft');
});

test('teacher workbench due-soon logic only includes published assignments within 48 hours', () => {
  const now = 1_000_000;
  assert.equal(isDueSoonAssignment({ status: 'published', dueAt: now + 60_000 }, now), true);
  assert.equal(isDueSoonAssignment({ status: 'active', dueAt: now + 60_000 }, now), true);
  assert.equal(isDueSoonAssignment({ status: 'draft', dueAt: now + 60_000 }, now), false);
  assert.equal(isDueSoonAssignment({ status: 'published', dueAt: now - 60_000 }, now), false);
  assert.equal(isDueSoonAssignment({ status: 'published', dueAt: now + 49 * 60 * 60 * 1000 }, now), false);
});

test('teacher workbench mappers normalize display fallbacks and numeric fields', () => {
  assert.deepEqual(mapWorkbenchDraft({
    id: 'assignment-1',
    classId: 'class-1',
    className: '',
    status: 'published',
    title: '',
    maxScore: '15',
    dueAt: 123,
    updatedAt: null,
    createdAt: 100,
  }), {
    id: 'assignment-1',
    classId: 'class-1',
    className: '',
    classNames: [],
    status: 'published',
    title: '未命名作业',
    maxScore: 15,
    dueAt: 123,
    createdAt: 100,
    updatedAt: 100,
  });

  assert.deepEqual(mapDueSoonAssignment({
    id: 'assignment-2',
    class_id: 'class-2',
    class_name: '一班',
    title: '',
    max_score: '20',
    due_at: 456,
    updated_at: 400,
    total_count: '10',
    returned_count: '6',
    unfinished_count: '4',
  }), {
    id: 'assignment-2',
    classId: 'class-2',
    className: '一班',
    title: '未命名作业',
    maxScore: 20,
    dueAt: 456,
    updatedAt: 400,
    totalCount: 10,
    returnedCount: 6,
    unfinishedCount: 4,
  });

  assert.equal(mapPendingComment({
    id: 'writing-1',
    user_id: 'student-1',
    user_name: 'Amy',
    class_id: 'class-1',
    class_name: '一班',
    assignment_id: 'assignment-1',
    assignment_title: '',
    writing_title: '',
    created_at: 789,
    task_status: 'returned',
    max_score: '15',
    total_score: '13',
    quick_summary: '',
  }).assignmentTitle, '未命名任务');
});

test('assignment submission rows pushes gradings queue filtering into SQL before limit', async (t) => {
  let capturedSql = '';
  let capturedParams = [];
  t.mock.method(db.pool, 'query', async (sql, params = []) => {
    capturedSql = String(sql);
    capturedParams = params;
    return [[], []];
  });

  await listAssignmentSubmissionRows({
    teacherId: 'teacher-1',
    limit: 20,
    queueFilter: 'gradings',
  });

  assert.match(capturedSql, /t\.status IN \('submitted', 'grading'\)/);
  assert.match(capturedSql, /t\.status = 'returned'/);
  assert.match(capturedSql, /JSON_EXTRACT\(w\.feedback, '\$\.totalScore'\) IS NULL/);
  assert.equal(capturedParams.at(-1), 20);
});

test('assignment submission rows pushes pending-comment filtering into SQL before limit', async (t) => {
  let capturedSql = '';
  let capturedParams = [];
  t.mock.method(db.pool, 'query', async (sql, params = []) => {
    capturedSql = String(sql);
    capturedParams = params;
    return [[], []];
  });

  await listAssignmentSubmissionRows({
    teacherId: 'teacher-1',
    limit: 20,
    queueFilter: 'pending_comments',
  });

  assert.match(capturedSql, /t\.status = 'returned'/);
  assert.match(capturedSql, /JSON_EXTRACT\(w\.feedback, '\$\.totalScore'\) IS NOT NULL/);
  assert.equal(capturedParams.at(-1), 20);
});
