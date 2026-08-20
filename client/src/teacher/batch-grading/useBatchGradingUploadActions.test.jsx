import { act, renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useBatchGradingUploadActions } from './useBatchGradingUploadActions.js';

const recognizeText = vi.fn();

vi.mock('../../api/index.js', () => ({
  aiAPI: {
    recognizeText: (...args) => recognizeText(...args),
  },
  writingsAPI: {
    create: vi.fn(),
  },
}));

vi.mock('./shared.js', async () => {
  const actual = await vi.importActual('./shared.js');
  return {
    ...actual,
    readFileAsBase64: vi.fn().mockResolvedValue('image-base64'),
  };
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const usableRecognizedText = [
  'The starting gun was fired, and the race began.',
  'I tried to keep calm and follow my own pace even though my ankle hurt.',
  'The crowd was cheering loudly, which gave me courage to continue.',
  'Although I was still behind, I could feel the gap getting smaller.',
  'In the final meters, I used all my strength and crossed the line.',
  'At that moment, I realized determination can help us overcome difficulties.',
].join(' ').repeat(2);

describe('useBatchGradingUploadActions', () => {
  it('starts OCR requests for all items in parallel', async () => {
    const first = deferred();
    const second = deferred();
    recognizeText
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const sessionController = {
      resetJob: vi.fn(),
      markOcrRunning: vi.fn(),
      markOcrFinished: vi.fn(),
    };

    const { result } = renderHook(() => {
      const [items, setItems] = useState([
        {
          localId: 'item-1',
          file: new File(['a'], 'a.png', { type: 'image/png' }),
          preview: '',
          status: 'pending',
          studentName: '',
          studentTargetKey: '',
          detectedName: null,
          recognizedText: '',
          feedback: null,
          errorMsg: null,
          writingId: '',
          writingOwnerId: '',
        },
        {
          localId: 'item-2',
          file: new File(['b'], 'b.png', { type: 'image/png' }),
          preview: '',
          status: 'pending',
          studentName: '',
          studentTargetKey: '',
          detectedName: null,
          recognizedText: '',
          feedback: null,
          errorMsg: null,
          writingId: '',
          writingOwnerId: '',
        },
      ]);
      const itemsRef = useRef(items);
      itemsRef.current = items;

      return useBatchGradingUploadActions({
        itemsRef,
        setItems,
        sessionController,
        selectedAssignmentId: 'assignment-1',
        selectedAssignment: { id: 'assignment-1', title: '任务' },
        selectedQuestion: undefined,
        selectedQId: '',
        promptText: 'prompt',
        questionType: 'general',
        max: 20,
        studentOptions: [],
        studentCandidates: [],
        user: { id: 'teacher-1', className: '高一（3）班' },
      });
    });

    let runPromise;
    await act(async () => {
      runPromise = result.current.runOCR();
      await Promise.resolve();
    });

    expect(sessionController.markOcrRunning).toHaveBeenCalled();
    expect(recognizeText).toHaveBeenCalledTimes(2);

    await act(async () => {
      first.resolve({ detectedName: '张三', text: 'First essay text.' });
      second.resolve({ detectedName: '李四', text: 'Second essay text.' });
      await runPromise;
    });

    expect(sessionController.markOcrFinished).toHaveBeenCalled();
  });

  it('confirms an item by auto-matching the recognized student name', async () => {
    const sessionController = {
      resetJob: vi.fn(),
      markOcrRunning: vi.fn(),
      markOcrFinished: vi.fn(),
    };

    const createMock = vi.fn().mockResolvedValue({ id: 'writing-1' });
    const apiModule = await import('../../api/index.js');
    apiModule.writingsAPI.create = createMock;

    const { result } = renderHook(() => {
      const [items, setItems] = useState([
        {
          localId: 'item-1',
          file: new File(['a'], '张三.png', { type: 'image/png' }),
          preview: '',
          status: 'confirm',
          studentName: '张三',
          studentTargetKey: '',
          detectedName: '张三',
          recognizedText: usableRecognizedText,
          feedback: null,
          errorMsg: null,
          writingId: '',
          writingOwnerId: '',
        },
      ]);
      const itemsRef = useRef(items);
      itemsRef.current = items;

      return useBatchGradingUploadActions({
        itemsRef,
        setItems,
        sessionController,
        selectedAssignmentId: 'assignment-1',
        selectedAssignment: { id: 'assignment-1', title: '任务' },
        selectedQuestion: undefined,
        selectedQId: '',
        promptText: 'prompt',
        questionType: 'general',
        max: 20,
        studentOptions: [
          { key: 'user:1', type: 'user', id: '1', name: '张三', className: '高一（3）班' },
        ],
        studentCandidates: [],
        user: { id: 'teacher-1', className: '高一（3）班' },
      });
    });

    await act(async () => {
      await result.current.handleConfirmItem(0);
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      textSnippet: usableRecognizedText.slice(0, 500),
      fullText: usableRecognizedText,
      wordCount: 141,
    }));
  });

  it('confirmAll also confirms items that rely on auto-match instead of a preselected target key', async () => {
    const sessionController = {
      resetJob: vi.fn(),
      markOcrRunning: vi.fn(),
      markOcrFinished: vi.fn(),
    };

    const createMock = vi.fn().mockResolvedValue({ id: 'writing-1' });
    const apiModule = await import('../../api/index.js');
    apiModule.writingsAPI.create = createMock;

    const { result } = renderHook(() => {
      const [items, setItems] = useState([
        {
          localId: 'item-1',
          file: new File(['a'], '张三.png', { type: 'image/png' }),
          preview: '',
          status: 'confirm',
          studentName: '张三',
          studentTargetKey: '',
          detectedName: '张三',
          recognizedText: usableRecognizedText,
          feedback: null,
          errorMsg: null,
          writingId: '',
          writingOwnerId: '',
        },
      ]);
      const itemsRef = useRef(items);
      itemsRef.current = items;

      return useBatchGradingUploadActions({
        itemsRef,
        setItems,
        sessionController,
        selectedAssignmentId: 'assignment-1',
        selectedAssignment: { id: 'assignment-1', title: '任务' },
        selectedQuestion: undefined,
        selectedQId: '',
        promptText: 'prompt',
        questionType: 'general',
        max: 20,
        studentOptions: [
          { key: 'user:1', type: 'user', id: '1', name: '张三', className: '高一（3）班' },
        ],
        studentCandidates: [],
        user: { id: 'teacher-1', className: '高一（3）班' },
      });
    });

    await act(async () => {
      await result.current.confirmAll();
    });

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('uploads confirmAll items in small concurrent batches', async () => {
    const sessionController = {
      resetJob: vi.fn(),
      markOcrRunning: vi.fn(),
      markOcrFinished: vi.fn(),
    };
    const createRequests = Array.from({ length: 5 }, deferred);
    let requestIndex = 0;
    const createMock = vi.fn(() => createRequests[requestIndex++].promise);
    const apiModule = await import('../../api/index.js');
    apiModule.writingsAPI.create = createMock;
    let observedItemsRef;

    const { result } = renderHook(() => {
      const [items, setItems] = useState(Array.from({ length: 5 }, (_, index) => ({
        localId: `item-${index + 1}`,
        file: new File(['a'], `学生${index + 1}.png`, { type: 'image/png' }),
        preview: '',
        status: 'confirm',
        studentName: `学生${index + 1}`,
        studentTargetKey: `user:${index + 1}`,
        detectedName: `学生${index + 1}`,
        recognizedText: usableRecognizedText,
        feedback: null,
        errorMsg: null,
        writingId: '',
        writingOwnerId: '',
      })));
      const itemsRef = useRef(items);
      itemsRef.current = items;
      observedItemsRef = itemsRef;

      return useBatchGradingUploadActions({
        itemsRef,
        setItems,
        sessionController,
        selectedAssignmentId: 'assignment-1',
        selectedAssignment: { id: 'assignment-1', title: '任务' },
        selectedQuestion: undefined,
        selectedQId: '',
        promptText: 'prompt',
        questionType: 'general',
        max: 20,
        studentOptions: Array.from({ length: 5 }, (_, index) => ({
          key: `user:${index + 1}`,
          type: 'user',
          id: `${index + 1}`,
          name: `学生${index + 1}`,
          className: '高一（3）班',
        })),
        studentCandidates: [],
        user: { id: 'teacher-1', className: '高一（3）班' },
      });
    });

    let confirmPromise;
    await act(async () => {
      confirmPromise = result.current.confirmAll();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createMock).toHaveBeenCalledTimes(3);

    await act(async () => {
      createRequests.slice(0, 3).forEach((request, index) => request.resolve({ id: `writing-${index + 1}` }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createMock).toHaveBeenCalledTimes(5);

    await act(async () => {
      createRequests.slice(3).forEach((request, index) => request.resolve({ id: `writing-${index + 4}` }));
      await confirmPromise;
    });

    expect(observedItemsRef.current.every((item) => item.status === 'confirmed')).toBe(true);
  });

  it('does not submit assignment writing when no student target can be resolved', async () => {
    const sessionController = {
      resetJob: vi.fn(),
      markOcrRunning: vi.fn(),
      markOcrFinished: vi.fn(),
    };

    const createMock = vi.fn().mockResolvedValue({ id: 'writing-1' });
    const apiModule = await import('../../api/index.js');
    apiModule.writingsAPI.create = createMock;

    const { result } = renderHook(() => {
      const [items, setItems] = useState([
        {
          localId: 'item-1',
          file: new File(['a'], '微信图片_1.jpg', { type: 'image/jpeg' }),
          preview: '',
          status: 'confirm',
          studentName: '刘浩轩',
          studentTargetKey: '',
          detectedName: '刘浩轩',
          recognizedText: usableRecognizedText,
          feedback: null,
          errorMsg: null,
          writingId: '',
          writingOwnerId: '',
        },
      ]);
      const itemsRef = useRef(items);
      itemsRef.current = items;

      return useBatchGradingUploadActions({
        itemsRef,
        setItems,
        sessionController,
        selectedAssignmentId: 'assignment-1',
        selectedAssignment: { id: 'assignment-1', title: '任务', className: '高一（3）班' },
        selectedQuestion: undefined,
        selectedQId: '',
        promptText: 'prompt',
        questionType: 'general',
        max: 20,
        studentOptions: [],
        studentCandidates: [],
        user: { id: 'teacher-1', className: '高一（3）班' },
      });
    });

    await act(async () => {
      await result.current.confirmAll();
    });

    expect(createMock).not.toHaveBeenCalled();
  });

  it('does not submit when a previously selected student target is no longer valid', async () => {
    const sessionController = {
      resetJob: vi.fn(),
      markOcrRunning: vi.fn(),
      markOcrFinished: vi.fn(),
    };

    const createMock = vi.fn().mockResolvedValue({ id: 'writing-1' });
    const apiModule = await import('../../api/index.js');
    apiModule.writingsAPI.create = createMock;

    const { result } = renderHook(() => {
      const [items, setItems] = useState([
        {
          localId: 'item-1',
          file: new File(['a'], '微信图片_1.jpg', { type: 'image/jpeg' }),
          preview: '',
          status: 'confirm',
          studentName: '陈梦彤',
          studentTargetKey: 'user:stale',
          detectedName: '陈梦彤',
          recognizedText: usableRecognizedText,
          feedback: null,
          errorMsg: null,
          writingId: '',
          writingOwnerId: '',
        },
      ]);
      const itemsRef = useRef(items);
      itemsRef.current = items;

      return useBatchGradingUploadActions({
        itemsRef,
        setItems,
        sessionController,
        selectedAssignmentId: 'assignment-1',
        selectedAssignment: { id: 'assignment-1', title: '任务' },
        selectedQuestion: undefined,
        selectedQId: '',
        promptText: 'prompt',
        questionType: 'general',
        max: 20,
        studentOptions: [
          { key: 'user:1', type: 'user', id: '1', name: '张三', className: '高一（3）班' },
        ],
        studentCandidates: [],
        user: { id: 'teacher-1', className: '高一（3）班' },
      });
    });

    await act(async () => {
      await result.current.handleConfirmItem(0);
    });

    expect(createMock).not.toHaveBeenCalled();
  });

  it('stores recognized text on the item after OCR completes', async () => {
    recognizeText.mockResolvedValueOnce({
      detectedName: '张三',
      text: 'My name is Zhang San.\nI like English writing.',
    });

    const sessionController = {
      resetJob: vi.fn(),
      markOcrRunning: vi.fn(),
      markOcrFinished: vi.fn(),
    };

    const { result } = renderHook(() => {
      const [items, setItems] = useState([
        {
          localId: 'item-1',
          file: new File(['a'], 'a.png', { type: 'image/png' }),
          preview: '',
          status: 'pending',
          studentName: '',
          studentTargetKey: '',
          detectedName: null,
          recognizedText: '',
          feedback: null,
          errorMsg: null,
          writingId: '',
          writingOwnerId: '',
        },
      ]);
      const itemsRef = useRef(items);
      itemsRef.current = items;

      const actions = useBatchGradingUploadActions({
        itemsRef,
        setItems,
        sessionController,
        selectedAssignmentId: 'assignment-1',
        selectedAssignment: { id: 'assignment-1', title: '任务' },
        selectedQuestion: undefined,
        selectedQId: '',
        promptText: 'prompt',
        questionType: 'general',
        max: 20,
        studentOptions: [],
        studentCandidates: [],
        user: { id: 'teacher-1', className: '高一（3）班' },
      });

      return { actions, itemsRef };
    });

    await act(async () => {
      await result.current.actions.runOCR();
    });

    expect(result.current.itemsRef.current[0]).toMatchObject({
      detectedName: '张三',
      recognizedText: 'My name is Zhang San. I like English writing.',
    });
  });

  it('does not submit when recognized text is empty or looks like a 500 character snippet', async () => {
    const sessionController = {
      resetJob: vi.fn(),
      markOcrRunning: vi.fn(),
      markOcrFinished: vi.fn(),
    };

    const createMock = vi.fn().mockResolvedValue({ id: 'writing-1' });
    const apiModule = await import('../../api/index.js');
    apiModule.writingsAPI.create = createMock;

    const { result } = renderHook(() => {
      const [items, setItems] = useState([
        {
          localId: 'item-1',
          file: new File(['a'], '张三.png', { type: 'image/png' }),
          preview: '',
          status: 'confirm',
          studentName: '张三',
          studentTargetKey: 'user:1',
          detectedName: '张三',
          recognizedText: 'A'.repeat(500),
          feedback: null,
          errorMsg: null,
          writingId: '',
          writingOwnerId: '',
        },
      ]);
      const itemsRef = useRef(items);
      itemsRef.current = items;

      const actions = useBatchGradingUploadActions({
        itemsRef,
        setItems,
        sessionController,
        selectedAssignmentId: 'assignment-1',
        selectedAssignment: { id: 'assignment-1', title: '任务' },
        selectedQuestion: undefined,
        selectedQId: '',
        promptText: 'prompt',
        questionType: 'general',
        max: 20,
        studentOptions: [
          { key: 'user:1', type: 'user', id: '1', name: '张三', className: '高一（3）班' },
        ],
        studentCandidates: [],
        user: { id: 'teacher-1', className: '高一（3）班' },
      });

      return { actions, itemsRef };
    });

    await act(async () => {
      await result.current.actions.handleConfirmItem(0);
    });

    expect(createMock).not.toHaveBeenCalled();
    expect(result.current.itemsRef.current[0]).toMatchObject({
      status: 'error',
      errorMsg: '识别文本疑似只有摘要，请重新识别后再确认',
    });
  });

  it('shows a retryable timeout error instead of silently entering confirm state', async () => {
    const timeoutError = Object.assign(new Error('timeout'), { timeout: true });
    recognizeText.mockRejectedValueOnce(timeoutError);

    const sessionController = {
      resetJob: vi.fn(),
      markOcrRunning: vi.fn(),
      markOcrFinished: vi.fn(),
    };

    const { result } = renderHook(() => {
      const [items, setItems] = useState([
        {
          localId: 'item-1',
          file: new File(['a'], '张三.png', { type: 'image/png' }),
          preview: '',
          status: 'pending',
          studentName: '',
          studentTargetKey: '',
          detectedName: null,
          recognizedText: '',
          feedback: null,
          errorMsg: null,
          writingId: '',
          writingOwnerId: '',
        },
      ]);
      const itemsRef = useRef(items);
      itemsRef.current = items;

      const actions = useBatchGradingUploadActions({
        itemsRef,
        setItems,
        sessionController,
        selectedAssignmentId: 'assignment-1',
        selectedAssignment: { id: 'assignment-1', title: '任务' },
        selectedQuestion: undefined,
        selectedQId: '',
        promptText: 'prompt',
        questionType: 'general',
        max: 20,
        studentOptions: [],
        studentCandidates: [],
        user: { id: 'teacher-1', className: '高一（3）班' },
      });

      return { actions, itemsRef };
    });

    await act(async () => {
      await result.current.actions.runOCR();
    });

    expect(result.current.itemsRef.current[0]).toMatchObject({
      status: 'error',
      recognizedText: '',
      errorMsg: '识别未完成/超时，请重试',
    });
  });

  it('persists full OCR text instead of only the 500 character snippet', async () => {
    const longRecognizedText = usableRecognizedText;

    recognizeText.mockResolvedValueOnce({
      detectedName: '张三',
      text: longRecognizedText,
    });

    const sessionController = {
      resetJob: vi.fn(),
      markOcrRunning: vi.fn(),
      markOcrFinished: vi.fn(),
    };

    const createMock = vi.fn().mockResolvedValue({ id: 'writing-1' });
    const apiModule = await import('../../api/index.js');
    apiModule.writingsAPI.create = createMock;

    const { result } = renderHook(() => {
      const [items, setItems] = useState([
        {
          localId: 'item-1',
          file: new File(['a'], '张三.png', { type: 'image/png' }),
          preview: '',
          status: 'pending',
          studentName: '',
          studentTargetKey: '',
          detectedName: null,
          recognizedText: '',
          feedback: null,
          errorMsg: null,
          writingId: '',
          writingOwnerId: '',
        },
      ]);
      const itemsRef = useRef(items);
      itemsRef.current = items;

      const actions = useBatchGradingUploadActions({
        itemsRef,
        setItems,
        sessionController,
        selectedAssignmentId: 'assignment-1',
        selectedAssignment: { id: 'assignment-1', title: '任务' },
        selectedQuestion: undefined,
        selectedQId: '',
        promptText: 'prompt',
        questionType: 'general',
        max: 20,
        studentOptions: [
          { key: 'user:1', type: 'user', id: '1', name: '张三', className: '高一（3）班' },
        ],
        studentCandidates: [],
        user: { id: 'teacher-1', className: '高一（3）班' },
      });

      return { actions, itemsRef };
    });

    await act(async () => {
      await result.current.actions.runOCR();
      await result.current.actions.handleConfirmItem(0);
    });

    expect(longRecognizedText.length).toBeGreaterThan(500);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      textSnippet: longRecognizedText.slice(0, 500),
      fullText: longRecognizedText,
    }));
  });
});
