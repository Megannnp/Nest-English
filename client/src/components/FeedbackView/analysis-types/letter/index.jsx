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

function buildLetterModel(feedback) {
  return {
    scenarioAnalysis: feedback?.scenarioAnalysis || {},
    formatAnalysis: feedback?.formatAnalysis || {},
    taskAnalysis: feedback?.taskAnalysis || {},
    contentAnalysis: feedback?.contentAnalysis || {},
    vocabData: asList(feedback?.vocabulary),
  };
}

export default function LetterAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const { scenarioAnalysis, formatAnalysis, taskAnalysis, contentAnalysis, vocabData } = buildLetterModel(feedback);

  return (
    <AnalysisPage>
      <Section title="交际情境与关系" subtitle="书信的第一步不是急着写内容，而是先把谁写给谁、为什么写、关系有多近想清楚。">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Card title="交际闭环四要素">
            <Line label="写信人身份" value={scenarioAnalysis.writerRole} />
            <Line label="收信人角色" value={scenarioAnalysis.recipientRole} />
            <Line label="双方关系" value={scenarioAnalysis.relationship} />
            <Line label="核心目的" value={scenarioAnalysis.purpose} />
            <Line label="正式程度" value={scenarioAnalysis.formality} />
          </Card>
          <Card title="交际目标">
            <Text>
              {contentAnalysis.communicationGoal || '需要先明确这封信要让对方理解什么、做什么、感受到什么，再决定语言分寸。'}
            </Text>
          </Card>
        </div>
      </Section>

      <Section title="格式规范与功能边界" subtitle="每个格式要素都要为交际功能服务，不是机械套模板。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile, '1fr 1fr'), gap: 12 }}>
          <Card title="格式闭环">
            <Line label="称呼" value={formatAnalysis.greeting} />
            <Line label="开篇任务" value={formatAnalysis.openingTask} />
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, color: ANALYSIS_THEME.subtext, marginBottom: 6 }}>主体必须完成的功能</div>
              <TextList items={formatAnalysis.bodyTasks} emptyText="暂无主体功能提示。" />
            </div>
          </Card>
          <Card title="结尾收束">
            <Line label="交际预期" value={formatAnalysis.closingExpectation} />
            <Line label="结尾套语" value={formatAnalysis.signOff} />
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.75, color: ANALYSIS_THEME.text }}>
              英文书信通常要求核心目的前置，结尾则负责把期待、礼貌和语气完整收束。
            </div>
          </Card>
        </div>
      </Section>

      <Section title="任务要点与隐性交际要求" subtitle="高分书信不只覆盖显性信息，还要照顾角色关系、说服逻辑和语用得体性。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="硬性任务要点">
            <TextList items={taskAnalysis.hardRequirements} emptyText="暂无硬性任务要点。" />
          </Card>
          <Card title="隐性交际要求">
            <TextList items={taskAnalysis.hiddenRequirements} emptyText="暂无隐性交际要求。" />
          </Card>
          <Card title="语气与策略">
            <Text>
              {taskAnalysis.toneStrategy || '需要根据正式度选择礼貌层级，保证请求、致歉、邀请或投诉的语气都恰到好处。'}
            </Text>
          </Card>
          <Card title="常见失分点">
            <TextList items={taskAnalysis.commonPitfalls} emptyText="暂无失分提醒。" />
          </Card>
        </div>
      </Section>

      <Section title="内容建构" subtitle="书信内容的核心是达成交际目标，所以信息顺序、细节类型和开头结尾的策略都要围着‘有效沟通’展开。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="信息层级">
            <Line label="信息流" value={contentAnalysis.informationFlow} />
            <Line label="角色适配" value={contentAnalysis.roleAdaptation} />
          </Card>
          <Card title="细节策略">
            <Text>
              {contentAnalysis.detailStrategy || '细节要么服务事务落地，要么服务情感真诚，要么服务诉求说服，不能堆砌无关信息。'}
            </Text>
          </Card>
          <Card title="开篇策略">
            <Text>
              {contentAnalysis.openingStrategy || '开篇应快速建立身份和写信目的，避免铺垫过长。'}
            </Text>
          </Card>
          <Card title="结尾策略">
            <Text>
              {contentAnalysis.closingStrategy || '结尾要明确交际预期，并保持与角色关系匹配的礼貌分寸。'}
            </Text>
          </Card>
        </div>
      </Section>

      {vocabData.length > 0 ? (
        <Section title="书信高频表达库" subtitle="把礼貌请求、情感表达、事务沟通和结尾套语集中整理，方便学生直接迁移。">
          <AnalysisResourceGrid items={vocabData} renderItem={(scene, index) => (
              <div
                key={`${scene.category}-${index}`}
                style={{
                  background: ANALYSIS_THEME.surface,
                  border: `1px solid ${ANALYSIS_THEME.border}`,
                  borderRadius: 0,
                  padding: '10px 12px',
                }}
              >
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
