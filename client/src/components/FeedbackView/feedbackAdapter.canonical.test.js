import { describe, expect, it } from 'vitest';

import { adaptFeedbackData } from './feedbackAdapter.js';

describe('feedbackAdapter canonical shape', () => {
  it('prefers structured navigation payloads over legacy root aliases', () => {
    const adapted = adaptFeedbackData({
      positives: {
        content: ['legacy content'],
      },
      weaknesses: ['legacy weakness'],
      suggestions: ['legacy suggestion'],
      advancedSuggestions: ['legacy advanced'],
      aiEvaluation: {
        navigation: {
          highlights: {
            content: ['structured content'],
          },
          weaknesses: ['structured weakness'],
          suggestions: ['structured suggestion'],
        },
      },
    });

    expect(adapted.highlights).toEqual({
      content: ['structured content'],
    });
    expect(adapted.weaknesses).toEqual(['structured weakness']);
    expect(adapted.suggestions).toEqual(['structured suggestion']);
    expect(adapted.improvements).toEqual(['structured suggestion']);
    expect(adapted.advancedSuggestions).toEqual(['legacy advanced']);
  });
});
