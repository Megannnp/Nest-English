import { describe, expect, it } from 'vitest';

import {
  buildAssignmentPayload,
  getEffectiveAssignmentTitle,
  validateAssignmentForm,
} from './assignmentActionHelpers.js';

describe('assignmentActionHelpers', () => {
  it('falls back to questionTitle when validating the assignment title', () => {
    const form = {
      classId: 'class-a',
      classIds: ['class-a'],
      title: '',
      questionTitle: '题库标题',
      promptText: '请完成作文。',
      selectedType: 'general',
      selectedTypeMix: [],
      dueAt: '',
      allowLate: false,
      maxScore: 15,
    };

    expect(getEffectiveAssignmentTitle(form)).toBe('题库标题');
    expect(validateAssignmentForm(form)).toBe('');
  });

  it('falls back to the first prompt line when title and questionTitle are both empty', () => {
    const form = {
      classId: 'class-a',
      classIds: ['class-a'],
      title: '',
      questionTitle: '',
      promptText: '材料作文：阅读下面的材料并完成写作。\n请围绕成长展开论述。',
      selectedType: 'general',
      selectedTypeMix: [],
      dueAt: '',
      allowLate: false,
      maxScore: 15,
    };

    expect(getEffectiveAssignmentTitle(form)).toBe('材料作文：阅读下面的材料并完成写作。');
    expect(validateAssignmentForm(form)).toBe('');
  });

  it('uses the effective title when building the assignment payload', () => {
    const form = {
      classId: 'class-a',
      classIds: ['class-a'],
      title: '',
      questionTitle: '题库标题',
      promptText: '请完成作文。',
      selectedType: 'general',
      selectedTypeMix: [],
      dueAt: '',
      allowLate: false,
      maxScore: 15,
      questionId: '',
    };

    expect(buildAssignmentPayload(form).title).toBe('题库标题');
  });

  it('uses the prompt fallback when building the assignment payload', () => {
    const form = {
      classId: 'class-a',
      classIds: ['class-a'],
      title: '',
      questionTitle: '',
      promptText: '请结合本单元课文，写一篇议论文。',
      selectedType: 'general',
      selectedTypeMix: [],
      dueAt: '',
      allowLate: false,
      maxScore: 15,
      questionId: '',
    };

    expect(buildAssignmentPayload(form).title).toBe('请结合本单元课文，写一篇议论文。');
  });

  it('keeps string question ids when building the assignment payload', () => {
    const form = {
      classId: 'class-a',
      classIds: ['class-a'],
      title: '题库作业',
      questionTitle: '题库标题',
      promptText: '请完成作文。',
      selectedType: 'general',
      selectedTypeMix: [],
      dueAt: '',
      allowLate: false,
      maxScore: 15,
      questionId: 'question-reading-abc',
    };

    expect(buildAssignmentPayload(form).questionId).toBe('question-reading-abc');
  });
});
