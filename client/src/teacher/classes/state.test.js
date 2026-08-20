import { describe, expect, it } from 'vitest';

import {
  CLASS_LIST_STATUS,
  CLASS_MODAL,
  createPendingFeedbackMessage,
  ROSTER_SYNC_ACTION,
  STUDENT_RECORD_TYPE,
  WRITING_RECORD_FILTER,
} from './state.js';

describe('class state helpers', () => {
  it('exposes stable modal constants', () => {
    expect(CLASS_MODAL.create).toBe('create');
    expect(CLASS_MODAL.none).toBe('none');
    expect(CLASS_LIST_STATUS.ready).toBe('ready');
    expect(STUDENT_RECORD_TYPE.roster).toBe('roster');
    expect(WRITING_RECORD_FILTER.graded).toBe('graded');
  });

  it('builds success messages for roster sync actions', () => {
    expect(createPendingFeedbackMessage(ROSTER_SYNC_ACTION.linkByStudentNo, { studentNo: '01' })).toMatchObject({
      tone: 'success',
      title: '已完成名单绑定',
    });

    expect(createPendingFeedbackMessage(ROSTER_SYNC_ACTION.unlinkRoster, { studentName: '张三' })).toMatchObject({
      title: '已解绑当前名单',
    });
  });
});
