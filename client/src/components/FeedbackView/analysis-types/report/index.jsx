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

export default function ReportAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const scenarioAnalysis = feedback?.scenarioAnalysis || {};
  const formatAnalysis = feedback?.formatAnalysis || {};
  const taskAnalysis = feedback?.taskAnalysis || {};
  const contentAnalysis = feedback?.contentAnalysis || {};
  const vocabData = asList(feedback?.vocabulary);

  return (
    <AnalysisPage>
      <Section title="报告情境与交际目标" subtitle="报告首先要说明写给谁、为什么写，以及希望读者据此理解什么或采取什么行动。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="交际场景">
            <Line label="报告者身份" value={scenarioAnalysis.writerRole} />
            <Line label="接收对象" value={scenarioAnalysis.recipientRole} />
            <Line label="关系定位" value={scenarioAnalysis.relationship} />
            <Line label="核心目的" value={scenarioAnalysis.purpose} />
            <Line label="正式程度" value={scenarioAnalysis.formality} />
          </Card>
          <Card title="报告目标">
            <Text>
              {contentAnalysis.communicationGoal || '报告应围绕“事实呈现、问题分析、结论提炼、建议落地”展开，帮助读者快速抓住重点。'}
            </Text>
          </Card>
        </div>
      </Section>

      <Section title="格式结构与信息分层" subtitle="高分报告强调标题清晰、背景交代充分、主体有层级、结尾有结论与建议。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="结构起点">
            <Line label="开头任务" value={formatAnalysis.openingTask} />
            <Line label="结尾任务" value={formatAnalysis.closingExpectation} />
            <Line label="署名/标识" value={formatAnalysis.signOff} />
          </Card>
          <Card title="主体分层">
            <TextList items={formatAnalysis.bodyTasks} emptyText="暂无报告主体分层建议。" />
          </Card>
        </div>
      </Section>

      <Section title="硬性任务要点与隐性要求" subtitle="报告不是单纯列现象，而是要在事实基础上做出有说服力的分析与建议。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="硬性要点">
            <TextList items={taskAnalysis.hardRequirements} emptyText="暂无硬性任务分析。" />
          </Card>
          <Card title="隐性要求">
            <TextList items={taskAnalysis.hiddenRequirements} emptyText="暂无隐性要求分析。" />
          </Card>
          <Card title="语气策略">
            <Text>
              {taskAnalysis.toneStrategy || '报告语言应中立、客观、基于事实，结论与建议要可执行，避免情绪化判断。'}
            </Text>
          </Card>
          <Card title="常见失分点">
            <TextList items={taskAnalysis.commonPitfalls} emptyText="暂无失分风险提醒。" />
          </Card>
        </div>
      </Section>

      <Section title="内容逻辑与建议闭环" subtitle="好报告要做到信息推进顺、事实支撑足、建议落得下。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="逻辑主线">
            <Line label="信息流" value={contentAnalysis.informationFlow} />
            <Line label="细节策略" value={contentAnalysis.detailStrategy} />
            <Line label="对象适配" value={contentAnalysis.roleAdaptation} />
          </Card>
          <Card title="开头与结尾">
            <Line label="开头策略" value={contentAnalysis.openingStrategy} />
            <Line label="结尾策略" value={contentAnalysis.closingStrategy} />
          </Card>
        </div>
      </Section>

      {vocabData.length > 0 ? (
        <Section title="报告常用表达" subtitle="适合用在数据汇报、问题分析和建议提出中的正式表达。">
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
