import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWritingDraftModel } from './useWritingDraft.js';

vi.mock('../../api/index.js', () => ({
  aiAPI: {
    analyzeTags: vi.fn(),
  },
  classesAPI: {
    list: vi.fn(),
    getStudents: vi.fn(),
  },
}));

function createBaseProps(overrides = {}) {
  return {
    user: { id: 'student-1', role: 'student' },
    questions: [],
    preloadedQuestion: null,
    taskContext: null,
    initialDraft: null,
    draftHydrationKey: 'draft-key-1',
    onDraftChange: vi.fn(),
    _guestMode: false,
    ...overrides,
  };
}

describe('useWritingDraftModel', () => {
  it('hydrates revision source id into draft state and persisted draft snapshot', async () => {
    const onDraftChange = vi.fn();
    const { result } = renderHook(() => useWritingDraftModel(createBaseProps({
      onDraftChange,
      initialDraft: {
        text: 'Original draft text',
        writingTitle: 'Original title',
        promptText: 'Original prompt',
        manualType: 'summary',
        versionOfWritingId: 'writing-original-1',
      },
    })));

    await waitFor(() => {
      expect(result.current.state.versionOfWritingId).toBe('writing-original-1');
    });

    expect(onDraftChange).toHaveBeenLastCalledWith(expect.objectContaining({
      versionOfWritingId: 'writing-original-1',
    }));
  });

  it('clears revision source id when the draft is reset', async () => {
    const { result } = renderHook(() => useWritingDraftModel(createBaseProps({
      initialDraft: {
        text: 'Original draft text',
        versionOfWritingId: 'writing-original-1',
      },
    })));

    await waitFor(() => {
      expect(result.current.state.versionOfWritingId).toBe('writing-original-1');
    });

    act(() => {
      result.current.actions.setVersionOfWritingId(null);
    });

    expect(result.current.state.versionOfWritingId).toBeNull();
  });
});
