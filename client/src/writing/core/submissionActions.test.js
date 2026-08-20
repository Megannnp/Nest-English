import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSubmissionActions } from './submissionActions.js';

const {
  feedbackApiMock,
  questionsApiMock,
  writingsApiMock,
  questionAnalysisClientMock,
} = vi.hoisted(() => ({
  feedbackApiMock: {
    requestQuick: vi.fn(),
    streamQuick: vi.fn(),
    getStatus: vi.fn(),
  },
  questionsApiMock: {
    create: vi.fn(),
  },
  writingsApiMock: {
    create: vi.fn(),
    get: vi.fn(),
    updateFeedback: vi.fn(),
  },
  questionAnalysisClientMock: {
    createFallbackQuestionAnalysis: vi.fn(() => ({ status: 'failed' })),
    createPendingQuestionAnalysis: vi.fn(() => ({ status: 'pending' })),
    generateQuestionAnalysis: vi.fn(),
  },
}));

vi.mock('../../api/index.js', () => ({
  feedbackAPI: feedbackApiMock,
  questionsAPI: questionsApiMock,
  writingsAPI: writingsApiMock,
}));

vi.mock('./writingFeedback.js', () => ({
  clearFeedbackGeneration: vi.fn((value) => value),
  createLoadingFeedback: vi.fn(() => ({ generation: { active: true, progress: 6 } })),
  extractDisplayFeedbackFromWriting: vi.fn((writing) => writing?.feedback || null),
  withFeedbackGeneration: vi.fn((value, progress, stage) => ({
    ...(value || {}),
    generation: { active: true, progress, stage },
  })),
}));

vi.mock('./questionAnalysisClient.js', () => ({
  createFallbackQuestionAnalysis: questionAnalysisClientMock.createFallbackQuestionAnalysis,
  createPendingQuestionAnalysis: questionAnalysisClientMock.createPendingQuestionAnalysis,
  generateQuestionAnalysis: questionAnalysisClientMock.generateQuestionAnalysis,
}));

async function flushMicrotasks(times = 3) {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

function createBaseOptions(overrides = {}) {
  return {
    user: { id: 'user-1', role: 'student', name: 'Amy' },
    questions: [],
    studentsInClass: [],
    onQuestionsChange: vi.fn(),
    onWritingSaved: vi.fn(),
    onRequireAuth: vi.fn(),
    guestMode: false,
    getState: vi.fn(() => ({
      image: null,
      text: 'This is a valid writing content for testing.',
      customMax: '',
      maxOpt: '15',
      manualType: '',
      aiAnalysis: { type: 'summary', themes: ['education'], reason: 'matched prompt' },
      writingTitle: 'Test title',
      promptText: 'Prompt text',
      selectedQId: 'question-1',
      selectedStudent: '',
      source: 'self',
      taskContext: null,
    })),
    setError: vi.fn(),
    setLoading: vi.fn(),
    setFeedback: vi.fn(),
    setStreamText: vi.fn(),
    ...overrides,
  };
}

describe('createSubmissionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks submission when writing content is too short', async () => {
    const options = createBaseOptions({
      getState: vi.fn(() => ({
        image: null,
        text: 'too short',
        customMax: '',
        maxOpt: '15',
      })),
    });

    const actions = createSubmissionActions(options);
    await actions.submit({ max: 15, words: 2 });

    expect(options.setError).toHaveBeenCalledWith('请至少输入20个字符或上传图片');
    expect(writingsApiMock.create).not.toHaveBeenCalled();
  });

  it('requires auth in guest mode before submission', async () => {
    const options = createBaseOptions({
      guestMode: true,
    });

    const actions = createSubmissionActions(options);
    await actions.submit({ max: 15, words: 8 });

    expect(options.onRequireAuth).toHaveBeenCalledWith({ mode: 'login' });
    expect(writingsApiMock.create).not.toHaveBeenCalled();
  });

  it('submits a student writing, polls until quick feedback is ready, then displays it', async () => {
    const studentFeedback = { totalScore: 12, summary: 'good writing', categories: [] };

    writingsApiMock.create.mockResolvedValueOnce({ id: 'writing-1' });
    feedbackApiMock.requestQuick.mockResolvedValueOnce({});
    feedbackApiMock.getStatus.mockResolvedValueOnce({
      ready: { quick: true },
      quickFeedbackStatus: 'ready',
    });
    writingsApiMock.get.mockResolvedValueOnce({ id: 'writing-1', feedback: studentFeedback });

    const options = createBaseOptions();
    const actions = createSubmissionActions(options);

    const submitPromise = actions.submit({ max: 15, words: 8 });
    await flushMicrotasks(5);
    await vi.advanceTimersByTimeAsync(2500);
    await submitPromise;

    expect(writingsApiMock.create).toHaveBeenCalledWith(expect.objectContaining({
      selectedType: 'summary',
      maxScore: 15,
      wordCount: 8,
      userId: null,
      source: 'self',
    }));
    expect(options.onWritingSaved).toHaveBeenCalledWith({ id: 'writing-1' });
    expect(feedbackApiMock.requestQuick).toHaveBeenCalledWith('writing-1');
    expect(feedbackApiMock.getStatus).toHaveBeenCalledWith('writing-1');
    expect(options.setLoading).toHaveBeenLastCalledWith(false);
    expect(options.setFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ totalScore: 12, summary: 'good writing' }),
    );
    expect(questionAnalysisClientMock.generateQuestionAnalysis).toHaveBeenCalled();
  });

  it('keeps the source writing id when submitting a revision draft', async () => {
    writingsApiMock.create.mockResolvedValueOnce({ id: 'writing-revision-2' });
    feedbackApiMock.requestQuick.mockResolvedValueOnce({});
    feedbackApiMock.getStatus.mockResolvedValueOnce({
      ready: { quick: false },
      quickFeedbackStatus: 'failed',
    });

    const options = createBaseOptions({
      getState: vi.fn(() => ({
        image: null,
        text: 'This is the second draft content with enough length for submission.',
        customMax: '',
        maxOpt: '15',
        manualType: 'summary',
        aiAnalysis: { type: 'summary', themes: ['education'], reason: 'revision draft' },
        writingTitle: 'Revision title',
        promptText: 'Original prompt text',
        selectedQId: '',
        selectedStudent: '',
        source: 'self',
        taskContext: null,
        versionOfWritingId: 'writing-original-1',
      })),
    });

    const actions = createSubmissionActions(options);

    const submitPromise = actions.submit({ max: 15, words: 11 });
    await flushMicrotasks(5);
    await vi.advanceTimersByTimeAsync(2500);
    await submitPromise;

    expect(writingsApiMock.create).toHaveBeenCalledWith(expect.objectContaining({
      versionOfWritingId: 'writing-original-1',
      fullText: 'This is the second draft content with enough length for submission.',
      source: 'self',
    }));
  });

  it('shows an error when quick feedback fails during polling', async () => {
    writingsApiMock.create.mockResolvedValueOnce({ id: 'writing-fail' });
    feedbackApiMock.requestQuick.mockResolvedValueOnce({});
    feedbackApiMock.getStatus.mockResolvedValueOnce({
      ready: { quick: false },
      quickFeedbackStatus: 'failed',
    });

    const options = createBaseOptions();
    const actions = createSubmissionActions(options);

    const submitPromise = actions.submit({ max: 15, words: 8 });
    await flushMicrotasks(5);
    await vi.advanceTimersByTimeAsync(2500);
    await submitPromise;

    expect(feedbackApiMock.requestQuick).toHaveBeenCalledWith('writing-fail');
    expect(options.setError).toHaveBeenCalledWith('基础批改生成失败，请稍后在学习记录中重试。');
  });

  it('allows image-only submission before OCR text is available', async () => {
    writingsApiMock.create.mockResolvedValueOnce({ id: 'writing-image-1' });
    feedbackApiMock.requestQuick.mockResolvedValueOnce({});
    feedbackApiMock.getStatus.mockResolvedValueOnce({
      ready: { quick: false },
      quickFeedbackStatus: 'failed',
    });

    const options = createBaseOptions({
      getState: vi.fn(() => ({
        image: 'data:image/png;base64,mock-image',
        text: '',
        customMax: '',
        maxOpt: '15',
        manualType: '',
        aiAnalysis: { type: 'general', themes: [], reason: 'image only' },
        writingTitle: 'Image submission',
        promptText: '',
        selectedQId: 'question-1',
        selectedStudent: '',
        source: 'self',
        taskContext: null,
      })),
    });

    const actions = createSubmissionActions(options);

    const submitPromise = actions.submit({ max: 15, words: 0 });
    await flushMicrotasks(5);
    await vi.advanceTimersByTimeAsync(2500);
    await submitPromise;

    expect(writingsApiMock.create).toHaveBeenCalledWith(expect.objectContaining({
      image: 'data:image/png;base64,mock-image',
      textSnippet: '',
      fullText: '',
      wordCount: 0,
    }));
    expect(feedbackApiMock.requestQuick).toHaveBeenCalledWith('writing-image-1');
    expect(options.setError).toHaveBeenCalledWith('');
  });

  it('uses OCR-derived prompt and analysis when creating a new question during submission', async () => {
    writingsApiMock.create.mockResolvedValueOnce({ id: 'writing-ocr-1' });
    feedbackApiMock.requestQuick.mockResolvedValueOnce({});
    feedbackApiMock.getStatus.mockResolvedValueOnce({
      ready: { quick: false },
      quickFeedbackStatus: 'failed',
    });
    questionsApiMock.create.mockResolvedValueOnce({ id: 'question-new-1', title: 'OCR prompt title' });

    const options = createBaseOptions({
      getState: vi.fn(() => ({
        image: 'data:image/png;base64,ocr-image',
        text: 'This text was extracted from OCR and then reviewed by the student.',
        customMax: '',
        maxOpt: '15',
        manualType: '',
        aiAnalysis: { type: 'report', themes: ['campus'], reason: 'ocr detected prompt' },
        writingTitle: 'OCR prompt title',
        promptText: 'Write a short report about the campus clean-up activity.',
        selectedQId: '',
        selectedStudent: '',
        source: 'self',
        taskContext: null,
      })),
    });

    const actions = createSubmissionActions(options);

    const submitPromise = actions.submit({ max: 20, words: 11 });
    await flushMicrotasks(5);
    await vi.advanceTimersByTimeAsync(2500);
    await submitPromise;
    await flushMicrotasks(6);

    expect(writingsApiMock.create).toHaveBeenCalledWith(expect.objectContaining({
      image: 'data:image/png;base64,ocr-image',
      selectedType: 'report',
      selectedThemes: ['campus'],
      promptText: 'Write a short report about the campus clean-up activity.',
      textSnippet: 'This text was extracted from OCR and then reviewed by the student.',
    }));
    expect(questionsApiMock.create).toHaveBeenCalledWith({
      title: 'OCR prompt title',
      type: 'report',
      themes: ['campus'],
      promptText: 'Write a short report about the campus clean-up activity.',
    });
    expect(options.onQuestionsChange).toHaveBeenCalledWith([
      { id: 'question-new-1', title: 'OCR prompt title' },
    ]);
  });

  it('submits on behalf of a selected student and persists partial question analysis', async () => {
    const writingFeedback = {
      summary: '已有快速反馈',
      sentencePatterns: [{ category: '句型', patterns: [{ pattern: 'It is important that...' }] }],
    };
    writingsApiMock.create.mockResolvedValueOnce({ id: 'writing-2' });
    feedbackApiMock.streamQuick.mockImplementationOnce((_id, _onChunk, onDone) => {
      Promise.resolve().then(() => onDone());
      return Promise.resolve({ abort: vi.fn() });
    });
    writingsApiMock.get.mockResolvedValue({ id: 'writing-2', feedback: writingFeedback });
    questionAnalysisClientMock.generateQuestionAnalysis.mockImplementationOnce(async ({ onPartial }) => {
      onPartial?.({ overview: 'partial analysis', status: 'partial' });
      return { status: 'ready', overview: 'final analysis' };
    });
    writingsApiMock.updateFeedback.mockResolvedValueOnce({
      feedback: {
        summary: '更新后的反馈',
        questionAnalysis: { status: 'ready', overview: 'final analysis' },
      },
    });

    const options = createBaseOptions({
      user: { id: 'teacher-1', role: 'teacher', name: 'Teacher Wang', realName: '王老师' },
      studentsInClass: [
        { id: 'student-9', name: 'Amy', realName: 'Amy', className: 'Class 1' },
      ],
      getState: vi.fn(() => ({
        image: null,
        text: 'This is a valid writing content for testing as a teacher submission.',
        customMax: '',
        maxOpt: '15',
        manualType: '',
        aiAnalysis: { type: 'summary', themes: ['education'], reason: 'matched prompt' },
        writingTitle: 'Teacher assigned writing',
        promptText: 'Prompt text',
        selectedQId: 'question-1',
        selectedStudent: 'student-9',
        source: 'teacher',
        taskContext: null,
      })),
    });

    const actions = createSubmissionActions(options);
    await actions.submit({ max: 15, words: 12 });
    await flushMicrotasks(6);

    expect(writingsApiMock.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'student-9',
      source: 'teacher',
    }));
    expect(writingsApiMock.create).toHaveBeenCalledWith(expect.not.objectContaining({
      userName: expect.anything(),
      className: expect.anything(),
      aiAnalysis: expect.anything(),
      submittedByTeacher: expect.anything(),
    }));
    expect(feedbackApiMock.requestQuick).not.toHaveBeenCalled();
    expect(feedbackApiMock.streamQuick).toHaveBeenCalledWith(
      'writing-2',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(questionAnalysisClientMock.generateQuestionAnalysis).toHaveBeenCalled();
    expect(writingsApiMock.updateFeedback).toHaveBeenCalledWith(
      'writing-2',
      expect.objectContaining({
        questionAnalysis: expect.objectContaining({
          status: 'ready',
          overview: 'final analysis',
        }),
      })
    );
  });

  it('falls back when question analysis generation fails for teacher flow', async () => {
    writingsApiMock.create.mockResolvedValueOnce({ id: 'writing-3' });
    feedbackApiMock.streamQuick.mockImplementationOnce((_id, _onChunk, onDone) => {
      Promise.resolve().then(() => onDone());
      return Promise.resolve({ abort: vi.fn() });
    });
    writingsApiMock.get.mockResolvedValue({
      id: 'writing-3',
      feedback: { summary: '已有快速反馈' },
    });
    questionAnalysisClientMock.createFallbackQuestionAnalysis.mockReturnValueOnce({
      status: 'failed',
      overview: 'fallback analysis',
    });
    questionAnalysisClientMock.generateQuestionAnalysis.mockRejectedValueOnce(new Error('analysis failed'));
    writingsApiMock.updateFeedback.mockResolvedValueOnce({
      feedback: {
        summary: 'fallback feedback',
        questionAnalysis: { status: 'failed', overview: 'fallback analysis' },
      },
    });

    const options = createBaseOptions({
      user: { id: 'teacher-1', role: 'teacher', name: 'Teacher Wang' },
    });

    const actions = createSubmissionActions(options);
    await actions.submit({ max: 15, words: 12 });
    await flushMicrotasks(6);

    expect(questionAnalysisClientMock.createFallbackQuestionAnalysis).toHaveBeenCalled();
    expect(writingsApiMock.updateFeedback).toHaveBeenCalledWith(
      'writing-3',
      expect.objectContaining({
        questionAnalysis: expect.objectContaining({
          status: 'failed',
          overview: 'fallback analysis',
        }),
        analysisMeta: expect.objectContaining({
          errorCode: 'QUESTION_ANALYSIS_CLIENT_FALLBACK',
        }),
      })
    );
  });
});
