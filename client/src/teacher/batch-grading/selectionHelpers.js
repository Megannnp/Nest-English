import { sameId } from './shared.js';

export function resolveSelectedAssignmentState({
  assignments = [],
  questions = [],
  selectedAssignmentId = '',
}) {
  if (!selectedAssignmentId) {
    return {
      selectedAssignmentId: '',
      selectedQId: '',
      promptText: '',
      selectedAssignment: undefined,
    };
  }

  const selectedAssignment = assignments.find((assignment) => sameId(assignment.id, selectedAssignmentId));
  if (!selectedAssignment) {
    return {
      selectedAssignmentId: '',
      selectedQId: '',
      promptText: '',
      selectedAssignment: undefined,
    };
  }

  if (selectedAssignment.questionId) {
    const selectedQuestion = questions.find((question) => sameId(question.id, selectedAssignment.questionId));
    return {
      selectedAssignmentId: String(selectedAssignment.id),
      selectedQId: String(selectedAssignment.questionId),
      promptText: selectedQuestion?.promptText || selectedAssignment.promptText || '',
      selectedAssignment,
    };
  }

  return {
    selectedAssignmentId: String(selectedAssignment.id),
    selectedQId: '',
    promptText: selectedAssignment.promptText || '',
    selectedAssignment,
  };
}
