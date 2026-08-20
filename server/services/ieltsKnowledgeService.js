import { buildRoutedKnowledgeContext } from './knowledgeRouterService.js';
import { resetKnowledgeCacheForTest } from './knowledgeService.js';

function isIeltsType(type) {
  return ['ielts_task1', 'ielts_task2'].includes(String(type || '').trim().toLowerCase());
}

export function buildIeltsKnowledgeContext({
  user = null,
  writingType,
  writingTitle = '',
  promptText = '',
  fullText = '',
  learningGoal = '',
} = {}) {
  if (!isIeltsType(writingType)) return '';

  return buildRoutedKnowledgeContext({
    user,
    module: 'writing',
    exam: 'ielts',
    taskType: writingType,
    title: writingTitle,
    promptText,
    content: fullText,
    heading: 'IELTS 资料库参考',
    learningGoal,
  });
}

export function resetIeltsKnowledgeCacheForTest() {
  resetKnowledgeCacheForTest();
}
