import { describe, expect, it } from 'vitest';

import {
  extractPromptMaxScore,
  getPrimaryHighlight,
  getPrimaryImprovement,
  getQuickActionList,
  getQuickProblemList,
  normalizeRecognizedEssayText,
} from './shared.js';

describe('batch grading shared helpers', () => {
  it('joins OCR line breaks inside the same paragraph', () => {
    expect(normalizeRecognizedEssayText('The starting gun was fired.\nAt the beginning\nI felt nervous.\n\nHowever,\nI kept running.')).toBe(
      'The starting gun was fired. At the beginning I felt nervous.\n\nHowever, I kept running.'
    );
  });

  it('extracts the max score from prompt text for assignment mismatch warnings', () => {
    expect(extractPromptMaxScore('（满分25分）阅读下面材料')).toBe(25);
    expect(extractPromptMaxScore('满分：22 分，请完成作文')).toBe(22);
    expect(extractPromptMaxScore('请完成作文')).toBeNull();
  });

  it('does not show next actions as the primary highlight', () => {
    const feedback = {
      nextActions: ['先修正时态错误'],
      highlights: { content: ['内容完成度较高'] },
    };

    expect(getPrimaryHighlight(feedback)).toBe('内容完成度较高');
    expect(getPrimaryImprovement(feedback)).toBe('先修正时态错误');
  });

  it('normalizes structured feedback list items before rendering batch summaries', () => {
    const feedback = {
      mainProblems: [{ title: '结构问题', detail: '第二段和第三段衔接弱' }],
      improvements: [{ title: '过渡句', technique: '用 however 引出转折' }],
    };

    expect(getQuickProblemList(feedback)).toEqual(['第二段和第三段衔接弱']);
    expect(getQuickActionList(feedback)).toEqual(['用 however 引出转折']);
  });
});
