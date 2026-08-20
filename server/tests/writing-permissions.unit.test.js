import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { assertWritingAccess, assertWritingCanBeDeleted } from '../services/writingService.js';

test('writing permissions allow the owner to access own writing', async () => {
  const result = await assertWritingAccess({
    user: { id: 'student-1', role: 'student' },
    row: { id: 'w-1', user_id: 'student-1' },
    allowOwner: true,
    allowTeacher: false,
  });

  assert.equal(result.isOwner, true);
  assert.equal(result.canTeacherAccess, false);
});

test('writing permissions reject non-owner student access', async () => {
  await assert.rejects(() => assertWritingAccess({
    user: { id: 'student-2', role: 'student' },
    row: { id: 'w-1', user_id: 'student-1' },
    allowOwner: true,
    allowTeacher: false,
    forbiddenMessage: '无权限查看此写作',
  }), /无权限查看此写作/);
});

test('writing permissions reject missing writing rows with not found semantics', async () => {
  await assert.rejects(() => assertWritingAccess({
    user: { id: 'student-2', role: 'student' },
    row: null,
  }), (error) => {
    assert.equal(error.status, 404);
    return true;
  });
});

test('free practice writing can be deleted but homework writing cannot', () => {
  assert.doesNotThrow(() => assertWritingCanBeDeleted({
    id: 'w-1',
    assignment_id: null,
    source: 'self',
  }));

  assert.throws(() => assertWritingCanBeDeleted({
    id: 'w-2',
    assignment_id: 'a-1',
    source: 'homework',
  }), (error) => {
    assert.equal(error.status, 409);
    assert.match(error.message, /任务记录不支持删除/);
    return true;
  });
});
