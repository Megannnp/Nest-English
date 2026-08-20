import { describe, expect, it } from 'vitest';

import { buildPrompt, buildQuickPrompt, buildRubricBlock } from './writingPrompts.js';

describe('writing prompt scoring rubrics', () => {
  it('scales 25-point rubric bands proportionally for a 22-point assignment', () => {
    const rubric = buildRubricBlock(22);

    expect(rubric).toContain('当前任务满分为22分');
    expect(rubric).toContain('已由25分制按比例折算');
    expect(rubric).toContain('第七档（19-22分）');
    expect(rubric).toContain('第五档（12-15分）');
    expect(rubric).not.toContain('第五档（13-15分）');
  });

  it('tells quick grading to use the assignment max score over prompt text max score', () => {
    const prompt = buildQuickPrompt(22, 'continuation');

    expect(prompt).toContain('满分22分');
    expect(prompt).toContain('以当前任务满分22分为准');
    expect(prompt).toContain('"maxScore": 22');
  });

  it('adds type-specific scoring focus to quick feedback prompts', () => {
    const continuationPrompt = buildQuickPrompt(25, 'continuation');
    const letterPrompt = buildQuickPrompt(15, 'letter');

    expect(continuationPrompt).toContain('必须按当前题型“continuation”的专属标准评分');
    expect(continuationPrompt).toContain('【续写重点】');
    expect(continuationPrompt).toContain('情节衔接');
    expect(letterPrompt).toContain('必须按当前题型“letter”的专属标准评分');
    expect(letterPrompt).toContain('【书信重点】');
    expect(letterPrompt).toContain('交际闭环');
  });

  it('guards quick feedback against generic or contradictory grading', () => {
    const prompt = buildQuickPrompt(15, 'letter');

    expect(prompt).toContain('【作业信息】');
    expect(prompt).toContain('不要按作文自拟主题评分');
    expect(prompt).toContain('能从学生原文或题目要求中找到依据');
    expect(prompt).toContain('分项评价必须与 totalScore 档次一致');
    expect(prompt).toContain('不要混入读后续写专属判断');
  });

  it('uses IELTS band descriptors and IELTS criteria for Task 2 prompts', () => {
    const rubric = buildRubricBlock(9);
    const prompt = buildPrompt(9, 'ielts_task2');
    const quickPrompt = buildQuickPrompt(9, 'ielts_task2');

    expect(rubric).toContain('IELTS 写作采用 0-9 band 评分');
    expect(prompt).toContain('IELTS Writing band descriptors');
    expect(prompt).toContain('【IELTS Writing Task 2 重点】');
    expect(prompt).toContain('Task Response');
    expect(prompt).toContain('Coherence and Cohesion');
    expect(prompt).toContain('Lexical Resource');
    expect(prompt).toContain('Grammatical Range and Accuracy');
    expect(quickPrompt).toContain('每项给 0-9 band，可含 0.5');
  });

  it('uses Task Achievement for IELTS Task 1 prompts', () => {
    const prompt = buildQuickPrompt(9, 'ielts_task1');

    expect(prompt).toContain('【IELTS Academic Writing Task 1 重点】');
    expect(prompt).toContain('Task Achievement');
    expect(prompt).not.toContain('Task Response","score"');
  });

  it('injects IELTS knowledge context into grading prompts', () => {
    const knowledgeContext = '【IELTS 资料库参考】\n来源：writing/task-types.md\nTask Response 需要完整回应题目。';

    expect(buildPrompt(9, 'ielts_task2', { knowledgeContext })).toContain(knowledgeContext);
    expect(buildQuickPrompt(9, 'ielts_task2', { knowledgeContext })).toContain(knowledgeContext);
  });
});
