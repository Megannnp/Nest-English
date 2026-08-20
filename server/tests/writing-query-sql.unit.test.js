import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { WRITING_LIST_SQL } from '../services/writingQuery/sql.js';

test('writing list SQL joins task rows once per task type', () => {
  assert.equal((WRITING_LIST_SQL.match(/LEFT JOIN writing_tasks/g) || []).length, 3);
  assert.equal(/SELECT\s+wt\./.test(WRITING_LIST_SQL), false);
  assert.match(WRITING_LIST_SQL, /qa\.status as task_status/);
  assert.match(WRITING_LIST_SQL, /grading\.status as grading_task_status/);
  assert.match(WRITING_LIST_SQL, /detailed\.status as detailed_task_status/);
});
