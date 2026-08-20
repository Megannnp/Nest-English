export const CLASS_MODAL = {
  none: 'none',
  create: 'create',
  editPassword: 'edit-password',
  importRoster: 'import-roster',
};

export const CLASS_LIST_STATUS = {
  loading: 'loading',
  ready: 'ready',
  error: 'error',
};

export const CLASS_DETAIL_STATUS = {
  idle: 'idle',
  loading: 'loading',
  ready: 'ready',
  error: 'error',
};

export const ROSTER_SYNC_ACTION = {
  linkByStudentNo: 'link-by-student-no',
  createAndLink: 'create-and-link',
  linkSpecificRoster: 'link-specific-roster',
  unlinkRoster: 'unlink-roster',
};

export const STUDENT_RECORD_TYPE = {
  user: 'user',
  roster: 'roster',
};

export const WRITING_RECORD_FILTER = {
  all: 'all',
  pending: 'pending',
  graded: 'graded',
};

export function createPendingFeedbackMessage(action, entity = {}) {
  if (action === ROSTER_SYNC_ACTION.createAndLink) {
    return {
      tone: 'success',
      title: '已新增名单并完成绑定',
      description: `${entity.realName || entity.studentNo} 现在已经和班级名单建立关联。`,
    };
  }

  if (action === ROSTER_SYNC_ACTION.linkByStudentNo) {
    return {
      tone: 'success',
      title: '已完成名单绑定',
      description: `系统已按学号 ${entity.studentNo} 关联到对应名单。`,
    };
  }

  if (action === ROSTER_SYNC_ACTION.linkSpecificRoster) {
    return {
      tone: 'success',
      title: '已绑定到所选名单',
      description: `${entity.realName || entity.studentNo || '该账号'} 现在已经关联到你手动选择的名单。`,
    };
  }

  if (action === ROSTER_SYNC_ACTION.unlinkRoster) {
    return {
      tone: 'success',
      title: '已解绑当前名单',
      description: `${entity.studentName || entity.studentNo} 已恢复为待认领状态。`,
    };
  }

  return null;
}
