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

export default function NoticeAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const scenarioAnalysis = feedback?.scenarioAnalysis || {};
  const formatAnalysis = feedback?.formatAnalysis || {};
  const taskAnalysis = feedback?.taskAnalysis || {};
  const contentAnalysis = feedback?.contentAnalysis || {};
  const vocabData = asList(feedback?.vocabulary);

  return (
    <AnalysisPage>
      <Section title="交际闭环四要素" subtitle="通知首先要说清楚谁发布、通知谁、为什么通知，以及整体正式度。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="发布情境">
            <Line label="发布者身份" value={scenarioAnalysis.writerRole} />
            <Line label="受众对象" value={scenarioAnalysis.recipientRole} />
            <Line label="关系定位" value={scenarioAnalysis.relationship} />
            <Line label="核心目的" value={scenarioAnalysis.purpose} />
            <Line label="正式程度" value={scenarioAnalysis.formality} />
          </Card>
          <Card title="通知目标">
            <Text>
              {contentAnalysis.communicationGoal || '通知的核心是让读者快速理解事项、按要求行动，并且不产生歧义。'}
            </Text>
          </Card>
        </div>
      </Section>

      <Section title="格式规范与功能边界" subtitle="通知强调标题、正文、落款等功能分工，不需要私人寒暄与情感铺垫。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="格式结构">
            <Line label="标题/开头任务" value={formatAnalysis.openingTask} />
            <Line label="补充说明" value={formatAnalysis.closingExpectation} />
            <Line label="落款/署名" value={formatAnalysis.signOff} />
          </Card>
          <Card title="正文分层">
            <TextList items={formatAnalysis.bodyTasks} emptyText="暂无通知正文分层建议。" />
          </Card>
        </div>
      </Section>

      <Section title="任务要点与语体策略" subtitle="高分通知既不能漏信息，也不能语气松散、重点后置。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="硬性要点">
            <TextList items={taskAnalysis.hardRequirements} emptyText="暂无必写信息提醒。" />
          </Card>
          <Card title="隐性要求">
            <TextList items={taskAnalysis.hiddenRequirements} emptyText="暂无隐性要求分析。" />
          </Card>
          <Card title="语体与策略">
            <Text>
              {taskAnalysis.toneStrategy || '通知应用客观、清晰、直接的表达，把关键事项和行动要求放在读者最容易捕捉的位置。'}
            </Text>
          </Card>
          <Card title="高频失分点">
            <TextList items={taskAnalysis.commonPitfalls} emptyText="暂无失分风险提醒。" />
          </Card>
        </div>
      </Section>

      <Section title="内容组织与逻辑闭环" subtitle="通知不是堆信息，而是让读者快速知道“发生什么、何时何地、要怎么做”。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="信息流">
            <Line label="信息组织" value={contentAnalysis.informationFlow} />
            <Line label="细节策略" value={contentAnalysis.detailStrategy} />
          </Card>
          <Card title="开头与结尾">
            <Line label="开头策略" value={contentAnalysis.openingStrategy} />
            <Line label="结尾策略" value={contentAnalysis.closingStrategy} />
            <Line label="对象适配" value={contentAnalysis.roleAdaptation} />
          </Card>
        </div>
      </Section>

      {vocabData.length > 0 ? (
        <Section title="通知常用表达" subtitle="可直接迁移到活动通知、规则提醒与补充说明中的实用表达。">
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
