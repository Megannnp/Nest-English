/**
 * Tests for useImageRecognition — including the canvas-based compressImage
 * path that was previously only tested via the now-deleted
 * imageRecognitionActions.js factory.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImageRecognition } from './useImageRecognition.js';

const { recognizeTextMock } = vi.hoisted(() => ({
  recognizeTextMock: vi.fn(),
}));

vi.mock('../../api/index.js', () => ({
  aiAPI: {
    recognizeText: recognizeTextMock,
  },
}));

// MockFileReader simulates FileReader.readAsDataURL synchronously.
class MockFileReader {
  readAsDataURL(file) {
    this.onload?.({
      target: {
        result: `data:${file.type};base64,bW9jay1iYXNlNjQ=`,
      },
    });
  }
}

// MockImage simulates HTMLImageElement: fires onload synchronously when src is set.
class MockImage {
  set src(_value) {
    this.naturalWidth = 100;
    this.naturalHeight = 100;
    this.onload?.();
  }
}

// mockCanvas is returned by document.createElement('canvas') via the spy below.
const mockCanvasCtx = { drawImage: vi.fn() };
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => mockCanvasCtx),
  // Return the same base64 as MockFileReader so existing assertions still pass.
  toDataURL: vi.fn((type) => `data:${type || 'image/png'};base64,bW9jay1iYXNlNjQ=`),
};

const originalCreateElement = document.createElement.bind(document);

function useCreateHook(overrides = {}) {
  return useImageRecognition({
    setError: vi.fn(),
    setText: vi.fn(),
    setPromptText: vi.fn(),
    setImages: vi.fn(),
    setImage: vi.fn(),
    setIsRecognizingPrompt: vi.fn(),
    setIsRecognizingWriting: vi.fn(),
    promptText: 'Existing prompt',
    analyzeTags: vi.fn(),
    ...overrides,
  });
}

describe('useImageRecognition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.FileReader = MockFileReader;
    global.Image = MockImage;
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'canvas' ? mockCanvas : originalCreateElement(tag)
    );
  });

  it('recognizes writing image successfully and appends OCR text', async () => {
    recognizeTextMock.mockResolvedValueOnce({ text: 'Recognized writing text.' });

    const setError = vi.fn();
    const setImages = vi.fn();
    const setImage = vi.fn();
    const setText = vi.fn();
    const setIsRecognizingWriting = vi.fn();
    const hook = useCreateHook({
      setError,
      setImages,
      setImage,
      setText,
      setIsRecognizingWriting,
    });
    const file = new File(['mock'], 'writing.png', { type: 'image/png' });

    await hook.handleWritingImage(file);

    expect(setError).toHaveBeenCalledWith('');
    expect(setIsRecognizingWriting).toHaveBeenNthCalledWith(1, true);
    expect(recognizeTextMock).toHaveBeenCalledWith({
      image: {
        base64: 'bW9jay1iYXNlNjQ=',
        mediaType: 'image/png',
        name: 'writing.png',
      },
      type: 'student_writing',
    });
    expect(setImages).toHaveBeenCalledWith(expect.any(Function));
    expect(setImage).toHaveBeenCalledWith({
      base64: 'bW9jay1iYXNlNjQ=',
      mediaType: 'image/png',
      name: 'writing.png',
    });
    expect(setText).toHaveBeenCalledWith(expect.any(Function));
    expect(setIsRecognizingWriting).toHaveBeenLastCalledWith(false);
  });

  it('surfaces OCR failure when writing recognition throws', async () => {
    recognizeTextMock.mockRejectedValueOnce(new Error('OCR 服务异常'));

    const setError = vi.fn();
    const setIsRecognizingWriting = vi.fn();
    const hook = useCreateHook({
      setError,
      setIsRecognizingWriting,
    });
    const file = new File(['mock'], 'writing.png', { type: 'image/png' });

    await hook.handleWritingImage(file);

    expect(setError).toHaveBeenCalledWith('OCR 服务异常');
    expect(setIsRecognizingWriting).toHaveBeenNthCalledWith(1, true);
    expect(setIsRecognizingWriting).toHaveBeenLastCalledWith(false);
  });

  it('rejects oversized images before calling OCR', async () => {
    const setError = vi.fn();
    const hook = useCreateHook({ setError });
    const file = new File(['mock'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 });

    await hook.handleWritingImage(file);

    expect(setError).toHaveBeenCalledWith('图片原文件不能超过20MB');
    expect(recognizeTextMock).not.toHaveBeenCalled();
  });

  it('rejects non-image writing files before calling OCR', async () => {
    const setError = vi.fn();
    const hook = useCreateHook({ setError });
    const file = new File(['mock'], 'writing.txt', { type: 'text/plain' });

    await hook.handleWritingImage(file);

    expect(setError).toHaveBeenCalledWith('请上传图片文件');
    expect(recognizeTextMock).not.toHaveBeenCalled();
  });

  it('recognizes pasted prompt image and appends OCR text to prompt', async () => {
    recognizeTextMock.mockResolvedValueOnce({ text: 'Pasted prompt requirement.' });

    const setPromptText = vi.fn();
    const setIsRecognizingPrompt = vi.fn();
    const analyzeTags = vi.fn();
    const hook = useCreateHook({
      setPromptText,
      setIsRecognizingPrompt,
      analyzeTags,
      promptText: 'Existing prompt',
    });
    const imageBlob = new Blob(['image'], { type: 'image/png' });
    const preventDefault = vi.fn();
    const event = {
      preventDefault,
      clipboardData: {
        items: [
          { type: 'text/plain', getAsFile: vi.fn() },
          { type: 'image/png', getAsFile: vi.fn(() => imageBlob) },
        ],
      },
    };

    await hook.handlePromptPaste(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(setIsRecognizingPrompt).toHaveBeenNthCalledWith(1, true);
    expect(setPromptText).toHaveBeenCalledWith('Existing prompt\n\nPasted prompt requirement.');
    expect(analyzeTags).toHaveBeenCalledWith(true, {
      requirements: 'Existing prompt\n\nPasted prompt requirement.',
    });
    expect(setIsRecognizingPrompt).toHaveBeenLastCalledWith(false);
  });

  it('ignores paste events without images', async () => {
    const preventDefault = vi.fn();
    const hook = useCreateHook();

    await hook.handleWritingPaste({
      preventDefault,
      clipboardData: {
        items: [
          { type: 'text/plain', getAsFile: vi.fn() },
        ],
      },
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(recognizeTextMock).not.toHaveBeenCalled();
  });

  it('merges OCR text from prompt images and re-triggers tag analysis', async () => {
    recognizeTextMock
      .mockResolvedValueOnce({ text: 'First block' })
      .mockResolvedValueOnce({ text: 'Second block' });

    const setPromptText = vi.fn();
    const setIsRecognizingPrompt = vi.fn();
    const analyzeTags = vi.fn();
    const hook = useCreateHook({
      setPromptText,
      setIsRecognizingPrompt,
      analyzeTags,
      promptText: 'Existing prompt',
    });
    const files = [
      new File(['one'], 'prompt-1.png', { type: 'image/png' }),
      new File(['two'], 'prompt-2.png', { type: 'image/png' }),
    ];

    await hook.uploadPromptImages(files);

    expect(setIsRecognizingPrompt).toHaveBeenNthCalledWith(1, true);
    expect(setPromptText).toHaveBeenCalledWith('Existing prompt\n\nFirst block\n\nSecond block');
    expect(analyzeTags).toHaveBeenCalledWith(true, {
      requirements: 'Existing prompt\n\nFirst block\n\nSecond block',
    });
    expect(setIsRecognizingPrompt).toHaveBeenLastCalledWith(false);
  });
});
