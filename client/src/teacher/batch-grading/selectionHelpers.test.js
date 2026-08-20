import { describe, expect, it } from 'vitest';

import { resolveSelectedAssignmentState } from './selectionHelpers.js';

describe('resolveSelectedAssignmentState', () => {
  it('resets selection state when assignment id is empty or stale', () => {
    expect(resolveSelectedAssignmentState({
      assignments: [{ id: 'assignment-1', promptText: '题目' }],
      questions: [],
      selectedAssignmentId: '',
    })).toEqual({
      selectedAssignmentId: '',
      selectedQId: '',
      promptText: '',
      selectedAssignment: undefined,
    });

    expect(resolveSelectedAssignmentState({
      assignments: [{ id: 'assignment-1', promptText: '题目' }],
      questions: [],
      selectedAssignmentId: 'missing',
    })).toEqual({
      selectedAssignmentId: '',
      selectedQId: '',
      promptText: '',
      selectedAssignment: undefined,
    });
  });

  it('prefers question prompt text when assignment is linked to a question', () => {
    const result = resolveSelectedAssignmentState({
      assignments: [{ id: 'assignment-1', questionId: 'question-1', promptText: '旧题干' }],
      questions: [{ id: 'question-1', promptText: '题库题干' }],
      selectedAssignmentId: 'assignment-1',
    });

    expect(result.selectedAssignmentId).toBe('assignment-1');
    expect(result.selectedQId).toBe('question-1');
    expect(result.promptText).toBe('题库题干');
  });

  it('falls back to assignment prompt text for manual assignments', () => {
    const result = resolveSelectedAssignmentState({
      assignments: [{ id: 'assignment-2', promptText: '手动题干' }],
      questions: [],
      selectedAssignmentId: 'assignment-2',
    });

    expect(result.selectedAssignmentId).toBe('assignment-2');
    expect(result.selectedQId).toBe('');
    expect(result.promptText).toBe('手动题干');
  });
});
