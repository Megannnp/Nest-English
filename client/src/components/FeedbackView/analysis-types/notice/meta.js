export default {
  type: 'notice',
  label: '通知',
  icon: '📢',
  color: '#f59e0b',
  requiredFields: [
    'scenarioAnalysis.writerRole',
    'scenarioAnalysis.recipientRole',
    'scenarioAnalysis.purpose',
    'formatAnalysis.openingTask',
    'taskAnalysis.hardRequirements',
    'contentAnalysis.communicationGoal',
  ],
};
