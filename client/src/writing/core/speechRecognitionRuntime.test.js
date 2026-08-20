import { describe, expect, it, vi } from 'vitest';

import { createSpeechRecognitionRuntime } from './speechRecognitionRuntime.js';

class SpeechRecognitionMock {
  constructor() {
    this.start = vi.fn();
    this.stop = vi.fn();
  }
}

function createRuntime(overrides = {}) {
  const stateUpdates = [];
  const statusUpdates = [];
  const listeningTargets = [];
  const recognitionStartingRef = { current: false };
  const voiceTargetRef = { current: 'writing' };
  const voiceActionRef = { current: 'start' };
  const runtime = createSpeechRecognitionRuntime({
    SpeechRecognition: SpeechRecognitionMock,
    setError: vi.fn(),
    setPromptText: vi.fn(),
    setText: vi.fn(),
    showVoiceStatus: (target, text, tone, timeout) => {
      statusUpdates.push({ target, text, tone, timeout });
    },
    voiceTargetRef,
    voiceActionRef,
    voiceStatusTimersRef: { current: {} },
    voiceFinalTranscriptRef: { current: '' },
    voiceInterimTranscriptRef: { current: '' },
    recognitionStartingRef,
    setVoiceListeningTarget: (target) => listeningTargets.push(target),
    setVoiceSessionStateByTarget: (updater) => {
      const previous = stateUpdates.at(-1)?.state || { prompt: 'idle', writing: 'recording' };
      stateUpdates.push({ state: updater(previous) });
    },
    VOICE_IDLE: 'idle',
    VOICE_PAUSED: 'paused',
    VOICE_RECORDING: 'recording',
    ...overrides,
  });

  return {
    ...runtime,
    listeningTargets,
    recognitionStartingRef,
    stateUpdates,
    statusUpdates,
    voiceActionRef,
    voiceTargetRef,
  };
}

describe('createSpeechRecognitionRuntime', () => {
  it('keeps active sessions alive when the browser ends a recognition chunk', () => {
    vi.useFakeTimers();
    const dispatchEvent = vi.spyOn(window, 'dispatchEvent');
    const runtime = createRuntime();

    runtime.recognition.onend();

    expect(runtime.recognition.continuous).toBe(true);
    expect(runtime.stateUpdates.at(-1).state.writing).toBe('recording');
    expect(runtime.statusUpdates.at(-1)).toMatchObject({
      target: 'writing',
      text: '录音识别中',
      tone: 'active',
    });
    expect(runtime.listeningTargets).toContain('');

    vi.runOnlyPendingTimers();
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'nest-voice-restart',
      detail: 'writing',
    }));
    dispatchEvent.mockRestore();
    vi.useRealTimers();
  });

  it('finishes the session when the user clicks complete', () => {
    const runtime = createRuntime();
    runtime.voiceActionRef.current = 'complete';

    runtime.recognition.onend();

    expect(runtime.stateUpdates.at(-1).state.writing).toBe('idle');
    expect(runtime.statusUpdates.at(-1)).toMatchObject({
      target: 'writing',
      text: '录音已完成',
      tone: 'muted',
    });
  });

  it('surfaces browser speech service failures with actionable copy', () => {
    const setError = vi.fn();
    const runtime = createRuntime({ setError });

    runtime.recognition.onerror({ error: 'network' });

    expect(setError).toHaveBeenCalledWith('浏览器语音识别服务连接失败，请改用 Chrome/Edge、稳定网络，或键盘/图片输入。');
    expect(runtime.statusUpdates.at(-1)).toMatchObject({
      target: 'writing',
      text: '浏览器语音识别服务连接失败，请改用 Chrome/Edge、稳定网络，或键盘/图片输入。',
      tone: 'error',
    });
    expect(runtime.stateUpdates.at(-1).state.writing).toBe('idle');
  });
});
