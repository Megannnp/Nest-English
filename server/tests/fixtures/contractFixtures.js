export function createWorkbenchGradingRow(overrides = {}) {
  return {
    id: 'writing-1',
    recordType: 'writing',
    bindStatus: 'linked',
    gradingStatus: 'feedback_ready',
    workflowStatus: 'awaiting_teacher_review',
    workflowLabel: '待教师评价',
    statusLabel: '反馈已生成',
    nextAction: 'teacher_pending',
    queueSection: 'pending_comments',
    isPendingRoster: false,
    studentId: 'student-1',
    rosterId: null,
    studentName: 'Amy',
    classId: 'class-1',
    className: '一班',
    assignmentId: 'assignment-1',
    assignmentTitle: '周练一',
    writingTitle: '作文一',
    createdAt: 1000,
    taskStatus: 'returned',
    maxScore: 15,
    latestScore: 13,
    quickSummary: '结构完整',
    teacherCommentReady: true,
    ...overrides,
  };
}

export function createPendingCommentRow(overrides = {}) {
  return {
    id: 'writing-2',
    recordType: 'writing',
    bindStatus: 'pending',
    gradingStatus: 'feedback_ready',
    workflowStatus: 'pending_binding_feedback_ready',
    workflowLabel: '待绑定，反馈已生成',
    statusLabel: '反馈已生成',
    nextAction: 'bind_roster',
    queueSection: 'pending_comments',
    isPendingRoster: true,
    studentId: '',
    rosterId: 'roster-1',
    studentName: 'Bob',
    classId: 'class-2',
    className: '二班',
    assignmentId: 'assignment-2',
    assignmentTitle: '周练二',
    writingTitle: '作文二',
    createdAt: 2000,
    taskStatus: 'returned',
    maxScore: 20,
    latestScore: 16,
    quickSummary: '等待绑定',
    ...overrides,
  };
}

export function createJoinClassResultFixture(overrides = {}) {
  return {
    classId: 'class-1',
    className: '高二一班',
    rosterMatched: true,
    matchedRosterId: 'roster-1',
    matchedRosterName: 'Amy',
    user: {
      id: 'student-1',
      role: 'student',
    },
    ...overrides,
  };
}

export function createClassRosterBindingResultFixture(overrides = {}) {
  return {
    rosterId: 'roster-1',
    studentNo: 'S001',
    studentName: 'Amy',
    userId: 'student-1',
    ...overrides,
  };
}

export function createClassRosterUnbindingResultFixture(overrides = {}) {
  return {
    rosterId: 'roster-1',
    studentNo: 'S001',
    studentName: 'Amy',
    previousUserId: 'student-1',
    ...overrides,
  };
}

export function createWorkbenchHttpQueryRows() {
  return [
    {
      record_type: 'task',
      task_id: 'task-1',
      assignment_id: 'assignment-1',
      student_id: 'student-1',
      roster_id: null,
      class_id: 'class-1',
      raw_task_status: 'grading',
      writing_id: 'writing-1',
      submitted_at: 1000,
      graded_at: null,
      created_at: 1000,
      student_name: '张三',
      account_code: 'S001',
      class_name: '高二（1）班',
      assignment_title: '周练一',
      max_score: 15,
      writing_title: '作文一',
      total_score: null,
      quick_summary: '',
      feedback_payload: null,
      teacher_comment: null,
      submitted_by_teacher: null,
      grading_task_status: 'running',
      detailed_feedback_status: '未生成',
      teacher_comment_status: '未评价',
      teacher_comment_summary: '',
      sort_order: 1,
    },
    {
      record_type: 'task',
      task_id: 'task-2',
      assignment_id: 'assignment-2',
      student_id: 'student-2',
      roster_id: null,
      class_id: 'class-2',
      raw_task_status: 'returned',
      writing_id: 'writing-2',
      submitted_at: 2000,
      graded_at: 2100,
      created_at: 2000,
      student_name: '李四',
      account_code: 'S002',
      class_name: '高二（2）班',
      assignment_title: '周练二',
      max_score: 20,
      writing_title: '作文二',
      total_score: 17,
      quick_summary: '反馈已完成',
      feedback_payload: '{"totalScore":17,"summary":"反馈已完成"}',
      teacher_comment: null,
      submitted_by_teacher: null,
      grading_task_status: 'succeeded',
      detailed_feedback_status: '已生成',
      teacher_comment_status: '未评价',
      teacher_comment_summary: '',
      sort_order: 2,
    },
  ];
}

export function createJoinClassHttpFixture(overrides = {}) {
  const baseJoinResult = createJoinClassResultFixture({
    classId: 'class-1',
    className: '高二（1）班',
    rosterMatched: false,
    matchedRosterId: null,
    matchedRosterName: '',
  });

  const user = {
    id: 'student-test',
    accountCode: '100001',
    name: '学生甲',
    email: 'student@example.com',
    role: 'student',
    realName: '学生甲',
    studentNo: 'S001',
    classId: 'class-1',
    className: '高二（1）班',
  };

  return {
    classRow: {
      id: 'class-1',
      class_name: '高二（1）班',
      class_code: 'C001',
      teacher_id: 'teacher-test',
      teacher_name: '测试教师',
      password: '123456',
      created_at: 1710000000000,
    },
    preJoinUserRow: {
      id: 'student-test',
      account_code: '100001',
      email: 'student@example.com',
      role: 'student',
      real_name: '学生甲',
      student_no: 'S001',
      class_id: null,
      class_name: '',
    },
    joinedUserRow: {
      id: 'student-test',
      account_code: '100001',
      email: 'student@example.com',
      role: 'student',
      real_name: '学生甲',
      student_no: 'S001',
      class_id: 'class-1',
      class_name: '高二（1）班',
    },
    expectedResponse: {
      ...baseJoinResult,
      user,
    },
    ...overrides,
  };
}

export function createRosterImportHttpFixture(overrides = {}) {
  const classRow = {
    id: 'class-1',
    class_name: '高二（1）班',
    class_code: 'C001',
    teacher_id: 'teacher-test',
    teacher_name: '测试教师',
    created_at: 1710000000000,
  };
  const rosterRows = [
    {
      id: 'roster-1',
      class_id: 'class-1',
      student_no: 'S001',
      student_name: '学生甲',
      user_id: null,
      linked_user_name: null,
      linked_user_email: null,
      status: 'pending',
      created_at: 1710000000100,
      updated_at: 1710000000200,
    },
    {
      id: 'roster-2',
      class_id: 'class-1',
      student_no: 'S002',
      student_name: '学生乙',
      user_id: null,
      linked_user_name: null,
      linked_user_email: null,
      status: 'pending',
      created_at: 1710000000101,
      updated_at: 1710000000201,
    },
  ];

  return {
    classId: 'class-1',
    classRow,
    rosterRows,
    requestBody: {
      items: [
        { studentNo: 'S001', studentName: '学生甲' },
        { studentNo: 'S002', studentName: '学生乙' },
      ],
    },
    expectedResponse: {
      importedCount: 2,
      items: [
        {
          id: 'roster-1',
          classId: 'class-1',
          studentNo: 'S001',
          studentName: '学生甲',
          userId: null,
          linkedUserName: '',
          linkedUserEmail: '',
          status: 'pending',
          createdAt: 1710000000100,
          updatedAt: 1710000000200,
        },
        {
          id: 'roster-2',
          classId: 'class-1',
          studentNo: 'S002',
          studentName: '学生乙',
          userId: null,
          linkedUserName: '',
          linkedUserEmail: '',
          status: 'pending',
          createdAt: 1710000000101,
          updatedAt: 1710000000201,
        },
      ],
    },
    ...overrides,
  };
}

export function createRosterLinkHttpFixture(overrides = {}) {
  const classRow = {
    id: 'class-1',
    class_name: '高二（1）班',
    class_code: 'C001',
    teacher_id: 'teacher-test',
    teacher_name: '测试教师',
    created_at: 1710000000000,
  };
  const classStudentRow = {
    id: 'student-1',
    real_name: '学生甲',
    student_no: 'S001',
    class_id: 'class-1',
    class_name: '高二（1）班',
  };
  const rosterRow = {
    id: 'roster-1',
    student_no: 'S001',
    student_name: '学生甲',
    user_id: null,
    status: 'pending',
  };

  return {
    classId: 'class-1',
    rosterId: 'roster-1',
    classRow,
    classStudentRow,
    rosterRow,
    requestBody: { userId: 'student-1' },
    expectedResponse: createClassRosterBindingResultFixture({
      rosterId: 'roster-1',
      studentNo: 'S001',
      studentName: '学生甲',
      userId: 'student-1',
    }),
    ...overrides,
  };
}

export function createRosterUnlinkHttpFixture(overrides = {}) {
  const classRow = {
    id: 'class-1',
    class_name: '高二（1）班',
    class_code: 'C001',
    teacher_id: 'teacher-test',
    teacher_name: '测试教师',
    created_at: 1710000000000,
  };
  const rosterRow = {
    id: 'roster-1',
    student_no: 'S001',
    student_name: '学生甲',
    user_id: 'student-1',
    status: 'linked',
  };
  const writingRows = [
    {
      id: 'writing-1',
      assignment_id: 'assignment-1',
    },
  ];

  return {
    classId: 'class-1',
    rosterId: 'roster-1',
    classRow,
    rosterRow,
    writingRows,
    expectedResponse: createClassRosterUnbindingResultFixture({
      rosterId: 'roster-1',
      studentNo: 'S001',
      studentName: '学生甲',
      previousUserId: 'student-1',
    }),
    ...overrides,
  };
}
