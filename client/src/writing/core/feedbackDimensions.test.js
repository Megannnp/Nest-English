import { describe, expect, it } from 'vitest';

import { normalizeCategoriesToDimensions } from './feedbackDimensions.js';

describe('normalizeCategoriesToDimensions', () => {
  it('falls back to all four dimensions with placeholder content when given nothing', () => {
    const { categories, dimensions } = normalizeCategoriesToDimensions();

    expect(categories.map((c) => c.name)).toEqual(['内容', '语言', '结构', '书写']);
    expect(Object.keys(dimensions)).toEqual(['内容', '语言', '结构', '书写']);
    categories.forEach((category) => {
      expect(category.comment).toBeTruthy();
      expect(category.suggestions.length).toBeGreaterThan(0);
      expect(category.score).toBe('');
      expect(category.grade).toBe('');
    });
  });

  it('maps recognizable Chinese and English category names to their dimension key', () => {
    const { categories } = normalizeCategoriesToDimensions([
      { name: '内容', score: 12, grade: 'A', comment: '内容切题', suggestions: ['补充细节'] },
      { name: 'grammar', score: 10, grade: 'B', comment: '语言基本准确' },
      { name: '篇章结构', score: 8, comment: '结构完整' },
      { name: 'presentation', comment: '卷面整洁' },
    ]);

    expect(categories).toHaveLength(4);

    const content = categories.find((c) => c.name === '内容');
    expect(content).toMatchObject({ score: 12, grade: '优', comment: '内容切题', suggestions: ['补充细节'] });

    const language = categories.find((c) => c.name === '语言');
    expect(language).toMatchObject({ score: 10, grade: '良', comment: '语言基本准确' });

    const structure = categories.find((c) => c.name === '结构');
    expect(structure).toMatchObject({ score: 8, comment: '结构完整' });

    const writing = categories.find((c) => c.name === '书写');
    expect(writing).toMatchObject({ comment: '卷面整洁' });
  });

  it('only outputs the dimensions that were explicitly provided', () => {
    const { categories } = normalizeCategoriesToDimensions([
      { name: '内容', comment: '内容不错' },
    ]);

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('内容');
  });

  it('ignores categories whose name does not match any known dimension', () => {
    const { categories } = normalizeCategoriesToDimensions([
      { name: '未知维度', comment: '不应出现' },
      { name: '内容', comment: '内容说明' },
    ]);

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('内容');
  });

  it('derives a grade from the overall grade when neither dimension grade nor score grade is present', () => {
    const { categories } = normalizeCategoriesToDimensions([
      { name: '内容', comment: '内容说明' },
    ], { overallGrade: 'B+' });

    expect(categories[0].grade).toBe('良');
  });

  it('merges existingDimensions with new categories, letting the new category win but keeping unset fields', () => {
    const { categories } = normalizeCategoriesToDimensions(
      [{ name: '内容', score: 15 }],
      {
        existingDimensions: {
          内容: { name: '内容', comment: '已有点评', suggestions: ['已有建议'], grade: '良' },
        },
      },
    );

    const content = categories[0];
    expect(content.score).toBe(15);
    expect(content.comment).toBe('已有点评');
    expect(content.grade).toBe('良');
    expect(content.suggestions).toEqual(['已有建议']);
  });

  it('merges and de-duplicates suggestions across existing and new entries', () => {
    const { categories } = normalizeCategoriesToDimensions(
      [{ name: '内容', suggestions: ['已有建议', '新建议'] }],
      {
        existingDimensions: {
          内容: { name: '内容', suggestions: ['已有建议'] },
        },
      },
    );

    expect(categories[0].suggestions).toEqual(['已有建议', '新建议']);
  });

  it('normalizes numeric/letter grade variants consistently', () => {
    const { categories } = normalizeCategoriesToDimensions([
      { name: '内容', grade: 'A+' },
      { name: '语言', grade: 'C' },
      { name: '结构', grade: 'F' },
      { name: '书写', grade: '中' },
    ]);

    expect(categories.find((c) => c.name === '内容').grade).toBe('优');
    expect(categories.find((c) => c.name === '语言').grade).toBe('中');
    expect(categories.find((c) => c.name === '结构').grade).toBe('差');
    expect(categories.find((c) => c.name === '书写').grade).toBe('中');
  });

  it('maps IELTS Task 2 categories to official IELTS dimensions', () => {
    const { categories, dimensions } = normalizeCategoriesToDimensions([
      { name: 'Task Response', score: 6.5, comment: '立场清楚，但例证展开不足' },
      { name: 'Coherence and Cohesion', score: 6, comment: '段落清楚，衔接略机械' },
      { name: 'Lexical Resource', score: 6.5, comment: '主题词汇可理解' },
      { name: 'Grammatical Range and Accuracy', score: 6, comment: '复杂句有错误' },
    ], { writingType: 'ielts_task2' });

    expect(categories.map((c) => c.name)).toEqual([
      'Task Response',
      'Coherence and Cohesion',
      'Lexical Resource',
      'Grammatical Range and Accuracy',
    ]);
    expect(dimensions['Task Response'].score).toBe(6.5);
  });

  it('uses Task Achievement for IELTS Task 1 fallback dimensions', () => {
    const { categories } = normalizeCategoriesToDimensions([], { writingType: 'ielts_task1' });

    expect(categories.map((c) => c.name)).toEqual([
      'Task Achievement',
      'Coherence and Cohesion',
      'Lexical Resource',
      'Grammatical Range and Accuracy',
    ]);
    expect(categories[0].suggestions[0]).toContain('overview');
  });
});
