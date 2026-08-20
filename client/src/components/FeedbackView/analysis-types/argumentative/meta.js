export default {
  type: 'argumentative',
  label: '议论文',
  icon: '📝',
  color: '#dc2626',
  defaultExpandedSections: {
    thesis: true,
    evidence: true,
    logic: true,
  },
  requiredFields: [
    'thesisAnalysis.position',
    'thesisAnalysis.clarity',
    'thesisAnalysis.suggestions',
    'evidenceEvaluation.sufficiency',
    'evidenceEvaluation.relevance',
    'evidenceEvaluation.missingEvidence',
    'logicStructure.coherence',
    'logicStructure.transitionQuality',
    'logicStructure.flowIssues',
  ],
};