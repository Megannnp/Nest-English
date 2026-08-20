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

export default function ChartWritingAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const materialAnalysis = feedback?.materialAnalysis || {};
  const taskAnalysis = feedback?.taskAnalysis || {};
  const structureAnalysis = feedback?.structureAnalysis || {};
  const contentAnalysis = feedback?.contentAnalysis || {};
  const vocabData = asList(feedback?.vocabulary);

  return (
    <AnalysisPage>
      <Section title="图表信息与任务边界" subtitle="图表作文先要读准图表类型、核心趋势和题目允许的评论边界。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="材料属性">
            <Line label="图表类型" value={materialAnalysis.materialType} />
            <Line label="核心话题" value={materialAnalysis.topic} />
            <Line label="价值锚点" value={materialAnalysis.valueAnchor} />
          </Card>
          <Card title="任务边界">
            <Text>
              {materialAnalysis.taskBoundary || '要先完成数据描述，再做趋势概括与必要结论，避免只堆数字或过度脱离图表发挥。'}
            </Text>
          </Card>
        </div>
      </Section>

      <Section title="内容清单与结构框架" subtitle="高分图表作文通常要做到“开头点题、主体描述、对比总结、结尾收束”。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="必写内容">
            <TextList items={taskAnalysis.contentChecklist} emptyText="暂无图表写作清单。" />
          </Card>
          <Card title="结构任务">
            <Line label="开头任务" value={structureAnalysis.introTask} />
            <Line label="主体描述" value={structureAnalysis.summaryTask} />
            <Line label="比较/评论" value={structureAnalysis.commentaryTask} />
            <Line label="结尾收束" value={structureAnalysis.endingTask} />
          </Card>
        </div>
      </Section>

      <Section title="信息组织与失分风险" subtitle="图表作文的关键是描述准确、趋势明确、结论贴数。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="组织策略">
            <Line label="写作目标" value={contentAnalysis.communicationGoal} />
            <Line label="信息流" value={contentAnalysis.informationFlow} />
            <Line label="细节策略" value={contentAnalysis.detailStrategy} />
          </Card>
          <Card title="失分提醒">
            <TextList items={taskAnalysis.pitfalls} emptyText="暂无失分提醒。" />
          </Card>
        </div>
      </Section>

      {vocabData.length > 0 ? (
        <Section title="图表作文常用表达" subtitle="适合用于数据描述、趋势概括和比较分析的表达。">
          <AnalysisResourceGrid items={vocabData} renderItem={(scene, index) => (
              <div key={`${scene.category}-${index}`} style={{ background: ANALYSIS_THEME.surface, border: `1px solid ${ANALYSIS_THEME.border}`, borderRadius: 0, padding: '10px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: ANALYSIS_THEME.accent, marginBottom: 6 }}>
                  {scene.icon} {scene.category}
                </div>
                <VocabularyList words={scene.words} compact />
              </div>
            )} />
        </Section>
      ) : null}
    </AnalysisPage>
  );
}
