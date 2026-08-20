import { describe, expect, it } from 'vitest';

import { guestAuthContextMessage } from './guestAuthContext.js';

describe('guestAuthContextMessage', () => {
  it('explains the value when login is triggered from essay submission', () => {
    expect(guestAuthContextMessage('writing')).toContain('提交作文');
    expect(guestAuthContextMessage('writing-manual')).toContain('提交作文');
  });

  it('has a distinct message for question-bank writing', () => {
    expect(guestAuthContextMessage('writing-bank')).toContain('题库');
  });

  it('falls back to a module-level message for a specific sub-page', () => {
    // reading-analyzer 未单列，应回退到 reading 前缀说明
    expect(guestAuthContextMessage('reading-analyzer')).toContain('阅读');
    expect(guestAuthContextMessage('listening-practice')).toContain('听读');
    expect(guestAuthContextMessage('vocab-quiz')).toContain('词汇');
  });

  it('returns empty for top-level signup so no banner shows', () => {
    expect(guestAuthContextMessage('portal')).toBe('');
    expect(guestAuthContextMessage('')).toBe('');
    expect(guestAuthContextMessage(undefined)).toBe('');
  });

  it('returns empty for an unknown target rather than a misleading message', () => {
    expect(guestAuthContextMessage('some-unmapped-page')).toBe('');
  });
});
