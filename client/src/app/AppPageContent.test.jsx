import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AppPageContent from './AppPageContent.jsx';
import { campAPI, listeningAPI, parentAPI, phoneticsAPI, usersAPI, vocabularyAPI } from '../api/index.js';

vi.mock('../api/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  campAPI: {
    listCourses: vi.fn().mockResolvedValue([
      {
        id: 'camp-writing-foundation',
        title: '写作基础营',
        summary: '用一周建立写作训练节奏。',
        description: '直播、回放、作业和 AI 练习集中交付。',
        status: 'published',
        tags: ['写作', '基础'],
        price: { display: '¥199' },
        startsAt: '2026-07-20T10:00:00.000Z',
      },
    ]),
    getCourse: vi.fn().mockResolvedValue({
      course: {
        id: 'camp-writing-foundation',
        title: '写作基础营',
        summary: '用一周建立写作训练节奏。',
        description: '直播、回放、作业和 AI 练习集中交付。',
        status: 'published',
        tags: ['写作', '基础'],
        price: { display: '¥199' },
        startsAt: '2026-07-20T10:00:00.000Z',
        suitableFor: ['初高中学生'],
        outline: ['审题', '结构', '修改'],
      },
      lessons: [{ id: 'lesson-1', title: '开营课', startsAt: '2026-07-20T10:00:00.000Z' }],
    }),
    mockPay: vi.fn().mockResolvedValue({}),
    listMyCourses: vi.fn().mockResolvedValue([]),
    getMyCourse: vi.fn().mockResolvedValue({
      course: { id: 'camp-writing-foundation', title: '写作基础营' },
      progress: { progressPercent: 0, lastRecord: '准备开始学习' },
      todayLive: null,
      lessons: [],
      materials: [],
      homework: { status: 'placeholder', description: '今日作业待发布' },
      aiPractice: { status: 'ready', description: '写作 AI 练习', targetPage: 'writing' },
    }),
    recordProgress: vi.fn().mockResolvedValue({ progressPercent: 10, lastRecord: '开始 AI 练习' }),
    me: vi.fn().mockResolvedValue({ purchasedCourses: 0, learningRecords: [] }),
    redeem: vi.fn().mockResolvedValue({ courseId: 'camp-writing-foundation' }),
  },
  parentAPI: {
    overview: vi.fn().mockResolvedValue({ children: [], summary: {} }),
    bindChild: vi.fn().mockResolvedValue({ children: [], summary: {} }),
    childTasks: vi.fn().mockResolvedValue({ tasks: [] }),
    childProgress: vi.fn().mockResolvedValue({ modules: {}, weekly: {} }),
    childEntitlements: vi.fn().mockResolvedValue({ entitlements: [], quotaUsages: [] }),
  },
  usersAPI: {
    updateProfile: vi.fn().mockResolvedValue({
      id: 'student-1',
      role: 'student',
      realName: '测试学生',
      preferences: { prepExamId: 'ielts' },
    }),
    getPointsSummary: vi.fn().mockResolvedValue({ balance: 0, todayCheckIn: false }),
    getEntitlementLedger: vi.fn().mockResolvedValue({ items: [] }),
    checkIn: vi.fn().mockResolvedValue({ balance: 1 }),
    claimPendingPoints: vi.fn().mockResolvedValue({ claimed: 0 }),
    redeemPoints: vi.fn().mockResolvedValue({}),
  },
  listeningAPI: {
    content: vi.fn().mockResolvedValue({}),
    recordProgress: vi.fn().mockResolvedValue({}),
    progress: vi.fn().mockResolvedValue({ sessions: 0, averageScore: 0 }),
    teacherClassProgress: vi.fn().mockResolvedValue([]),
  },
  phoneticsAPI: {
    recordProgress: vi.fn().mockResolvedValue({}),
    progress: vi.fn().mockResolvedValue({ sessions: 0, averageScore: 0 }),
  },
  speakingAPI: {
    questions: vi.fn().mockResolvedValue([]),
    recordProgress: vi.fn().mockResolvedValue({}),
    progress: vi.fn().mockResolvedValue({ sessions: 0, averageScore: 0 }),
  },
  vocabularyAPI: {
    content: vi.fn().mockResolvedValue(null),
    analyzeWord: vi.fn().mockResolvedValue({
      word: 'perseverance',
      definition: '坚持不懈',
      pos: 'noun',
      examples: ['Perseverance matters.'],
    }),
    saveFavorite: vi.fn().mockResolvedValue({}),
    courseProgress: vi.fn().mockResolvedValue({ completedIds: [] }),
    saveCourseProgress: vi.fn().mockResolvedValue({}),
    recordProgress: vi.fn().mockResolvedValue({}),
    progress: vi.fn().mockResolvedValue({ records: [] }),
    teacherClasses: vi.fn().mockResolvedValue([]),
    teacherClassProgress: vi.fn().mockResolvedValue([]),
  },
}));

function renderAppPageContent(page) {
  return render(
    <AppPageContent
      page={page}
      user={{ id: 'student-1', role: 'student', realName: '测试学生' }}
      isMobile={false}
      setPage={vi.fn()}
      setShowAccountMenu={vi.fn()}
      studentPage={{
        state: {},
        actions: {},
      }}
      teacherPage={{
        state: {},
        actions: {},
      }}
    />
  );
}

function renderPublicAppPageContent(page, overrides = {}) {
  return render(
    <AppPageContent
      page={page}
      user={null}
      isMobile={false}
      setPage={overrides.setPage || vi.fn()}
      setShowAccountMenu={vi.fn()}
      studentPage={{
        state: {},
        actions: {},
      }}
      teacherPage={{
        state: {},
        actions: {},
      }}
      {...overrides}
    />
  );
}

function renderTeacherAppPageContent(page, overrides = {}) {
  const setPage = overrides.setPage || vi.fn();
  return render(
    <AppPageContent
      page={page}
      user={{ id: 'teacher-1', role: 'teacher', realName: '测试老师' }}
      isMobile={false}
      setPage={setPage}
      setShowAccountMenu={vi.fn()}
      studentPage={{
        state: {},
        actions: {},
      }}
      teacherPage={{
        state: {
          selectedWritingContext: null,
          selectedTodoScene: 'gradings',
          selectedAssignmentId: '',
          accountTab: 'profile',
          accountReturnRoute: null,
          questions: [],
          writingFeedback: null,
          writingSessionKey: 0,
        },
        actions: {
          handleQuestionsChange: vi.fn(),
          handleWritingSaved: vi.fn(),
          setWritingFeedback: vi.fn(),
          setPage,
          setUser: vi.fn(),
          openWriting: vi.fn(),
          openTodoScene: vi.fn(),
          openAssignment: vi.fn(),
          openClassContext: vi.fn(),
        },
      }}
    />
  );
}

function renderParentAppPageContent(page, overrides = {}) {
  return render(
    <AppPageContent
      page={page}
      user={{ id: 'parent-1', role: 'parent', realName: '测试家长' }}
      isMobile={false}
      setPage={overrides.setPage || vi.fn()}
      setUser={overrides.setUser || vi.fn()}
      setShowAccountMenu={vi.fn()}
      studentPage={{
        state: {},
        actions: {},
      }}
      teacherPage={{
        state: {},
        actions: {},
      }}
    />
  );
}

describe('AppPageContent', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders public refine pages without requiring a user', async () => {
    renderPublicAppPageContent('writing-refine-sentence');

    expect(await screen.findByRole('heading', { name: '句句打磨，表达自如。' })).toBeInTheDocument();
  });

  it('renders the logged-in writing sentence refine page', async () => {
    renderAppPageContent('writing-refine-sentence');

    expect(await screen.findByRole('heading', { name: '句句打磨，表达自如。' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '想练习哪种句子？' })).toBeInTheDocument();
  });

  it('renders the logged-in writing structure refine page', async () => {
    renderAppPageContent('writing-refine-structure');

    expect(await screen.findByRole('heading', { name: '胸有成竹，下笔有神。' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /议论文/ })).toBeInTheDocument();
  });

  it('routes the phonetics landing alias to the overview page', async () => {
    renderPublicAppPageContent('phonetics');
    expect(await screen.findByRole('heading', { name: '搭起语音知识框架。' })).toBeInTheDocument();
  });

  it('renders phonetics sound route', async () => {
    renderPublicAppPageContent('phonetics-sound');
    expect(await screen.findByText(/单元音/)).toBeInTheDocument();
  });

  it('renders phonetics syllable route', async () => {
    renderPublicAppPageContent('phonetics-syllable');
    expect(await screen.findByRole('heading', { name: '拆清音节结构。' })).toBeInTheDocument();
    expect(document.querySelector('.page-hero')).toHaveClass('studio-revealed');
  });

  it('renders phonetics sentence route', async () => {
    renderPublicAppPageContent('phonetics-sentence');
    expect(await screen.findByRole('heading', { name: '读出句子的节奏。' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '韵律' })).toBeInTheDocument();
  });

  it('renders phonetics discourse route', async () => {
    renderPublicAppPageContent('phonetics-discourse');
    expect(await screen.findByRole('heading', { name: '把语音放进语篇。' })).toBeInTheDocument();
    expect(screen.getByText('段落节奏：逗号处停顿，转折后语气加重。')).toBeInTheDocument();
  });

  it('navigates to phonetics sentence from the phonetics top nav', async () => {
    const setPage = vi.fn();
    renderPublicAppPageContent('phonetics-sound', { setPage });

    fireEvent.click(await screen.findByRole('button', { name: '句子' }));

    expect(setPage).toHaveBeenCalledWith('phonetics-sentence');
  });

  it('places phonetics knowledge pages in framework order', async () => {
    renderPublicAppPageContent('phonetics-syllable');
    expect(await screen.findByRole('heading', { name: '拆清音节结构。' })).toBeInTheDocument();

    const labels = screen.getAllByRole('button').map((button) => button.textContent?.trim());
    const order = ['总览', '音素', '音节', '句子', '语篇'].map((label) => labels.indexOf(label));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(labels).not.toContain('字母组合');
    expect(labels).not.toContain('单词');
  });

  it('routes the vocab landing alias to the word analyzer page', async () => {
    renderPublicAppPageContent('vocab');
    expect(await screen.findByRole('heading', { name: '吃透一个词，从词根到语境。' })).toBeInTheDocument();
  });

  it('renders the speaking demo page', async () => {
    renderPublicAppPageContent('speaking');
    expect(await screen.findByRole('heading', { name: '开口回答，马上看到表达反馈。' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成反馈' })).toBeInTheDocument();
  });

  it('renders the speaking page for teachers without assignment chrome', async () => {
    renderTeacherAppPageContent('speaking');
    expect(await screen.findByRole('heading', { name: '开口回答，马上看到表达反馈。' })).toBeInTheDocument();
    expect(screen.queryByText('布置专项任务')).not.toBeInTheDocument();
  });

  it('renders vocab quiz and listening practice routes', async () => {
    renderPublicAppPageContent('vocab-quiz');
    expect(await screen.findByRole('heading', { name: '选择检测方式，检验掌握程度。' })).toBeInTheDocument();
  });

  it('maps the removed vocab import page to vocabulary resources', async () => {
    renderPublicAppPageContent('vocab-import');
    expect(await screen.findByRole('heading', { name: '编辑你的大词库。' })).toBeInTheDocument();
  });

  it('renders listening practice route', async () => {
    renderPublicAppPageContent('listening-practice');
    expect(await screen.findByRole('button', { name: '生成练习' })).toBeInTheDocument();
  });

  it('reveals listening training overview instead of leaving transparent blank space', async () => {
    renderPublicAppPageContent('listening-basics');

    expect(await screen.findByRole('heading', { name: '先听准，再写对。' })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector('.page-hero')).toHaveClass('studio-revealed');
    });
  });

  it.each([
    ['listening-workbench', '看见听读断点，安排下一次训练。'],
    ['vocab-workbench', '看见词汇掌握差异，安排分层复习。'],
    ['phonetics-workbench', '看见发音问题，安排基础训练。'],
  ])('renders teacher module workbench %s', async (page, heading) => {
    renderTeacherAppPageContent(page);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('renders product category aggregation pages', async () => {
    renderPublicAppPageContent('skill-training');
    expect(await screen.findByRole('heading', { name: '备考' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '高考' })).toHaveClass('is-active');
    expect(screen.getByText('读后续写')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '进入写作' })).toBeInTheDocument();
  });

  it('switches prep exam branches without changing module navigation targets', async () => {
    const setPage = vi.fn();
    renderPublicAppPageContent('skill-training', { setPage });

    fireEvent.click(await screen.findByRole('button', { name: 'IELTS' }));

    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Band Descriptor')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '进入Writing' }));
    expect(setPage).toHaveBeenCalledWith('writing-bank');
  });

  it('saves prep exam switches for logged-in students from the prep page', async () => {
    const setUser = vi.fn();
    render(
      <AppPageContent
        page="skill-training"
        user={{ id: 'student-1', role: 'student', realName: '测试学生', preferences: { prepExamId: 'gaokao' } }}
        isMobile={false}
        setPage={vi.fn()}
        setUser={setUser}
        setShowAccountMenu={vi.fn()}
        studentPage={{ state: {}, actions: {} }}
        teacherPage={{ state: {}, actions: {} }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'IELTS' }));

    await waitFor(() => {
      expect(usersAPI.updateProfile).toHaveBeenCalledWith({
        preferences: { prepExamId: 'ielts' },
      });
    });
    expect(setUser).toHaveBeenCalledWith(expect.objectContaining({
      preferences: { prepExamId: 'ielts' },
    }));
  });

  it('does not save again when clicking the active prep exam', async () => {
    render(
      <AppPageContent
        page="skill-training"
        user={{ id: 'student-1', role: 'student', realName: '测试学生', preferences: { prepExamId: 'gaokao' } }}
        isMobile={false}
        setPage={vi.fn()}
        setUser={vi.fn()}
        setShowAccountMenu={vi.fn()}
        studentPage={{ state: {}, actions: {} }}
        teacherPage={{ state: {}, actions: {} }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: '高考' }));

    expect(usersAPI.updateProfile).not.toHaveBeenCalled();
  });

  it('prevents concurrent prep exam saves from the prep page', async () => {
    let resolveSave;
    usersAPI.updateProfile.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));
    render(
      <AppPageContent
        page="skill-training"
        user={{ id: 'student-1', role: 'student', realName: '测试学生', preferences: { prepExamId: 'gaokao' } }}
        isMobile={false}
        setPage={vi.fn()}
        setUser={vi.fn()}
        setShowAccountMenu={vi.fn()}
        studentPage={{ state: {}, actions: {} }}
        teacherPage={{ state: {}, actions: {} }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'IELTS' }));
    fireEvent.click(screen.getByRole('button', { name: 'TOEFL' }));

    expect(usersAPI.updateProfile).toHaveBeenCalledTimes(1);
    resolveSave({
      id: 'student-1',
      role: 'student',
      realName: '测试学生',
      preferences: { prepExamId: 'ielts' },
    });
  });

  it('keeps the current prep exam when saving a logged-in switch fails', async () => {
    usersAPI.updateProfile.mockRejectedValueOnce(new Error('保存失败'));
    render(
      <AppPageContent
        page="skill-training"
        user={{ id: 'student-1', role: 'student', realName: '测试学生', preferences: { prepExamId: 'gaokao' } }}
        isMobile={false}
        setPage={vi.fn()}
        setUser={vi.fn()}
        setShowAccountMenu={vi.fn()}
        studentPage={{ state: {}, actions: {} }}
        teacherPage={{ state: {}, actions: {} }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'IELTS' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByText('读后续写')).toBeInTheDocument();
    expect(screen.queryByText('Band Descriptor')).not.toBeInTheDocument();
  });

  it('renders the portal landing page with primary CTAs', async () => {
    renderPublicAppPageContent('portal');

    expect(await screen.findByRole('heading', { name: /学生做一次练习，\s*老师和家长都看得见进步。/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '免费注册' }).length).toBeGreaterThan(0);
  });

  it.each([
    ['vocab-analyzer', '吃透一个词，从词根到语境。', '分析单词'],
    ['vocab-courses', '不止背单词，更会记单词。', null],
    ['vocab-quiz', '选择检测方式，检验掌握程度。', /开始选择题/],
  ])('renders vocab page %s with its core action', async (page, heading, actionName) => {
    const { container } = renderPublicAppPageContent(page);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    if (actionName) {
      expect(await screen.findByText(actionName)).toBeInTheDocument();
    } else {
      await waitFor(() => {
        expect(container.querySelector('.vc-course-tree button')).not.toBeNull();
      });
    }
  });

  it.each([
    ['camp', '今天学什么。', '兑换课程', {}],
    ['camp-course-detail', '写作基础营', '使用兑换码', { studentPage: { state: { selectedCampCourseId: 'camp-writing-foundation' }, actions: {} } }],
    ['camp-redeem', '输入兑换码，开通对应课程。', '兑换课程', {}],
  ])('renders camp page %s with its core action', async (page, heading, actionName, overrides) => {
    renderPublicAppPageContent(page, overrides);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: actionName })).toBeInTheDocument();
  });

  it('renders parent home empty state instead of a blank shell', async () => {
    renderParentAppPageContent('parent-home');

    expect(await screen.findByRole('heading', { name: '家长端' })).toBeInTheDocument();
    expect(await screen.findByText('还没有绑定孩子')).toBeInTheDocument();
    expect(screen.getByLabelText('学生绑定码')).toBeInTheDocument();
    expect(screen.getByText('查看成长周报')).toBeInTheDocument();
  });

  it('loads parent child tabs from the parent APIs', async () => {
    parentAPI.overview.mockResolvedValueOnce({
      children: [{
        id: 'child-1',
        name: '小明',
        className: '一班',
        summary: { pendingTasks: 1, returnedTasks: 2 },
        tasks: [{ id: 'task-1', taskType: 'writing', status: 'pending', title: '周记' }],
      }],
      summary: { childCount: 1 },
    });
    parentAPI.childProgress.mockResolvedValueOnce({
      modules: { writing: { totalWritings: 3 }, vocabulary: { sessions: 4 } },
      weekly: {
        totalEvents: 3,
        activeDays: 2,
        byModule: { writing: 1, vocabulary: 1, camp: 1 },
        moduleBreakdown: [{ module: 'writing', count: 1 }, { module: 'vocabulary', count: 1 }, { module: 'camp', count: 1 }],
        topModule: { module: 'writing', count: 1 },
        taskSummary: { pending: 1, overdue: 0, completed: 2 },
        suggestions: ['本周学习节奏稳定，继续保持。'],
        recent: [{ id: 'event-camp-1', module: 'camp', eventType: 'course_enrolled', createdAt: Date.now() }],
      },
    });

    renderParentAppPageContent('parent-home');

    expect((await screen.findAllByText('小明')).length).toBeGreaterThan(0);
    expect(await screen.findByText('家庭关注摘要')).toBeInTheDocument();
    expect(screen.getByText('本周优先完成 1 个待处理任务')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看周报' }));

    expect(await screen.findByText('小明的成长记录')).toBeInTheDocument();
    expect(await screen.findByText('本周学习报告')).toBeInTheDocument();
    expect(await screen.findByText('本周学习节奏稳定，继续保持。')).toBeInTheDocument();
    expect(await screen.findByText('开通营地课程')).toBeInTheDocument();
    expect(parentAPI.childProgress).toHaveBeenCalledWith('child-1');
  });

  it('submits a Nest Camp redeem code for logged-in users', async () => {
    renderAppPageContent('camp-redeem');

    fireEvent.change(await screen.findByPlaceholderText('例如 NESTCAMP2026'), { target: { value: 'NESTCAMP2026' } });
    fireEvent.click(screen.getByRole('button', { name: '兑换课程' }));

    await waitFor(() => {
      expect(campAPI.redeem).toHaveBeenCalledWith('NESTCAMP2026');
    });
    expect(await screen.findByText('兑换成功，课程已开通')).toBeInTheDocument();
  });

  it('records Nest Camp learning progress from the learning center', async () => {
    render(
      <AppPageContent
        page="camp-my-course-detail"
        user={{ id: 'student-1', role: 'student', realName: '测试学生' }}
        isMobile={false}
        setPage={vi.fn()}
        setShowAccountMenu={vi.fn()}
        studentPage={{ state: { selectedCampMyCourseId: 'camp-writing-foundation' }, actions: {} }}
        teacherPage={{ state: {}, actions: {} }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: '开始 AI 练习' }));

    expect(campAPI.recordProgress).toHaveBeenCalledWith('camp-writing-foundation', {
      action: 'ai_practice',
      lessonId: null,
    });
  });

  it('runs vocab analyzer and shows the returned analysis', async () => {
    renderAppPageContent('vocab-analyzer');

    fireEvent.click(await screen.findByRole('button', { name: '分析单词' }));

    expect(await screen.findByText('坚持不懈')).toBeInTheDocument();
    expect(vocabularyAPI.analyzeWord).toHaveBeenCalledWith('perseverance');
  });

  it('records vocab course progress when a logged-in student opens a leaf lesson', async () => {
    renderAppPageContent('vocab-courses');

    fireEvent.click(await screen.findByRole('button', { name: /词根词缀/ }));
    fireEvent.click(await screen.findByRole('button', { name: /常见前缀/ }));

    await waitFor(() => {
      expect(vocabularyAPI.saveCourseProgress).toHaveBeenCalled();
    });
  });

  it.each([
    ['listening-progress', listeningAPI.progress, '听读成长数据加载失败，请稍后重试。'],
    ['phonetics-progress', phoneticsAPI.progress, '语音成长数据加载失败，请稍后重试。'],
  ])('shows a retryable error state when %s progress fails', async (page, progressMock, message) => {
    progressMock.mockRejectedValueOnce(new Error(message));

    renderAppPageContent(page);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument();
  });

  it.each([
    ['points', '我的积分'],
    ['quota', '我的额度'],
  ])('renders parent %s page instead of falling back to parent home', async (page, heading) => {
    renderParentAppPageContent(page);
    expect(await screen.findByText(heading)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '家长端' })).not.toBeInTheDocument();
  });

  it.each([
    'skill-training',
    'language-foundation',
    'writing-refine-sentence',
    'writing-refine-structure',
    'grammar-analyzer',
    'grammar-courses',
    'grammar-practice',
    'grammar-progress',
    'grammar-quiz',
    'reading-analyzer',
    'reading-practice',
    'reading-paper',
    'reading-courses',
    'reading-progress',
    'phonetics-camp',
    'phonetics-overview',
    'phonetics-sound',
    'phonetics-syllable',
    'phonetics-sentence',
    'phonetics-discourse',
    'phonetics-progress',
    'vocab-analyzer',
    'vocab-courses',
    'vocab-progress',
    'vocab-quiz',
    'vocab-resources',
    'listening-basics',
    'listening-advanced',
    'listening-practice',
    'listening-progress',
    'camp',
    'camp-redeem',
    'portal',
    'refund',
  ])('smoke renders public page %s without a blank shell', async (page) => {
    const { container } = renderPublicAppPageContent(page);

    await waitFor(() => {
      expect(container.querySelector('button, h1, h2, main, section')).not.toBeNull();
    });
  });
});
