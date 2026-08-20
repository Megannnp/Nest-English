import { describe, expect, it, vi } from 'vitest';

import { buildBatchFeedbackPdfHtml, exportBatchFeedbackPdf } from './batch-feedback-pdf-export.js';

describe('batch feedback pdf export', () => {
  it('prints through an iframe so in-app browsers do not block popup export', () => {
    const originalPrint = window.print;
    const print = vi.fn();
    Object.defineProperty(window, 'print', { value: print, configurable: true });

    const result = exportBatchFeedbackPdf({
      title: '批量反馈',
      items: [{
        status: 'done',
        studentName: '张三',
        feedback: {
          writingType: 'continuation',
          summary: '情节基本完整，语言还需提升。',
          categories: [{ name: '内容', grade: '良', comment: '情节承接有基础。' }],
        },
      }],
    });

    expect(result.mode).toBe('iframe');
    expect(document.querySelector('iframe')).toBeTruthy();
    Object.defineProperty(window, 'print', { value: originalPrint, configurable: true });
  });

  it('serializes structured feedback items in compact comments', () => {
    const html = buildBatchFeedbackPdfHtml({
      title: '批量反馈',
      items: [{
        status: 'done',
        studentName: '李四',
        feedback: {
          writingType: 'general',
          summary: '整体能完成任务。',
          highlights: { content: [{ detail: '主题表达清楚' }] },
          weaknesses: [{ detail: '段落衔接还不自然' }],
          improvements: [{ technique: '用 however 增强转折' }],
        },
      }],
    });

    expect(html).toContain('主题表达清楚');
    expect(html).toContain('用 however 增强转折');
    expect(html).not.toContain('[object Object]');
  });
});
