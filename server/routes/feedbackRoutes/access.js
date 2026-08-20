import {
  assertWritingAccess,
  loadWritingOrThrow,
} from '../../services/writingService.js';

export async function loadWritingForFeedbackAccess({
  writingId,
  user,
  forbiddenMessage,
  allowOwner = true,
  allowTeacher = true,
}) {
  const row = await loadWritingOrThrow(writingId);
  const access = await assertWritingAccess({
    user,
    row,
    allowOwner,
    allowTeacher,
    forbiddenMessage,
  });

  return { row, access };
}
