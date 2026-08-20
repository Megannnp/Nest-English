import { describe, expect, it } from 'vitest';

import { getSiteTheme } from './siteTheme.js';

describe('getSiteTheme', () => {
  it('maps public product routes to their shared themes', () => {
    expect(getSiteTheme('portal')).toBe('portal');
    expect(getSiteTheme('grammar-practice')).toBe('grammar');
    expect(getSiteTheme('reading-courses')).toBe('reading');
    expect(getSiteTheme('writing-refine-sentence')).toBe('writing');
    expect(getSiteTheme('phonetics-combos')).toBe('phonetics');
    expect(getSiteTheme('vocab-flashcard')).toBe('vocab');
    expect(getSiteTheme('listening-practice')).toBe('listening');
    expect(getSiteTheme('speaking')).toBe('speaking');
  });

  it('keeps authenticated writing and teacher routes on the writing theme', () => {
    expect(getSiteTheme('records')).toBe('writing');
    expect(getSiteTheme('workbench')).toBe('writing');
    expect(getSiteTheme('teacher-writing-detail')).toBe('writing');
    expect(getSiteTheme('batch-grading')).toBe('writing');
  });
});
