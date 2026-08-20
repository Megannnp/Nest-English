import { describe, expect, it, vi } from 'vitest';

import { exportAssignmentPdf } from './assignmentPdfExport.js';

describe('assignment pdf export', () => {
  it('prints through an iframe so embedded browsers do not block popup export', () => {
    const originalPrint = window.print;
    const print = vi.fn();
    Object.defineProperty(window, 'print', { value: print, configurable: true });

    const result = exportAssignmentPdf({
      modules: ['overview'],
      payload: {
        assignment: {
          title: '作文练习',
          className: '高二 1 班',
          maxScore: 15,
        },
      },
    });

    expect(result.mode).toBe('iframe');
    expect(document.querySelector('iframe')).toBeTruthy();
    expect(print).toHaveBeenCalled();

    Object.defineProperty(window, 'print', { value: originalPrint, configurable: true });
  });
});
