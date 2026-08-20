export default {
  type: 'proposal',
  label: '倡议书',
  icon: '📣',
  color: '#dc2626',
  requiredFields: [
    'scenarioAnalysis.purpose',
    'taskAnalysis.contentChecklist',
    'structure.bodyPoints',
    'structure.callToAction',
    'toneAnalysis.appropriateness',
  ],
};
