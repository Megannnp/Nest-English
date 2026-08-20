import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createClassRosterBindingResultFixture,
  createClassRosterUnbindingResultFixture,
  createJoinClassResultFixture,
  createPendingCommentRow,
  createWorkbenchGradingRow,
} from './fixtures/contractFixtures.js';
import {
  mapBatchGradingJobDetail,
} from '../services/batchGradingDomain.js';
import {
  mapPendingComment,
  mapWorkbenchGrading,
} from '../services/teacherWorkbench/mappers.js';
import {
  batchGradingJobSchema,
  classRosterBindingResultSchema,
  classRosterUnbindingResultSchema,
  joinClassResultSchema,
  teacherWorkbenchGradingSchema,
  teacherWorkbenchPendingCommentSchema,
} from '../utils/schemas/contractSchemas.js';

test('teacher workbench grading and pending comment contracts stay stable', () => {
  const grading = mapWorkbenchGrading(createWorkbenchGradingRow());
  const pendingComment = mapPendingComment(createPendingCommentRow());

  assert.deepEqual(teacherWorkbenchGradingSchema.parse(grading, 'grading'), grading);
  assert.deepEqual(teacherWorkbenchPendingCommentSchema.parse(pendingComment, 'pendingComment'), pendingComment);
});

test('batch grading job contract stays stable after domain mapping', () => {
  const job = mapBatchGradingJobDetail({
    id: 'job-1',
    teacher_id: 'teacher-1',
    class_id: 'class-1',
    assignment_id: 'assignment-1',
    status: 'running',
    queue_name: 'batch_grading_worker',
    payload: '{"source":"teacher_batch"}',
    error_message: null,
    total_count: 2,
    processed_count: 1,
    success_count: 1,
    failed_count: 0,
    created_at: 100,
    updated_at: 200,
    started_at: 150,
    finished_at: null,
    last_heartbeat_at: 210,
  }, [
    {
      id: 'item-1',
      job_id: 'job-1',
      writing_id: 'writing-1',
      student_name: 'Amy',
      sort_order: 0,
      status: 'succeeded',
      attempts: 1,
      error_code: null,
      error_message: null,
      result: '{"totalScore":14,"summary":"结构完整","writingId":"writing-1"}',
      created_at: 100,
      updated_at: 200,
      started_at: 150,
      finished_at: 190,
      last_heartbeat_at: 188,
    },
  ]);

  assert.deepEqual(batchGradingJobSchema.parse(job, 'job'), job);
});

test('class join and roster binding contracts stay stable', () => {
  const joinResult = createJoinClassResultFixture();
  const bindingResult = createClassRosterBindingResultFixture();
  const unbindingResult = createClassRosterUnbindingResultFixture();

  assert.deepEqual(joinClassResultSchema.parse(joinResult, 'joinResult'), joinResult);
  assert.deepEqual(classRosterBindingResultSchema.parse(bindingResult, 'bindingResult'), bindingResult);
  assert.deepEqual(classRosterUnbindingResultSchema.parse(unbindingResult, 'unbindingResult'), unbindingResult);
});
