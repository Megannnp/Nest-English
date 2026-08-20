import { describe, expect, it } from 'vitest';

import { adaptFeedbackData, normalizeType } from './feedbackAdapter.js';

describe('feedbackAdapter', () => {
  it('prefers structured excellent/corrected sample essays over legacy sample essay fields', () => {
    const adapted = adaptFeedbackData({
      type: 'general',
      sampleEssay: {
        title: '旧范文',
        text: 'legacy sample essay',
      },
      aiEvaluation: {
        correctedSampleEssay: {
          title: '批改后范文',
          text: 'corrected sample essay',
        },
        excellentSampleEssay: {
          title: '优秀范文',
          text: 'excellent sample essay',
        },
      },
    });

    expect(adapted.correctedSampleEssay).toMatchObject({
      title: '批改后范文',
      text: 'corrected sample essay',
    });
    expect(adapted.excellentSampleEssay).toMatchObject({
      title: '优秀范文',
      text: 'excellent sample essay',
    });
    expect(adapted.sampleEssay).toMatchObject({
      title: '优秀范文',
      text: 'excellent sample essay',
    });
  });

  it('adapts second-pass deepReview grammar/content/structure fields from aiEvaluation', () => {
    const adapted = adaptFeedbackData({
      type: 'general',
      aiEvaluation: {
        deepReview: {
          grammar: [
            {
              title: '主谓一致',
              detail: 'He go 应改为 He goes。',
            },
          ],
          contentLogic: [
            {
              title: '例子不足',
              detail: '第二段需要补一个具体经历。',
            },
          ],
          structure: [
            {
              title: '结尾收束',
              detail: '最后一句需要回扣主题。',
            },
          ],
        },
      },
    });

    expect(adapted.grammarIssues).toEqual([
      expect.objectContaining({
        original: '主谓一致',
        corrected: '建议结合上下文改写这一处表达',
        explanation: 'He go 应改为 He goes。',
      }),
    ]);
    expect(adapted.contentLogic).toEqual([
      expect.objectContaining({
        title: '例子不足',
        detail: '第二段需要补一个具体经历。',
      }),
    ]);
    expect(adapted.structure).toEqual([
      expect.objectContaining({
        title: '结尾收束',
        detail: '最后一句需要回扣主题。',
      }),
    ]);
  });

  it('normalizes continuation-specific fallback structures from granular fields', () => {
    const adapted = adaptFeedbackData({
      type: 'continuation',
      plotLogic: {
        summary: '情节承接自然。',
        strengths: ['承接上文冲突'],
        risks: ['结尾略快'],
        bridgingSuggestions: ['补一句情绪过渡。'],
      },
      characterConsistency: {
        summary: '人物反应合理。',
        strengths: ['动作符合人物性格'],
        risks: ['语气还能更稳定'],
        revisionFocus: ['统一人物口吻。'],
      },
      themeAlignment: {
        summary: '主题方向没有跑偏。',
        strengths: ['扣住成长主题'],
        risks: ['点题句偏弱'],
        revisionFocus: ['最后一段再回扣主题。'],
      },
      languageIssues: [
        {
          title: '时态不统一',
          detail: '叙述时态前后切换。',
          example: '统一为一般过去时。',
        },
      ],
    });

    expect(adapted.questionAnalysis.contentAnalysis).toMatchObject({
      plotLogic: {
        summary: '情节承接自然。',
        strengths: ['承接上文冲突'],
        risks: ['结尾略快'],
        bridgingSuggestions: ['补一句情绪过渡。'],
      },
      characterConsistency: {
        summary: '人物反应合理。',
        strengths: ['动作符合人物性格'],
        risks: ['语气还能更稳定'],
        revisionFocus: ['统一人物口吻。'],
      },
      themeAlignment: {
        summary: '主题方向没有跑偏。',
        strengths: ['扣住成长主题'],
        risks: ['点题句偏弱'],
        revisionFocus: ['最后一段再回扣主题。'],
      },
    });
    expect(adapted.questionAnalysis.logicStructure).toMatchObject({
      coherence: '情节承接自然。',
      transitionQuality: '补一句情绪过渡。',
      flowIssues: ['结尾略快'],
      strengths: ['承接上文冲突'],
    });
    expect(adapted.grammarIssues).toEqual([
      {
        original: '时态不统一',
        corrected: '统一为一般过去时。',
        explanation: '叙述时态前后切换。',
      },
    ]);
  });

  it('falls back to question continuation starters when feedback payload omits them', () => {
    const adapted = adaptFeedbackData(
      {
        type: 'continuation',
      },
      {
        continuationStarters: {
          para1: { text: 'Para1 starter' },
          para2: { text: 'Para2 starter' },
        },
      }
    );

    expect(adapted.questionAnalysis.plotAnalysis.para1Starter).toBe('Para1 starter');
    expect(adapted.questionAnalysis.plotAnalysis.para2Starter).toBe('Para2 starter');
  });

  it('derives analysis meta status and fallback source from partial prompt-analysis payloads', () => {
    const adapted = adaptFeedbackData({
      aiAnalysisStructured: {
        promptAnalysis: {
          status: 'partial',
          fallbackSource: 'previous_result',
          overview: '沿用上一版题目分析。',
          focusPoints: ['保留原始任务边界'],
        },
      },
    });

    expect(adapted.analysisMeta).toMatchObject({
      status: 'partial',
      fallbackSource: 'previous_result',
      degraded: false,
      supplementalStatus: 'not_started',
    });
    expect(adapted.questionAnalysis).toMatchObject({
      status: 'partial',
      fallbackSource: 'previous_result',
      overview: '沿用上一版题目分析。',
      focusPoints: ['保留原始任务边界'],
    });
    expect(adapted.focusPoints).toBeUndefined();
  });

  it('keeps question analysis as the canonical source instead of duplicating analysis aliases on the root object', () => {
    const adapted = adaptFeedbackData({
      aiAnalysisStructured: {
        promptAnalysis: {
          overview: '只保留在 questionAnalysis 里。',
          risks: ['先不要扩散根级字段'],
          taskAnalysis: {
            hardRequirements: ['完成任务'],
          },
          storyLine: {
            result: '回到主题',
          },
        },
      },
    });

    expect(adapted.questionAnalysis).toMatchObject({
      overview: '只保留在 questionAnalysis 里。',
      risks: ['先不要扩散根级字段'],
      taskAnalysis: {
        hardRequirements: ['完成任务'],
      },
      storyLine: {
        result: '回到主题',
      },
    });
    expect(adapted.overview).toBeUndefined();
    expect(adapted.risks).toBeUndefined();
    expect(adapted.taskAnalysis).toBeUndefined();
    expect(adapted.storyLine).toBeUndefined();
  });

  it('normalizes legacy and localized type aliases into stable type ids', () => {
    expect(normalizeType('读后续写')).toBe('continuation');
    expect(normalizeType('chart')).toBe('chart_writing');
    expect(normalizeType('观后感')).toBe('review');
    expect(normalizeType('mystery_type')).toBe('general');
  });
});
