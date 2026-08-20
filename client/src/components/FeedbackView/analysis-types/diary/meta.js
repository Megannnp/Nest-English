export default {
  type: 'diary',
  label: '日记',
  icon: '📔',
  color: '#f97316',
  requiredFields: [
    'formatAnalysis.openingTask',
    'taskAnalysis.hardRequirements',
    'emotionLine.initial',
    'emotionLine.changes',
    'contentAnalysis.communicationGoal',
  ],
};
