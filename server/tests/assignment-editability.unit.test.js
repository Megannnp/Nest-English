import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import {
  assertAssignableQuestion,
  getAssignmentEffectiveClassIds,
  hasAssignmentClassSelectionChanged,
  isAssignmentClassSelectionMutable,
  isEditableAssignmentStatus,
} from '../services/assignmentCrud/draft.js';
import { escapeCsvCell as escapeAssignmentCsvCell } from '../services/assignmentSharedService.js';

test('assignment editability allows draft and published statuses', () => {
  assert.equal(isEditableAssignmentStatus('draft'), true);
  assert.equal(isEditableAssignmentStatus('published'), true);
  assert.equal(isEditableAssignmentStatus('active'), true);
});

test('assignment editability allows closed but rejects archived statuses', () => {
  assert.equal(isEditableAssignmentStatus('closed'), true);
  assert.equal(isEditableAssignmentStatus('archived'), false);
  assert.equal(isEditableAssignmentStatus(''), false);
});

test('assignment class selection mutability only allows draft assignments', () => {
  assert.equal(isAssignmentClassSelectionMutable('draft'), true);
  assert.equal(isAssignmentClassSelectionMutable('published'), false);
  assert.equal(isAssignmentClassSelectionMutable('closed'), false);
});

test('assignment effective class ids prefer class_ids and fall back to class_id', () => {
  assert.deepEqual(getAssignmentEffectiveClassIds({ class_ids: '["class-a","class-b"]', class_id: 'class-a' }), ['class-a', 'class-b']);
  assert.deepEqual(getAssignmentEffectiveClassIds({ classIds: ['class-a', 'class-b'] }), ['class-a', 'class-b']);
  assert.deepEqual(getAssignmentEffectiveClassIds({ class_id: 'class-a' }), ['class-a']);
});

test('assignment class selection change detection ignores ordering but catches actual changes', () => {
  assert.equal(hasAssignmentClassSelectionChanged({ classIds: ['class-a', 'class-b'] }, ['class-b', 'class-a']), false);
  assert.equal(hasAssignmentClassSelectionChanged({ classIds: ['class-a'] }, ['class-b']), true);
});

test('assignment question validation accepts active writing system questions', async () => {
  const originalPrepare = db.prepare;
  db.prepare = () => ({
    get: () => ({
      id: 'question-1',
      user_id: null,
      source_type: 'system',
      status: 'active',
      is_disabled: 0,
      prompt_text: '',
      content: 'Write an essay.',
      module_id: 'module-writing',
      module_code: 'writing',
    }),
  });

  try {
    const row = await assertAssignableQuestion('question-1', 'teacher-1');
    assert.equal(row.id, 'question-1');
  } finally {
    db.prepare = originalPrepare;
  }
});

test('assignment question validation rejects non-writing system questions', async () => {
  const originalPrepare = db.prepare;
  db.prepare = () => ({
    get: () => ({
      id: 'question-reading',
      user_id: null,
      source_type: 'system',
      status: 'active',
      is_disabled: 0,
      prompt_text: '',
      content: 'Choose the best answer.',
      module_id: 'module-reading',
      module_code: 'reading',
    }),
  });

  try {
    await assert.rejects(
      () => assertAssignableQuestion('question-reading', 'teacher-1'),
      /题目不属于写作题库/
    );
  } finally {
    db.prepare = originalPrepare;
  }
});

test('assignment CSV escaping neutralizes spreadsheet formulas', () => {
  assert.equal(escapeAssignmentCsvCell('=HYPERLINK("http://example.test")'), `"'=HYPERLINK(""http://example.test"")"`);
  assert.equal(escapeAssignmentCsvCell('+SUM(1,2)'), `"'+SUM(1,2)"`);
  assert.equal(escapeAssignmentCsvCell(' -10'), "' -10");
  assert.equal(escapeAssignmentCsvCell('@cmd'), "'@cmd");
});
