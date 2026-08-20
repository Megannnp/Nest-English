import { describe, expect, it } from 'vitest';

import {
  buildWritingPageModelDerivedState,
  countWritingWords,
  resolveNextFeedback,
  resolveWritingMaxScore,
} from './useWritingPageModelState.jsx';

describe('useWritingPageModelState helpers', () => {
  it('keeps the more advanced active feedback snapshot', () => {
    const current = { generation: { active: true, progress: 80 } };
    const saved = { generation: { active: true, progress: 30 } };

    expect(resolveNextFeedback(current, saved)).toBe(current);
  });

  it('counts normalized writing words', () => {
    expect(countWritingWords(' one   two\nthree ')).toBe(3);
    expect(countWritingWords('   ')).toBe(0);
  });

  it('resolves custom and preset max scores', () => {
    expect(resolveWritingMaxScore('custom', '25')).toBe(25);
    expect(resolveWritingMaxScore('20', '')).toBe(20);
  });

  it('builds stable derived state for task mode and source tag', () => {
    const derived = buildWritingPageModelDerivedState({
      guestMode: false,
      source: 'homework',
      taskContext: { id: 'task-1' },
      activeTaskContext: null,
      text: 'one two three',
      maxOpt: 'custom',
      customMax: '30',
    });

    expect(derived.currentTaskContext).toEqual({ id: 'task-1' });
    expect(derived.isTaskMode).toBe(true);
    expect(derived.words).toBe(3);
    expect(derived.max).toBe(30);
    expect(derived.visibleSourceTag).not.toBeNull();
  });
});
