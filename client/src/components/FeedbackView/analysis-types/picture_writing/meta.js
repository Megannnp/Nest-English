export default {
  type: 'picture_writing',
  label: '看图写话',
  icon: '🖼️',
  color: '#10b981',
  requiredFields: [
    'storyLine.who',
    'storyLine.where',
    'storyLine.what',
    'taskAnalysis.contentChecklist',
    'contentAnalysis.communicationGoal',
  ],
};
