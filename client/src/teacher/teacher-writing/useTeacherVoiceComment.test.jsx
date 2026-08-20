import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeacherVoiceComment } from './useTeacherVoiceComment.jsx';

const { createRealtimeAsrSessionMock } = vi.hoisted(() => ({
  createRealtimeAsrSessionMock: vi.fn(),
}));

vi.mock('../../writing/core/realtimeAsrClient.js', () => ({
  createRealtimeAsrSession: createRealtimeAsrSessionMock,
}));

function installRealtimeAsrSupport() {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn() },
    configurable: true,
  });
  window.WebSocket = class WebSocketMock {};
  window.AudioContext = class AudioContextMock {};
  window.webkitAudioContext = undefined;
}

function createCommentSetter(initial = '') {
  let comment = initial;
  const setComment = vi.fn((next) => {
    comment = typeof next === 'function' ? next(comment) : next;
  });
  return { setComment, getComment: () => comment };
}

describe('useTeacherVoiceComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    window.WebSocket = undefined;
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
  });

  it('keeps teacher voice disabled when realtime ASR capture is unavailable', async () => {
    const { setComment } = createCommentSetter();
    const setMessage = vi.fn();

    const { result } = renderHook(() => useTeacherVoiceComment('writing-1', setComment, setMessage));

    await waitFor(() => {
      expect(result.current.voiceSupported).toBe(false);
    });

    act(() => {
      result.current.handleToggleVoiceComment();
    });

    expect(createRealtimeAsrSessionMock).not.toHaveBeenCalled();
  });

  it('writes realtime ASR transcript into the teacher comment', async () => {
    installRealtimeAsrSupport();
    const { setComment, getComment } = createCommentSetter('已有评价');
    const setMessage = vi.fn();
    let handlers;
    const stop = vi.fn();
    createRealtimeAsrSessionMock.mockImplementation(async (nextHandlers) => {
      handlers = nextHandlers;
      nextHandlers.onOpen?.();
      return { stop, abort: vi.fn() };
    });

    const { result } = renderHook(() => useTeacherVoiceComment('writing-1', setComment, setMessage));

    await waitFor(() => {
      expect(result.current.voiceSupported).toBe(true);
    });
    await act(async () => {
      result.current.handleToggleVoiceComment();
    });
    await act(async () => {
      handlers.onResult?.({ text: '需要先补充主题句' });
    });

    expect(createRealtimeAsrSessionMock).toHaveBeenCalledWith(expect.objectContaining({ language: 'zh-CN' }));
    expect(getComment()).toBe('已有评价\n需要先补充主题句');

    await act(async () => {
      result.current.handleToggleVoiceComment();
      handlers.onClose?.();
    });

    expect(stop).toHaveBeenCalled();
    expect(result.current.isVoiceListening).toBe(false);
    expect(getComment()).toBe('已有评价\n需要先补充主题句');
  });
});
