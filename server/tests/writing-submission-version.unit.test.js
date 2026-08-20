import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const state = {
  inserted: false,
};

const dbMock = {
  prepare(sql) {
    return {
      get: async (id) => {
        if (sql.includes('FROM users')) return { id, real_name: '学生甲', class_name: '一班' };
        if (sql.includes('FROM writings')) return { id, user_id: 'other-student', version_group_id: 'other-root' };
        return null;
      },
      run: async () => {
        state.inserted = true;
      },
    };
  },
};

mock.module('../db/database.js', { defaultExport: dbMock });
mock.module('../services/assignmentService.js', {
  namedExports: {
    getAssignmentTaskByAssignmentAndStudent: async () => null,
    markAssignmentTaskSubmitted: async () => {},
    markAssignmentTaskGrading: async () => {},
  },
});
mock.module('../services/learningEventService.js', {
  namedExports: { recordLearningEvent: async () => {} },
});
mock.module('../services/questionAnalysisQueueService.js', {
  namedExports: {
    queueQuestionAnalysisForWriting: async () => {},
    shouldAutoQueueQuestionAnalysis: () => false,
  },
});
mock.module('../services/writingQueryService.js', {
  namedExports: {
    attachLatestQuestionAnalysisTask: async (row) => row,
    mapWritingDetail: (row) => row,
  },
});
mock.module('../services/writingService.js', {
  namedExports: { assertTeacherCanManageStudent: async () => {} },
});
mock.module('../utils/nanoid.js', {
  namedExports: { nanoid: () => 'new-writing' },
});
mock.module('../utils/oss.js', {
  namedExports: {
    deleteFromOSS: async () => {},
    uploadBase64ToOSS: async () => 'https://example.test/image.png',
  },
});

const { createWritingSubmission } = await import('../services/writingSubmissionService.js');

test('createWritingSubmission rejects revision links owned by another student', async () => {
  state.inserted = false;

  await assert.rejects(
    createWritingSubmission({
      user: { id: 'student-1', role: 'student', name: '学生甲' },
      payload: {
        writingTitle: '第二稿',
        fullText: '正文',
        wordCount: 2,
        maxScore: 15,
        versionOfWritingId: 'other-writing',
      },
    }),
    /原版作文不存在/
  );

  assert.equal(state.inserted, false);
});
