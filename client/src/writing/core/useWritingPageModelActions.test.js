import { describe, expect, it, vi } from 'vitest';

import {
  canAnalyzePromptText,
  createPromptKeyDownHandler,
  shouldTriggerPromptAnalysis,
} from './useWritingPageModelActions.js';

describe('useWritingPageModelActions helpers', () => {
  it('recognizes plain Enter as the analysis shortcut', () => {
    expect(shouldTriggerPromptAnalysis({
      key: 'Enter',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
    })).toBe(true);

    expect(shouldTriggerPromptAnalysis({
      key: 'Enter',
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
    })).toBe(false);
  });

  it('requires enough prompt or writing content before analysis', () => {
    expect(canAnalyzePromptText('short', 'tiny')).toBe(false);
    expect(canAnalyzePromptText('Prompt content long enough', '')).toBe(true);
  });

  it('prevents default and triggers analyzeTags when shortcut conditions match', () => {
    const analyzeTags = vi.fn();
    const preventDefault = vi.fn();
    const handler = createPromptKeyDownHandler({
      promptText: 'Prompt content long enough',
      text: '',
      analyzeTags,
    });

    handler({
      key: 'Enter',
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(analyzeTags).toHaveBeenCalledWith(true);
  });
});
