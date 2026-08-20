import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useAnalyticsPanelModel from './useAnalyticsPanelModel.jsx';

describe('useAnalyticsPanelModel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts current-week writings in the latest trend bucket', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00Z'));

    const { result } = renderHook(() => useAnalyticsPanelModel({
      writings: [
        { id: 'today', createdAt: Date.parse('2026-07-17T08:00:00Z') },
        { id: 'yesterday', createdAt: Date.parse('2026-07-16T08:00:00Z') },
      ],
      isMobile: false,
    }));

    expect(result.current.weeklyData.at(-1)).toMatchObject({ count: 2 });
  });
});
