export default {
  type: 'narrative',
  label: '记叙文',
  icon: '📝',
  color: '#3b82f6',
  requiredFields: [
    'storyLine.who',
    'storyLine.when',
    'storyLine.where',
    'storyLine.what',
    'emotionLine.initial',
    'contentAnalysis.communicationGoal',
  ],
};
