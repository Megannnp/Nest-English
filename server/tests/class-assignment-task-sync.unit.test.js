import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAssignmentTaskSyncPayload,
  parseWritingLatestScore,
} from '../services/classAssignmentTaskSync.js';

test('class assignment task sync parses latest score from feedback payload safely', () => {
  assert.equal(parseWritingLatestScore(JSON.stringify({ totalScore: 88 })), 88);
  assert.equal(parseWritingLatestScore(JSON.stringify({ totalScore: '76' })), 76);
  assert.equal(parseWritingLatestScore(JSON.stringify({ totalScore: null })), null);
  assert.equal(parseWritingLatestScore('{bad-json'), null);
  assert.equal(parseWritingLatestScore(null), null);
});

test('class assignment task sync builds returned task payload when feedback score exists', () => {
  const payload = buildAssignmentTaskSyncPayload({
    id: 'writing-1',
    assignment_id: 'assignment-1',
    feedback: JSON.stringify({ totalScore: 92 }),
    created_at: 111,
    task_class_id: 'class-1',
  }, 'student-1', 500);

  assert.deepEqual(payload, {
    assignmentId: 'assignment-1',
    gradedAt: 500,
    latestScore: 92,
    now: 500,
    submittedAt: 111,
    taskClassId: 'class-1',
    taskStatus: 'returned',
    userId: 'student-1',
    writingId: 'writing-1',
  });
});

test('class assignment task sync builds grading task payload when feedback score is absent', () => {
  const payload = buildAssignmentTaskSyncPayload({
    id: 'writing-2',
    assignment_id: 'assignment-2',
    feedback: null,
    created_at: 0,
    task_class_id: 'class-2',
  }, 'student-2', 800);

  assert.deepEqual(payload, {
    assignmentId: 'assignment-2',
    gradedAt: null,
    latestScore: null,
    now: 800,
    submittedAt: 800,
    taskClassId: 'class-2',
    taskStatus: 'grading',
    userId: 'student-2',
    writingId: 'writing-2',
  });
});
