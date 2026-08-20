import { callVolcengineAI } from '../../aiProviderService.js';

let quickFeedbackAIClient = callVolcengineAI;

export function getQuickFeedbackAIClient() {
  return quickFeedbackAIClient;
}

export function setQuickFeedbackAIClientForTests(client) {
  if (process.env.NODE_ENV !== 'test') return () => {};
  const previous = quickFeedbackAIClient;
  quickFeedbackAIClient = typeof client === 'function' ? client : callVolcengineAI;
  return () => {
    quickFeedbackAIClient = previous;
  };
}
