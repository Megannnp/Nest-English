function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== '';
}

export function validateQuestionAnalysis(type, data) {
  const requiredByType = {
    continuation: [
      'storyLine.who',
      'storyLine.when',
      'storyLine.where',
      'storyLine.why',
      'storyLine.what',
      'storyLine.result',
      'emotionLine.initial',
      'emotionLine.changes',
      'emotionLine.tone',
      'plotAnalysis.originalText',
      'plotAnalysis.translation',
      'starters.para1.text',
      'starters.para2.text',
      'starters.relationship',
      'contentAnalysis.plotLogic.accuracy',
      'contentAnalysis.characterConsistency.motivation',
      'contentAnalysis.themeAlignment.comment',
    ],
    argumentative: [
      'thesisAnalysis.position',
      'evidenceEvaluation.sufficiency',
      'logicStructure.coherence',
    ],
    summary: ['keyPoints', 'summaryRules'],
    speech: [
      'scenarioAnalysis.occasion',
      'taskAnalysis.structureFocus',
      'contentAnalysis.coreMessage',
      'structure.greeting',
      'structure.bodyPoints',
      'structure.callToAction',
      'toneAnalysis.appropriateness',
    ],
    letter: [
      'scenarioAnalysis.writerRole',
      'scenarioAnalysis.recipientRole',
      'scenarioAnalysis.purpose',
      'formatAnalysis.greeting',
      'formatAnalysis.bodyTasks',
      'contentAnalysis.communicationGoal',
    ],
    notice: [
      'scenarioAnalysis.writerRole',
      'scenarioAnalysis.recipientRole',
      'scenarioAnalysis.purpose',
      'taskAnalysis.hardRequirements',
      'contentAnalysis.communicationGoal',
    ],
    diary: [
      'formatAnalysis.openingTask',
      'taskAnalysis.hardRequirements',
      'emotionLine.initial',
      'emotionLine.changes',
      'contentAnalysis.communicationGoal',
    ],
    report: [
      'scenarioAnalysis.writerRole',
      'scenarioAnalysis.recipientRole',
      'scenarioAnalysis.purpose',
      'formatAnalysis.openingTask',
      'taskAnalysis.hardRequirements',
      'contentAnalysis.communicationGoal',
    ],
    narrative: [
      'storyLine.who',
      'storyLine.when',
      'storyLine.where',
      'storyLine.what',
      'emotionLine.initial',
      'contentAnalysis.communicationGoal',
    ],
    picture_writing: [
      'storyLine.who',
      'storyLine.where',
      'storyLine.what',
      'taskAnalysis.contentChecklist',
      'contentAnalysis.communicationGoal',
    ],
    proposal: [
      'scenarioAnalysis.purpose',
      'taskAnalysis.contentChecklist',
      'structure.bodyPoints',
      'structure.callToAction',
      'toneAnalysis.appropriateness',
    ],
    review: [
      'materialAnalysis.materialType',
      'materialAnalysis.topic',
      'commentaryAnalysis.stance',
      'commentaryAnalysis.reasoningPath',
      'contentAnalysis.communicationGoal',
    ],
    chart_writing: [
      'materialAnalysis.materialType',
      'taskAnalysis.contentChecklist',
      'structureAnalysis.summaryTask',
      'contentAnalysis.communicationGoal',
    ],
    expository: ['categories'],
  };

  const requiredFields = requiredByType[type] || [];
  const missing = requiredFields.filter((path) => !hasValue(getValueByPath(data, path)));
  return { valid: missing.length === 0, missing };
}

function _hasAnyList(obj, ...keys) {
  return keys.some((k) => Array.isArray(obj?.[k]) && obj[k].length > 0);
}

function _hasContinuationStarterText(starters) {
  return Boolean(starters?.para1?.text || starters?.para2?.text);
}

function _hasContinuationAnalysis(data) {
  const storyLine = data?.storyLine || {};
  const emotionLine = data?.emotionLine || {};
  return Boolean(
    data?.overview || data?.reason ||
    storyLine.who || storyLine.what || emotionLine.initial ||
    _hasContinuationStarterText(data?.starters)
  );
}

function _hasGeneralAnalysis(data) {
  return Boolean(
    data?.overview || data?.reason ||
    _hasAnyList(data, 'focusPoints', 'suggestions', 'themes')
  );
}

export function hasUsableQuestionAnalysis(type, data) {
  if (!data || typeof data !== 'object') return false;
  if (type === 'continuation') return _hasContinuationAnalysis(data);
  return _hasGeneralAnalysis(data);
}
