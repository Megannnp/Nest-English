import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aiCompleteMock } = vi.hoisted(() => ({
  aiCompleteMock: vi.fn(),
}));

vi.mock('../../api/index.js', () => ({
  aiAPI: {
    complete: aiCompleteMock,
  },
}));

describe('repairMalformedFeedbackJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds continuation-specific essay constraints to the repair prompt', async () => {
    aiCompleteMock.mockResolvedValueOnce({
      content: JSON.stringify({
        totalScore: 18,
        maxScore: 25,
        type: 'continuation',
        writingType: 'continuation',
        tier: '第五档',
        summary: '主线基本完整。',
        categories: [],
        highlights: { vocabulary: [], sentences: [], content: [] },
        grammarIssues: [],
        correctedSampleEssay: { title: '', text: '', highlights: [] },
        excellentSampleEssay: { title: '', text: '', highlights: [] },
        sampleEssay: { title: '', text: '', highlights: [] },
        improvements: [],
        weaknesses: [],
      }),
    });

    const { repairMalformedFeedbackJson } = await import('./writingFeedback.js');
    await repairMalformedFeedbackJson('{"broken": true', 'continuation', 25, {
      promptText: '读后续写题目原文',
      continuationStarters: {
        para1: 'The starting gun was fired, and the race began.',
        para2: 'Prokhorova was running ahead of me.',
      },
    });

    const payload = aiCompleteMock.mock.calls[0][0];
    const userMessage = payload.messages.find((item) => item.role === 'user')?.content || '';

    expect(userMessage).toContain('"correctedSampleEssay": { "title": ""');
    expect(userMessage).toContain('title 必须为空字符串');
    expect(userMessage).toContain('严格分成两段');
    expect(userMessage).toContain('两句段首句原样开头');
    expect(userMessage).toContain('The starting gun was fired, and the race began.');
    expect(userMessage).toContain('Prokhorova was running ahead of me.');
    expect(userMessage).toContain('读后续写题目原文');
    expect(userMessage).toContain('sampleEssay 必须与 excellentSampleEssay 保持一致');
  });
});
