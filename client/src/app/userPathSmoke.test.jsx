import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthPage from '../components/AuthPage.jsx';
import PortalPage from '../portal/PortalPage.jsx';
import ClassManagementPage from '../teacher/ClassManagementPage.jsx';
import TeacherDataPage from '../teacher/TeacherDataPage.jsx';
import { createSubmissionActions } from '../writing/core/submissionActions.js';

const { authAPI, classesAPI, feedbackAPI, questionsAPI, setToken, teacherDataAPI, writingsAPI } = vi.hoisted(() => ({
  authAPI: {
    register: vi.fn(),
  },
  classesAPI: {
    create: vi.fn(),
    getRoster: vi.fn(),
    getStudents: vi.fn(),
    getUnmatchedUsers: vi.fn(),
    getWritings: vi.fn(),
    list: vi.fn(),
  },
  feedbackAPI: {
    getStatus: vi.fn(),
    requestQuick: vi.fn(),
    streamQuick: vi.fn(),
  },
  questionsAPI: {
    create: vi.fn(),
  },
  setToken: vi.fn(),
  teacherDataAPI: {
    classDetail: vi.fn(),
    overview: vi.fn(),
  },
  writingsAPI: {
    create: vi.fn(),
    get: vi.fn(),
    updateFeedback: vi.fn(),
  },
}));

vi.mock('../api/index.js', () => ({
  authAPI,
  classesAPI,
  feedbackAPI,
  questionsAPI,
  setToken,
  teacherDataAPI,
  writingsAPI,
}));

vi.mock('../writing/core/questionAnalysisClient.js', () => ({
  createFallbackQuestionAnalysis: vi.fn(() => ({ status: 'failed' })),
  createPendingQuestionAnalysis: vi.fn(() => ({ status: 'pending' })),
  generateQuestionAnalysis: vi.fn().mockResolvedValue({ status: 'ready', summary: '题目分析完成' }),
}));

vi.mock('../hooks/useScrollReveal.js', () => ({
  default: () => ({ current: null }),
}));

vi.mock('../hooks/useIsMobile.js', () => ({
  default: () => true,
}));

describe('core user paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('sends homepage visitors into student registration', () => {
    const onRegister = vi.fn();

    render(<PortalPage onRegister={onRegister} />);

    fireEvent.click(screen.getAllByRole('button', { name: '免费注册' })[0]);

    expect(onRegister).toHaveBeenCalledTimes(1);
  });

  it('allows parent identity during registration', () => {
    render(<AuthPage initialMode="register" embedded onLogin={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '我是家长' }));

    expect(screen.getByPlaceholderText('如：张家长')).toBeInTheDocument();
  });

  it('submits a valid student registration payload', async () => {
    const onLogin = vi.fn();
    authAPI.register.mockResolvedValueOnce({
      token: 'token-1',
      user: { id: 'student-1', role: 'student', realName: '张小明' },
    });

    render(<AuthPage initialMode="register" embedded onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText(/邮箱/), { target: { value: 'student@example.com' } });
    fireEvent.change(screen.getByLabelText(/姓名/), { target: { value: '张小明' } });
    fireEvent.change(screen.getByLabelText(/^密码/), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/确认密码/), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: '创建账号 →' }));

    await waitFor(() => {
      expect(authAPI.register).toHaveBeenCalledWith(expect.objectContaining({
        email: 'student@example.com',
        realName: '张小明',
        role: 'student',
        preferences: { prepExamId: 'gaokao' },
      }));
    });
    expect(setToken).toHaveBeenCalledWith('token-1');
    expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ role: 'student' }), true);
  });

  it('submits the selected prep exam during student registration', async () => {
    authAPI.register.mockResolvedValueOnce({
      token: 'token-ielts',
      user: { id: 'student-ielts', role: 'student', realName: '张小明', preferences: { prepExamId: 'ielts' } },
    });

    render(<AuthPage initialMode="register" embedded onLogin={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'IELTS' }));
    fireEvent.change(screen.getByLabelText(/邮箱/), { target: { value: 'ielts@example.com' } });
    fireEvent.change(screen.getByLabelText(/姓名/), { target: { value: '张小明' } });
    fireEvent.change(screen.getByLabelText(/^密码/), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/确认密码/), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: '创建账号 →' }));

    await waitFor(() => {
      expect(authAPI.register).toHaveBeenCalledWith(expect.objectContaining({
        email: 'ielts@example.com',
        preferences: { prepExamId: 'ielts' },
      }));
    });
  });

  it('covers student registration through one completed writing practice', async () => {
    const onLogin = vi.fn();
    authAPI.register.mockResolvedValueOnce({
      token: 'student-token',
      user: { id: 'student-1', role: 'student', realName: '张小明' },
    });
    writingsAPI.create.mockResolvedValueOnce({ id: 'writing-1' });
    feedbackAPI.requestQuick.mockResolvedValueOnce({});
    feedbackAPI.getStatus.mockResolvedValueOnce({
      ready: { quick: true },
      quickFeedbackStatus: 'ready',
    });
    writingsAPI.get.mockResolvedValueOnce({
      id: 'writing-1',
      feedback: { totalScore: 13, summary: '结构清楚，继续补充细节。', categories: [] },
    });
    writingsAPI.updateFeedback.mockResolvedValueOnce({
      id: 'writing-1',
      feedback: { totalScore: 13, summary: '结构清楚，继续补充细节。', categories: [] },
    });

    render(<AuthPage initialMode="register" embedded onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText(/邮箱/), { target: { value: 'student-e2e@example.com' } });
    fireEvent.change(screen.getByLabelText(/姓名/), { target: { value: '张小明' } });
    fireEvent.change(screen.getByLabelText(/^密码/), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/确认密码/), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: '创建账号 →' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ role: 'student' }), true));

    vi.useFakeTimers();
    const setFeedback = vi.fn();
    const actions = createSubmissionActions({
      user: { id: 'student-1', role: 'student', realName: '张小明' },
      questions: [],
      studentsInClass: [],
      onQuestionsChange: vi.fn(),
      onWritingSaved: vi.fn(),
      onRequireAuth: vi.fn(),
      guestMode: false,
      getState: vi.fn(() => ({
        aiAnalysis: { type: 'summary', themes: ['growth'], reason: 'student practice' },
        customMax: '',
        image: null,
        manualType: '',
        maxOpt: '15',
        promptText: 'Write about a meaningful school activity.',
        selectedQId: '',
        selectedStudent: '',
        source: 'self',
        taskContext: null,
        text: 'This school activity helped me learn teamwork and become more confident in English writing.',
        writingTitle: 'A meaningful activity',
      })),
      setError: vi.fn(),
      setFeedback,
      setLoading: vi.fn(),
      setStreamText: vi.fn(),
    });

    const submitPromise = actions.submit({ max: 15, words: 14 });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2500);
    await submitPromise;

    expect(writingsAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      fullText: expect.stringContaining('teamwork'),
      maxScore: 15,
      selectedType: 'summary',
      source: 'self',
    }));
    expect(feedbackAPI.requestQuick).toHaveBeenCalledWith('writing-1');
    expect(setFeedback).toHaveBeenCalledWith(expect.objectContaining({
      summary: '结构清楚，继续补充细节。',
      totalScore: 13,
    }));
  });

  it('covers teacher creating a class and then viewing report data', async () => {
    const createdClass = {
      id: 'class-1',
      classCode: 'NEST01',
      className: '高一 A 班',
      password: 'join1234',
      studentCount: 0,
    };
    classesAPI.list.mockResolvedValueOnce([]);
    classesAPI.create.mockResolvedValueOnce(createdClass);

    render(<ClassManagementPage user={{ id: 'teacher-1', role: 'teacher' }} isMobile={false} />);

    fireEvent.click(await screen.findByRole('button', { name: '+ 创建新班级' }));
    fireEvent.change(screen.getByLabelText('班级名称 *'), { target: { value: '高一 A 班' } });
    fireEvent.change(screen.getByLabelText('加入密码 *'), { target: { value: 'join1234' } });
    fireEvent.click(screen.getByRole('button', { name: '创建班级' }));

    await waitFor(() => expect(classesAPI.create).toHaveBeenCalledWith('高一 A 班', 'join1234'));
    cleanup();

    teacherDataAPI.overview.mockResolvedValueOnce({
      summary: { classCount: 1, studentCount: 2, assignedCount: 8, completedCount: 5, completionRate: 63, pendingStudentCount: 1 },
      classes: [{ classId: 'class-1', className: '高一 A 班', studentCount: 2, overall: { assignedCount: 8, completedCount: 5, completionRate: 63 } }],
    });
    teacherDataAPI.classDetail.mockResolvedValueOnce({
      classSummary: { classId: 'class-1', className: '高一 A 班', studentCount: 2 },
      overall: { assignedCount: 8, completedCount: 5, completionRate: 63, pendingStudentCount: 1, pendingStudents: [{ id: 'student-1', name: '王同学', studentNo: '01' }] },
      writing: { assignmentCount: 1, assignedCount: 2, submittedCount: 1, returnedCount: 1, completionRate: 50, teacherCommentCoverageRate: 50, commentReadyCount: 1 },
      grammar: { assignmentCount: 1, assignedCount: 2, submittedCount: 1, completionRate: 50, practiceSessions: 3, totalQuestions: 10, accuracy: 80 },
      reading: { practiceSessions: 4, totalQuestions: 12, accuracy: 75, analysesCount: 2 },
      modules: { assignedCount: 2, completedCount: 1, completionRate: 50, byModule: [{ moduleType: 'reading', assignedCount: 2, completedCount: 1, completionRate: 50 }] },
    });

    render(<TeacherDataPage />);

    expect(await screen.findByText('高一 A 班 · 2 人')).toBeInTheDocument();
    expect(await screen.findByText('班级弱点')).toBeInTheDocument();
    expect(screen.getByText('学生分层')).toBeInTheDocument();
    expect(screen.getByText('导出材料')).toBeInTheDocument();
    expect(teacherDataAPI.classDetail).toHaveBeenCalledWith('class-1');
  });
});
