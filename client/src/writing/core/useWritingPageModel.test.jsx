import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWritingPageModel } from './useWritingPageModel.jsx';

const analyzeTagsMock = vi.fn();
const setPromptTextMock = vi.fn();
const setTextMock = vi.fn();
const setImagesMock = vi.fn();
const setImageMock = vi.fn();
const setWritingTitleMock = vi.fn();
const setIsRecognizingPromptMock = vi.fn();
const setIsRecognizingWritingMock = vi.fn();
const submissionSubmitMock = vi.fn();
const handleWritingImageMock = vi.fn();
const handlePromptPasteMock = vi.fn();
const handleWritingPasteMock = vi.fn();
const uploadPromptImagesMock = vi.fn();
const { createRealtimeAsrSessionMock } = vi.hoisted(() => ({
  createRealtimeAsrSessionMock: vi.fn(),
}));

let draftModelState;

vi.mock('./useWritingDraft.js', () => ({
  useWritingDraftModel: vi.fn(() => ({
    state: draftModelState,
    actions: {
      setPromptText: setPromptTextMock,
      setText: setTextMock,
      setImages: setImagesMock,
      setImage: setImageMock,
      setWritingTitle: setWritingTitleMock,
      setIsRecognizingPrompt: setIsRecognizingPromptMock,
      setIsRecognizingWriting: setIsRecognizingWritingMock,
      analyzeTags: analyzeTagsMock,
    },
  })),
}));

vi.mock('./useWritingSubmission.js', () => ({
  useWritingSubmission: vi.fn(() => ({
    submit: submissionSubmitMock,
  })),
}));

vi.mock('./useImageRecognition.js', () => ({
  useImageRecognition: vi.fn(() => ({
    handlePromptPaste: handlePromptPasteMock,
    handleWritingPaste: handleWritingPasteMock,
    handleWritingImage: handleWritingImageMock,
    uploadPromptImages: uploadPromptImagesMock,
  })),
}));

vi.mock('./realtimeAsrClient.js', () => ({
  createRealtimeAsrSession: createRealtimeAsrSessionMock,
}));

function createBaseProps() {
  return {
    user: { id: 'student-1', role: 'student' },
    questions: [],
    preloadedQuestion: null,
    taskContext: null,
    initialDraft: null,
    savedFeedback: null,
    onDraftChange: vi.fn(),
    guestMode: false,
    onFeedbackChange: vi.fn(),
    onQuestionsChange: vi.fn(),
    onWritingSaved: vi.fn(),
    onRequireAuth: vi.fn(),
  };
}

describe('useWritingPageModel high-value behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
    createRealtimeAsrSessionMock.mockResolvedValue({
      stop: vi.fn(),
      abort: vi.fn(),
    });
    draftModelState = {
      maxOpt: '15',
      customMax: '',
      writingTitle: 'Test title',
      promptText: 'Prompt content long enough',
      text: 'Writing content long enough for testing',
      image: null,
      studentsInClass: [],
      source: 'self',
      taskContext: null,
    };
  });

  it('triggers analyzeTags on Enter when prompt or writing has enough content', async () => {
    const { result } = renderHook(() => useWritingPageModel(createBaseProps()));

    const preventDefault = vi.fn();
    await act(async () => {
      result.current.actions.handlePromptKeyDown({
        key: 'Enter',
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        preventDefault,
      });
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(analyzeTagsMock).toHaveBeenCalledWith(true);
  });

  it('marks voice as unsupported when realtime ASR capture is unavailable', async () => {
    const { result } = renderHook(() => useWritingPageModel(createBaseProps()));

    await waitFor(() => {
      expect(result.current.state.voiceSupported).toBe(false);
    });

    await act(async () => {
      await result.current.actions.toggleVoiceInput('writing');
    });

    expect(result.current.state.voiceListeningTarget).toBe('');
    expect(result.current.state.voiceSessionStateByTarget.writing).toBe('idle');
  });

  it('delegates writing image handling to the image recognition actions', async () => {
    const file = new File(['mock'], 'writing.png', { type: 'image/png' });
    const { result } = renderHook(() => useWritingPageModel(createBaseProps()));

    await act(async () => {
      await result.current.actions.handleWritingImage(file);
    });

    expect(handleWritingImageMock).toHaveBeenCalledWith(file);
  });

  it('computes max score and word count before submitting', async () => {
    draftModelState = {
      ...draftModelState,
      maxOpt: 'custom',
      customMax: '25',
      text: 'one two three four five six',
    };

    const { result } = renderHook(() => useWritingPageModel(createBaseProps()));

    await act(async () => {
      await result.current.actions.submitWriting();
    });

    expect(submissionSubmitMock).toHaveBeenCalledWith({
      max: 25,
      words: 6,
    });
  });

  it('clears prompt and title before restarting prompt voice input', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
    window.AudioContext = class AudioContextMock {};
    createRealtimeAsrSessionMock.mockImplementation(async ({ onOpen }) => {
      onOpen?.();
      return { stop: vi.fn(), abort: vi.fn() };
    });

    const { result } = renderHook(() => useWritingPageModel(createBaseProps()));

    await waitFor(() => {
      expect(result.current.state.voiceSupported).toBe(true);
    });

    await act(async () => {
      await result.current.actions.restartVoiceInput('prompt');
    });

    expect(setPromptTextMock).toHaveBeenCalledWith('');
    expect(setWritingTitleMock).toHaveBeenCalledWith('');
    expect(result.current.state.voiceSessionStateByTarget.prompt).toBe('recording');
  });

  it('ignores stale close events from an aborted voice session after restart', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
    window.AudioContext = class AudioContextMock {};
    const sessions = [];
    createRealtimeAsrSessionMock.mockImplementation(async (handlers) => {
      sessions.push(handlers);
      handlers.onOpen?.();
      return { stop: vi.fn(), abort: vi.fn() };
    });

    const { result } = renderHook(() => useWritingPageModel(createBaseProps()));

    await waitFor(() => {
      expect(result.current.state.voiceSupported).toBe(true);
    });

    await act(async () => {
      await result.current.actions.restartVoiceInput('prompt');
    });
    await act(async () => {
      await result.current.actions.restartVoiceInput('prompt');
    });
    await act(async () => {
      sessions[0].onClose?.();
    });

    expect(result.current.state.voiceListeningTarget).toBe('prompt');
    expect(result.current.state.voiceSessionStateByTarget.prompt).toBe('recording');
  });

  it('ignores stale recognition results after finishing voice input', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
    window.AudioContext = class AudioContextMock {};
    let handlers;
    const stop = vi.fn();
    createRealtimeAsrSessionMock.mockImplementation(async (nextHandlers) => {
      handlers = nextHandlers;
      handlers.onOpen?.();
      return { stop, abort: vi.fn() };
    });

    const { result } = renderHook(() => useWritingPageModel(createBaseProps()));

    await waitFor(() => {
      expect(result.current.state.voiceSupported).toBe(true);
    });

    await act(async () => {
      await result.current.actions.toggleVoiceInput('writing');
    });
    await act(async () => {
      await result.current.actions.finishVoiceInput('writing');
    });
    await act(async () => {
      handlers.onResult?.({ text: 'stale transcript' });
      handlers.onClose?.();
    });

    expect(stop).toHaveBeenCalled();
    expect(setTextMock).not.toHaveBeenCalledWith(expect.stringContaining('stale transcript'));
    expect(result.current.state.voiceSessionStateByTarget.writing).toBe('idle');
  });
});
