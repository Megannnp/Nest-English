export default {
  type: 'review',
  label: '观后感/读后感',
  icon: '💭',
  color: '#7c3aed',
  requiredFields: [
    'materialAnalysis.materialType',
    'materialAnalysis.topic',
    'commentaryAnalysis.stance',
    'commentaryAnalysis.reasoningPath',
    'contentAnalysis.communicationGoal',
  ],
};
