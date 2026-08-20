import bcrypt from 'bcryptjs';
import assert from 'node:assert/strict';
import test from 'node:test';

import db, { runDatabaseMigrations } from '../db/database.js';
import {
  createAssignment,
  getAssignmentTaskByAssignmentAndStudent,
  publishAssignment,
} from '../services/assignmentService.js';
import { registerUser, loginUser } from '../services/authService.js';
import {
  createClassForTeacher,
  joinClassForStudent,
  listClassStudentsForTeacher,
  searchClassByCode,
} from '../services/classService.js';
import { setQuickFeedbackAIClientForTests } from '../services/feedback/quick/aiClient.js';
import { loadWritingById } from '../services/feedback/repository.js';
import { requestQuickFeedback } from '../services/feedbackService.js';
import { saveTeacherCommentForWriting } from '../services/writingAnalysisService.js';
import { createWritingSubmission } from '../services/writingSubmissionService.js';
import { nanoid } from '../utils/nanoid.js';

const enabled = process.env.RUN_MYSQL_INTEGRATION === '1';

async function waitForWritingFeedback(writingId, pattern, { timeoutMs = 3000, intervalMs = 100 } = {}) {
  const startedAt = Date.now();
  let latest = null;
  while (Date.now() - startedAt < timeoutMs) {
    latest = await loadWritingById(writingId);
    if (pattern.test(String(latest?.feedback || ''))) {
      return latest;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return latest;
}

async function canUseDatabase() {
  if (!enabled) return false;
  try {
    await runDatabaseMigrations();
    await db.pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.warn('MySQL integration tests skipped:', error?.message || error);
    return false;
  }
}

const databaseAvailable = await canUseDatabase();

test('mysql integration: teacher creates class and student joins', { skip: !databaseAvailable }, async () => {
  const suffix = nanoid();
  const teacher = {
    id: `teacher-${suffix}`,
    role: 'teacher',
    name: '集成测试教师',
    realName: '集成测试教师',
  };
  const student = {
    id: `student-${suffix}`,
    role: 'student',
    name: '集成测试学生',
    realName: '集成测试学生',
  };

  await db.prepare(`
    INSERT INTO users (id, account_code, nick_name, email, phone, password, role, real_name, class_id, class_name, preferences, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, '', NULL, ?)
  `).run(
    teacher.id,
    suffix.slice(0, 6).padEnd(6, '0'),
    teacher.realName,
    `${teacher.id}@example.com`,
    null,
    await bcrypt.hash('Teacher123', 10),
    'teacher',
    teacher.realName,
    Date.now()
  );

  await db.prepare(`
    INSERT INTO users (id, account_code, nick_name, email, phone, password, role, real_name, class_id, class_name, preferences, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, '', NULL, ?)
  `).run(
    student.id,
    suffix.slice(-6).padStart(6, '1'),
    student.realName,
    `${student.id}@example.com`,
    null,
    await bcrypt.hash('Student123', 10),
    'student',
    student.realName,
    Date.now()
  );

  const created = await createClassForTeacher({
    teacher,
    payload: {
      className: `集成测试班级-${suffix}`,
      password: 'Class1234',
    },
  });

  assert.ok(created.id);
  assert.match(created.classCode, /^C[A-Z0-9]{6}$/);

  const found = await searchClassByCode(created.classCode);
  assert.equal(found.id, created.id);
  assert.equal(found.studentCount, 0);

  const joined = await joinClassForStudent({
    user: student,
    classId: created.id,
    password: 'Class1234',
  });
  assert.equal(joined.classId, created.id);
  assert.equal(joined.user.classId, created.id);

  const students = await listClassStudentsForTeacher({
    teacherId: teacher.id,
    classId: created.id,
  });
  assert.equal(students.length, 1);
  assert.equal(students[0].id, student.id);
});

test('mysql integration: assignment submission and teacher comment flow', { skip: !databaseAvailable }, async () => {
  const suffix = nanoid();
  const teacher = {
    id: `teacher-flow-${suffix}`,
    role: 'teacher',
    name: '集成测试教师',
    realName: '集成测试教师',
  };
  const student = {
    id: `student-flow-${suffix}`,
    role: 'student',
    name: '集成测试学生',
    realName: '集成测试学生',
  };

  await db.prepare(`
    INSERT INTO users (id, account_code, nick_name, email, phone, password, role, real_name, class_id, class_name, preferences, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, '', NULL, ?)
  `).run(
    teacher.id,
    suffix.slice(0, 6).padEnd(6, '2'),
    teacher.realName,
    `${teacher.id}@example.com`,
    null,
    await bcrypt.hash('Teacher123', 10),
    'teacher',
    teacher.realName,
    Date.now()
  );

  await db.prepare(`
    INSERT INTO users (id, account_code, nick_name, email, phone, password, role, real_name, class_id, class_name, preferences, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, '', NULL, ?)
  `).run(
    student.id,
    suffix.slice(-6).padStart(6, '3'),
    student.realName,
    `${student.id}@example.com`,
    null,
    await bcrypt.hash('Student123', 10),
    'student',
    student.realName,
    Date.now()
  );

  const createdClass = await createClassForTeacher({
    teacher,
    payload: {
      className: `集成测试主流程班级-${suffix}`,
      password: 'Class1234',
    },
  });

  await joinClassForStudent({
    user: student,
    classId: createdClass.id,
    password: 'Class1234',
  });

  const createdAssignment = await createAssignment({
    teacher,
    classId: createdClass.id,
    title: `集成测试作文-${suffix}`,
    promptText: 'Please write about a memorable day.',
    selectedType: 'general',
    selectedThemes: ['life'],
    maxScore: 15,
  });
  const assignmentId = createdAssignment.assignment.id;

  const published = await publishAssignment({
    teacherId: teacher.id,
    assignmentId,
  });
  assert.equal(published.assignment.status, 'published');
  assert.equal(published.taskCount, 1);

  const pendingTask = await getAssignmentTaskByAssignmentAndStudent(assignmentId, student.id);
  assert.equal(pendingTask.status, 'pending');

  const writing = await createWritingSubmission({
    user: student,
    payload: {
      assignmentId,
      writingTitle: 'A Memorable Day',
      promptText: 'Please write about a memorable day.',
      selectedType: 'general',
      selectedThemes: ['life'],
      textSnippet: 'It was a sunny morning.',
      fullText: 'It was a sunny morning. I helped my friend and learned the value of kindness.',
      wordCount: 15,
      maxScore: 15,
      source: 'homework',
      skipQuestionAnalysisQueue: true,
    },
  });
  assert.ok(writing.id);

  const submittedTask = await getAssignmentTaskByAssignmentAndStudent(assignmentId, student.id);
  assert.equal(submittedTask.writingId, writing.id);
  assert.equal(submittedTask.status, 'grading');

  const commented = await saveTeacherCommentForWriting({
    writingId: writing.id,
    user: teacher,
    content: '结构清楚，可以继续增加细节。',
    annotatedImage: null,
  });
  assert.equal(commented.teacherComment.content, '结构清楚，可以继续增加细节。');
});

test('mysql integration: register login create assignment submit writing generate feedback and comment', { skip: !databaseAvailable }, async (t) => {
  const suffix = nanoid();
  const teacherEmail = `teacher-e2e-${suffix}@example.com`;
  const studentEmail = `student-e2e-${suffix}@example.com`;

  const teacherRegistered = await registerUser({
    email: teacherEmail,
    phone: '',
    realName: `教师${suffix.slice(0, 4)}`,
    password: 'Teacher123',
    confirmPassword: 'Teacher123',
    role: 'teacher',
  });
  const studentRegistered = await registerUser({
    email: studentEmail,
    phone: '',
    realName: `学生${suffix.slice(-4)}`,
    password: 'Student123',
    confirmPassword: 'Student123',
    role: 'student',
  });

  const teacherLogin = await loginUser({
    account: teacherEmail,
    password: 'Teacher123',
  });
  const studentLogin = await loginUser({
    account: studentEmail,
    password: 'Student123',
  });

  assert.ok(teacherRegistered.token);
  assert.ok(studentRegistered.token);
  assert.ok(teacherLogin.token);
  assert.ok(studentLogin.token);

  const teacher = teacherLogin.user;
  const student = studentLogin.user;

  const createdClass = await createClassForTeacher({
    teacher,
    payload: {
      className: `注册登录主流程班级-${suffix}`,
      password: 'Class1234',
    },
  });

  await joinClassForStudent({
    user: student,
    classId: createdClass.id,
    password: 'Class1234',
  });

  const createdAssignment = await createAssignment({
    teacher,
    classId: createdClass.id,
    title: `注册登录主流程作文-${suffix}`,
    promptText: 'Please write about a person who influenced you.',
    selectedType: 'general',
    selectedThemes: ['people'],
    maxScore: 20,
  });

  const assignmentId = createdAssignment.assignment.id;
  const published = await publishAssignment({
    teacherId: teacher.id,
    assignmentId,
  });
  assert.equal(published.assignment.status, 'published');

  const writing = await createWritingSubmission({
    user: student,
    payload: {
      assignmentId,
      writingTitle: 'An Influential Person',
      promptText: 'Please write about a person who influenced you.',
      selectedType: 'general',
      selectedThemes: ['people'],
      textSnippet: 'My English teacher encouraged me every day.',
      fullText: 'My English teacher encouraged me every day. She taught me to write clearly and keep practicing.',
      wordCount: 16,
      maxScore: 20,
      source: 'homework',
      skipQuestionAnalysisQueue: true,
    },
  });

  const restoreAIClient = setQuickFeedbackAIClientForTests(async () => JSON.stringify({
    totalScore: 18,
    score: 18,
    level: 'A-',
    summary: '内容完整，表达较自然。',
    strengths: ['主题明确', '结构完整'],
    improvements: ['可增加细节描写'],
  }));
  t.after(restoreAIClient);

  const feedbackStatus = await requestQuickFeedback({
    row: await loadWritingById(writing.id),
    user: student,
  });
  assert.ok(feedbackStatus.quickFeedback);

  const updatedWriting = await waitForWritingFeedback(writing.id, /内容完整/);
  assert.match(String(updatedWriting.feedback || ''), /内容完整/);

  const assignmentTask = await getAssignmentTaskByAssignmentAndStudent(assignmentId, student.id);
  assert.equal(assignmentTask.status, 'returned');
  assert.equal(Number(assignmentTask.latestScore), 18);

  const commented = await saveTeacherCommentForWriting({
    writingId: writing.id,
    user: teacher,
    content: '反馈已生成，建议继续扩展人物细节。',
    annotatedImage: null,
  });
  assert.equal(commented.teacherComment.content, '反馈已生成，建议继续扩展人物细节。');
});
