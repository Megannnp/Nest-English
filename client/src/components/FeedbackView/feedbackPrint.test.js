import { describe, expect, it } from 'vitest';

import { buildFeedbackPdfHtml } from './feedbackPrint';

describe('buildFeedbackPdfHtml', () => {
  it('renders adapted continuation feedback details into printable html', () => {
    const html = buildFeedbackPdfHtml({
      annotatedImage: null,
      feedback: {
        questionAnalysis: {
          type: 'continuation',
          overview: '续写主线清晰。',
          focusPoints: ['人物动机', '结尾呼应'],
        },
      },
      originalText: 'Amy continued the story with a hopeful ending.',
      promptText: 'Read the story and continue.',
      question: {
        title: 'Continuation prompt',
        promptText: 'Read the story and continue.',
        type: 'continuation',
      },
      safeData: {
        overall: {
          score: 13,
          total: 15,
          grade: 'A-',
          summary: '整体表现不错。',
        },
        questionAnalysis: {
          type: 'continuation',
          overview: '续写主线清晰。',
          focusPoints: ['人物动机', '结尾呼应'],
        },
        storyLine: {
          who: 'Amy',
          when: 'After school',
          where: 'On the playground',
          why: 'She wanted to help a friend',
          what: 'She found the missing notebook',
          result: 'The friendship became stronger',
        },
        emotionLine: {
          tone: '温暖',
          initial: '担心',
          changes: ['紧张', '释然', '开心'],
        },
        improvements: ['可以增加环境描写。'],
        mainProblems: ['情节转折略快'],
        nextActions: ['先补充人物动作，再衔接结尾'],
        errorCatalog: [
          {
            no: 1,
            severity: 'high',
            para: 'P1',
            original: 'She go home',
            corrected: 'She went home',
            explanation: '时态需要保持一致。',
          },
        ],
        rubricComparison: {
          currentTier: '第四档',
          tiers: [
            { tier: '第五档', scoreRange: '13-15', criteria: '内容完整，语言自然。' },
            { tier: '第四档', scoreRange: '10-12', criteria: '基本完成任务，但细节不足。' },
          ],
          gapAnalysis: '补足情节细节可冲击更高档。',
        },
        improvementPlan: {
          targetTier: '第五档',
          coreProblems: ['情节细节不足'],
          shortTermActions: ['先写清动作链', '再补一句情绪反应'],
        },
      },
      studentName: 'Amy',
      teacherComment: '继续保持',
      teacherSurname: '王',
      typeInfo: {
        title: '读后续写反馈报告',
      },
      user: {
        realName: '王老师',
      },
    });

    expect(html).toContain('<title>读后续写反馈报告 - Amy</title>');
    expect(html).toContain('Read the story and continue.');
    expect(html).toContain('续写主线清晰。');
    expect(html).toContain('人物动机');
    expect(html).toContain('The friendship became stronger');
    expect(html).toContain('快速诊断导航');
    expect(html).toContain('情节转折略快');
    expect(html).toContain('语言错误全览');
    expect(html).toContain('She went home');
    expect(html).toContain('评分档位对照');
    expect(html).toContain('补足情节细节可冲击更高档。');
    expect(html).toContain('提分计划');
    expect(html).toContain('先写清动作链');
    expect(html).toContain('王老师评语');
    expect(html).toContain('继续保持');
  });

  it('prints object-shaped content and structure analysis as readable text', () => {
    const html = buildFeedbackPdfHtml({
      annotatedImage: null,
      feedback: {},
      originalText: 'Original essay.',
      promptText: 'Write about a trip.',
      question: {
        title: 'Trip writing',
        promptText: 'Write about a trip.',
      },
      safeData: {
        overall: {
          score: 12,
          total: 15,
          grade: 'B',
          summary: '基本完成任务。',
        },
        contentLogic: [
          { title: '例子不足', detail: '第二段需要补一个具体经历。' },
        ],
        structure: [
          { name: '结尾收束', comment: '最后一句需要回扣主题。' },
        ],
      },
      studentName: 'Student',
      teacherComment: '',
      teacherSurname: '王',
      typeInfo: {
        title: '写作反馈报告',
      },
      user: {},
    });

    expect(html).not.toContain('[object Object]');
    expect(html).toContain('例子不足：第二段需要补一个具体经历。');
    expect(html).toContain('结尾收束：最后一句需要回扣主题。');
  });
});
