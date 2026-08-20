import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { hasPagePreloader } from './pagePreloaders.js';

describe('pagePreloaders', () => {
  it('registers preloaders for core public navigation targets', () => {
    [
      'skill-training',
      'language-foundation',
      'plan',
      'writing',
      'writing-bank',
      'growth',
      'writing-refine-sentence',
      'writing-refine-structure',
      'grammar-analyzer',
      'grammar-courses',
      'grammar-practice',
      'grammar-progress',
      'reading-analyzer',
      'phonetics-camp',
      'phonetics-overview',
      'phonetics-sound',
      'phonetics-syllable',
      'phonetics-sentence',
      'phonetics-discourse',
      'phonetics-progress',
      'vocab-quiz',
      'vocab-resources',
      'vocab-progress',
      'listening-basics',
      'listening-progress',
      'speaking',
      'refund',
      'listening-workbench',
      'vocab-workbench',
      'phonetics-workbench',
      'mine',
      'points',
      'quota',
    ].forEach((page) => {
      expect(hasPagePreloader(page)).toBe(true);
    });
  });

  it('opts into React Router v7 transition flags', () => {
    const mainSource = readFileSync(resolve(process.cwd(), 'src/main.jsx'), 'utf8');

    expect(mainSource).toContain('v7_startTransition: true');
    expect(mainSource).toContain('v7_relativeSplatPath: true');
  });
});
