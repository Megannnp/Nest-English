import useIsMobile from '../../../../hooks/useIsMobile.js';
import VocabularyList from '../../shared/VocabularyList';
import {
  AnalysisPage,
  AnalysisSection as Section,
  AnalysisCard as Card,
  AnalysisLine as Line,
  AnalysisText as Text,
  AnalysisTextList as TextList,
  AnalysisResourceGrid,
  ANALYSIS_THEME,
} from '../shared-ui.jsx';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function gridColumns(isMobile, columns = 'repeat(2, minmax(0, 1fr))') {
  return isMobile ? '1fr' : columns;
}

function buildProposalModel(feedback) {
  return {
    scenarioAnalysis: feedback?.scenarioAnalysis || {},
    taskAnalysis: feedback?.taskAnalysis || {},
    contentAnalysis: feedback?.contentAnalysis || {},
    structure: feedback?.structureAnalysis || {},
    toneAnalysis: feedback?.toneAnalysis || {},
    rhetoricalDevices: asList(feedback?.rhetoricalDevices),
    vocabData: asList(feedback?.vocabulary),
  };
}

export default function ProposalAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const { scenarioAnalysis, taskAnalysis, contentAnalysis, structure, toneAnalysis, rhetoricalDevices, vocabData } = buildProposalModel(feedback);

  return (
    <AnalysisPage>
      <Section title="倡议情境与目的" subtitle="倡议书的核心不是表达态度本身，而是推动对方愿意行动。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="交际场景">
            <Line label="发起者身份" value={scenarioAnalysis.writerRole} />
            <Line label="目标对象" value={scenarioAnalysis.recipientRole} />
            <Line label="核心目的" value={scenarioAnalysis.purpose} />
            <Line label="正式程度" value={scenarioAnalysis.formality} />
          </Card>
          <Card title="倡议目标">
            <Text>
              {contentAnalysis.communicationGoal || '倡议书需要把问题、行动和价值方向说清，让号召有对象、有路径、有落点。'}
            </Text>
          </Card>
        </div>
      </Section>

      <Section title="内容框架" subtitle="倡议书通常要完成背景说明、主体倡议和行动号召三层任务。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="主体结构">
            <Line label="开头问候" value={structure.greeting} />
            <TextList items={structure.bodyPoints} ordered emptyText="暂无主体倡议结构。" />
            <Line label="号召收束" value={structure.callToAction} />
          </Card>
          <Card title="内容清单">
            <TextList items={taskAnalysis.contentChecklist} emptyText="暂无倡议任务清单。" />
          </Card>
        </div>
      </Section>

      <Section title="语气与说服力" subtitle="倡议书既要有感染力，也要避免空喊口号。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="语气分析">
            <Line label="得体性" value={toneAnalysis.appropriateness} />
            <Line label="说明" value={toneAnalysis.description} />
            <TextList items={toneAnalysis.suggestions} emptyText="暂无额外语气建议。" />
          </Card>
          <Card title="失分风险">
            <TextList items={taskAnalysis.pitfalls} emptyText="暂无失分提醒。" />
          </Card>
        </div>
      </Section>

      {(vocabData.length > 0 || rhetoricalDevices.length > 0) ? (
        <Section title="倡议表达资源" subtitle="聚焦问题提出、行动呼吁和结尾升华时可直接迁移的表达。">
          <AnalysisResourceGrid items={vocabData} renderItem={(scene, index) => (
              <div key={`${scene.category}-${index}`} style={{ background: ANALYSIS_THEME.surface, border: `1px solid ${ANALYSIS_THEME.border}`, borderRadius: 0, padding: '10px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: ANALYSIS_THEME.accent, marginBottom: 6 }}>
                  {scene.icon} {scene.category}
                </div>
                <VocabularyList words={scene.words} compact />
              </div>
            )} />
            {rhetoricalDevices.length > 0 ? (
              <Card title="修辞策略">
                <TextList items={rhetoricalDevices} emptyText="暂无修辞建议。" />
              </Card>
            ) : null}
        </Section>
      ) : null}
    </AnalysisPage>
  );
}
