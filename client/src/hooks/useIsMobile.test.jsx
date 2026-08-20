import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useIsMobile from './useIsMobile.js';

function installMatchMedia(initialMatches = false) {
  const listeners = new Set();
  let matches = initialMatches;

  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn((event, listener) => {
      if (event === 'change') listeners.add(listener);
    }),
    removeEventListener: vi.fn((event, listener) => {
      if (event === 'change') listeners.delete(listener);
    }),
    dispatch(nextMatches) {
      matches = nextMatches;
      this.matches = nextMatches;
      listeners.forEach((listener) => listener({ matches: nextMatches, media: query }));
    },
  }));
}

describe('useIsMobile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses matchMedia initial value', () => {
    installMatchMedia(true);

    const { result } = renderHook(() => useIsMobile(900));

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 900px)');
    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    installMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    const mediaQuery = window.matchMedia.mock.results[0].value;

    expect(result.current).toBe(false);

    act(() => {
      mediaQuery.dispatch(true);
    });

    expect(result.current).toBe(true);
  });
});
