import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRealtimeAsrSession } from './realtimeAsrClient.js';
import { useWritingVoiceInput } from './useWritingVoiceInput.js';

vi.mock('./realtimeAsrClient.js', () => ({
  createRealtimeAsrSession: vi.fn(),
}));

function stubRealtimeAsrSupport() {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn() },
    configurable: true,
  });
  window.WebSocket = window.WebSocket || function WebSocketStub() {};
  window.AudioContext = window.AudioContext || function AudioContextStub() {};
}

function clearRealtimeAsrSupport() {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
}

function createBaseProps(overrides = {}) {
  return {
    draftState: { promptText: '', text: '' },
    setError: vi.fn(),
    setPromptText: vi.fn(),
    setText: vi.fn(),
    setWritingTitle: vi.fn(),
    ...overrides,
  };
}

/** Queues a resolvable session handle for the next createRealtimeAsrSession() call and returns both. */
function queueSession() {
  const handle = { stop: vi.fn(), abort: vi.fn() };
  let capturedOpts;
  createRealtimeAsrSession.mockImplementationOnce(async (opts) => {
    capturedOpts = opts;
    return handle;
  });
  return { handle, getOpts: () => capturedOpts };
}

describe('useWritingVoiceInput', () => {
  beforeEach(() => {
    createRealtimeAsrSession.mockReset();
    stubRealtimeAsrSupport();
  });

  afterEach(() => {
    clearRealtimeAsrSupport();
  });

  it('detects realtime ASR support on mount', async () => {
    const { result } = renderHook(() => useWritingVoiceInput(createBaseProps()));
    await waitFor(() => expect(result.current.state.voiceSupported).toBe(true));
  });

  it('reports an error instead of starting a session when unsupported', async () => {
    clearRealtimeAsrSupport();
    const setError = vi.fn();
    const { result } = renderHook(() => useWritingVoiceInput(createBaseProps({ setError })));
    await waitFor(() => expect(result.current.state.voiceSupported).toBe(false));

    await act(async () => {
      await result.current.actions.toggleVoiceInput('writing');
    });

    expect(setError).toHaveBeenCalledWith(expect.stringContaining('不支持实时语音识别'));
    expect(createRealtimeAsrSession).not.toHaveBeenCalled();
  });

  it('starts a recording session and applies transcripts to the target field', async () => {
    const setText = vi.fn();
    const { handle, getOpts } = queueSession();
    const { result } = renderHook(() => useWritingVoiceInput(createBaseProps({ setText })));
    await waitFor(() => expect(result.current.state.voiceSupported).toBe(true));

    await act(async () => {
      await result.current.actions.toggleVoiceInput('writing');
    });

    expect(result.current.state.voiceListeningTarget).toBe('writing');
    expect(result.current.state.voiceSessionStateByTarget.writing).toBe('recording');

    act(() => {
      getOpts().onResult({ text: 'Hello world', definite: true });
    });

    expect(setText).toHaveBeenCalledWith('Hello world');
    expect(handle.stop).not.toHaveBeenCalled();
  });

  it('pauses the session on a second toggle for the same target', async () => {
    const { handle } = queueSession();
    const { result } = renderHook(() => useWritingVoiceInput(createBaseProps()));
    await waitFor(() => expect(result.current.state.voiceSupported).toBe(true));

    await act(async () => {
      await result.current.actions.toggleVoiceInput('writing');
    });
    await act(async () => {
      await result.current.actions.toggleVoiceInput('writing');
    });

    expect(handle.stop).toHaveBeenCalledTimes(1);
    expect(result.current.state.voiceSessionStateByTarget.writing).toBe('paused');
    expect(result.current.state.voiceListeningTarget).toBe('');
  });

  it('surfaces ASR errors and resets the session state for the target', async () => {
    const setError = vi.fn();
    const { getOpts } = queueSession();
    const { result } = renderHook(() => useWritingVoiceInput(createBaseProps({ setError })));
    await waitFor(() => expect(result.current.state.voiceSupported).toBe(true));

    await act(async () => {
      await result.current.actions.toggleVoiceInput('writing');
    });

    act(() => {
      getOpts().onError('麦克风被占用');
    });

    expect(setError).toHaveBeenCalledWith('麦克风被占用');
    expect(result.current.state.voiceSessionStateByTarget.writing).toBe('idle');
    expect(result.current.state.voiceListeningTarget).toBe('');
  });

  it('ignores late events from a stale session after restartVoiceInput starts a new one', async () => {
    const setText = vi.fn();
    const sessionA = queueSession();
    const { result } = renderHook(() => useWritingVoiceInput(createBaseProps({ setText })));
    await waitFor(() => expect(result.current.state.voiceSupported).toBe(true));

    await act(async () => {
      await result.current.actions.toggleVoiceInput('writing');
    });
    // Session A must finish "connecting" (onOpen) before a second start attempt is allowed through.
    act(() => {
      sessionA.getOpts().onOpen();
    });

    const sessionB = queueSession();
    await act(async () => {
      await result.current.actions.restartVoiceInput('writing');
    });

    // Session A's abort() was already called by restart; simulate its onResult still firing late.
    act(() => {
      sessionA.getOpts().onResult({ text: 'stale from session A' });
    });
    expect(setText).not.toHaveBeenCalledWith('stale from session A');

    act(() => {
      sessionB.getOpts().onResult({ text: 'fresh from session B' });
    });
    expect(setText).toHaveBeenCalledWith('fresh from session B');

    expect(sessionA.handle.abort).toHaveBeenCalledTimes(1);
  });

  it('lets restartVoiceInput start a fresh session even while the previous one is still connecting, and aborts the stale one on late resolution', async () => {
    const setText = vi.fn();
    let resolveSessionA;
    createRealtimeAsrSession.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSessionA = resolve;
    }));
    const { result } = renderHook(() => useWritingVoiceInput(createBaseProps({ setText })));
    await waitFor(() => expect(result.current.state.voiceSupported).toBe(true));

    let startPromise;
    act(() => {
      startPromise = result.current.actions.toggleVoiceInput('writing');
    });

    // Restart before session A's createRealtimeAsrSession() promise ever resolves. This must still
    // succeed in starting session B instead of silently no-op'ing while A is "starting".
    const sessionB = queueSession();
    await act(async () => {
      await result.current.actions.restartVoiceInput('writing');
    });
    expect(createRealtimeAsrSession).toHaveBeenCalledTimes(2);

    act(() => {
      sessionB.getOpts().onResult({ text: 'from the active session' });
    });
    expect(setText).toHaveBeenCalledWith('from the active session');

    const staleHandle = { stop: vi.fn(), abort: vi.fn() };
    await act(async () => {
      resolveSessionA(staleHandle);
      await startPromise;
    });

    expect(staleHandle.abort).toHaveBeenCalledTimes(1);
  });
});
