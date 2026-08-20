import { describe, expect, it } from 'vitest';

import {
  buildBatchSummaryExportData,
  buildBatchSummaryReportHtml,
} from './batch-grading-report-export.js';

describe('batch grading report export', () => {
  const items = [
    {
      status: 'done',
      studentName: '刘皓轩',
      feedback: {
        totalScore: 16,
        maxScore: 25,
        tier: '第五档（14 - 17分）',
        summary: '情节承接自然。',
        mainProblems: ['语言错误较多'],
        nextActions: ['补强结尾收束'],
      },
    },
    {
      status: 'done',
      studentName: '许雯鹤',
      feedback: {
        totalScore: 10,
        maxScore: 25,
        tier: '第四档（10 - 13分）',
        summary: '结构基本完整。',
        weaknesses: ['段落衔接生硬'],
        improvements: ['优化两段过渡'],
      },
    },
  ];

  it('builds stable summary stats and rows', () => {
    const data = buildBatchSummaryExportData({
      items,
      title: '高一（3）班续写批改',
      className: '高一（3）班',
    });

    expect(data.count).toBe(2);
    expect(data.average).toBe(13);
    expect(data.max).toBe(16);
    expect(data.min).toBe(10);
    expect(data.rows[0]).toMatchObject({
      rank: 1,
      studentName: '刘皓轩',
      score: 16,
      summary: '情节承接自然。',
      issues: '语言错误较多',
      suggestions: '补强结尾收束',
    });
  });

  it('serializes structured feedback items in export rows', () => {
    const data = buildBatchSummaryExportData({
      items: [{
        status: 'done',
        studentName: '陈同学',
        feedback: {
          totalScore: 18,
          maxScore: 25,
          mainProblems: [{ title: '衔接', detail: '第二段过渡不自然' }],
          improvements: [{ title: '过渡句', technique: '用 meanwhile 衔接动作' }],
        },
      }],
    });

    expect(data.rows[0].issues).toBe('第二段过渡不自然');
    expect(data.rows[0].suggestions).toBe('用 meanwhile 衔接动作');
    expect(data.rows[0].issues).not.toContain('[object Object]');
  });

  it('renders printable report html with class info and details', () => {
    const html = buildBatchSummaryReportHtml({
      items,
      title: '高一（3）班续写批改',
      className: '高一（3）班',
    });

    expect(html).toContain('高一（3）班续写批改');
    expect(html).toContain('高一（3）班');
    expect(html).toContain('刘皓轩');
    expect(html).toContain('许雯鹤');
    expect(html).toContain('补强结尾收束');
    expect(html).toContain('段落衔接生硬');
  });
});
