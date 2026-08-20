export default {
  type: 'report',
  label: '报告',
  icon: '📑',
  color: '#64748b',
  requiredFields: [
    'scenarioAnalysis.writerRole',
    'scenarioAnalysis.recipientRole',
    'scenarioAnalysis.purpose',
    'formatAnalysis.openingTask',
    'taskAnalysis.hardRequirements',
    'contentAnalysis.communicationGoal',
  ],
};
