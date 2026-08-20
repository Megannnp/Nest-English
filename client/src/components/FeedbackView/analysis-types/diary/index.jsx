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

export default function DiaryAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const formatAnalysis = feedback?.formatAnalysis || {};
  const taskAnalysis = feedback?.taskAnalysis || {};
  const emotionLine = feedback?.emotionLine || {};
  const contentAnalysis = feedback?.contentAnalysis || {};
  const vocabData = asList(feedback?.vocabulary);

  const emotionPath = [
    emotionLine.initial && `起始情绪：${emotionLine.initial}`,
    ...(Array.isArray(emotionLine.changes) ? emotionLine.changes : []).map((item) => `情绪变化：${item}`),
    emotionLine.tone && `整体基调：${emotionLine.tone}`,
  ].filter(Boolean);

  return (
    <AnalysisPage>
      <Section title="日记主线与格式要求" subtitle="先把日记的记录属性、时间格式和写作视角定稳，后面的内容才不会偏离文体。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="格式任务">
            <Line label="开篇任务" value={formatAnalysis.openingTask} />
            <Line label="收尾任务" value={formatAnalysis.closingExpectation} />
            <Line label="固定标记" value={formatAnalysis.greeting} />
          </Card>
          <Card title="写作要求">
            <TextList items={taskAnalysis.hardRequirements} emptyText="暂无格式与内容硬性要求。" />
          </Card>
        </div>
      </Section>

      <Section title="情感线梳理" subtitle="日记不是流水账，关键在于把心情的起伏、转折和最后的感悟串起来。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="情绪轨迹">
            <TextList items={emotionPath} emptyText="暂无情绪变化分析。" />
          </Card>
          <Card title="风格与语气">
            <Text>
              {taskAnalysis.toneStrategy || '日记应保持第一人称视角下的真实、自然与连贯，情绪表达要贴合事件本身，避免无端夸张。'}
            </Text>
          </Card>
        </div>
      </Section>

      <Section title="主题与内容组织" subtitle="高分日记通常是“事件推进 + 细节描写 + 心理变化 + 感悟收束”的完整闭环。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="内容主线">
            <Line label="核心目标" value={contentAnalysis.communicationGoal} />
            <Line label="信息推进" value={contentAnalysis.informationFlow} />
            <Line label="细节策略" value={contentAnalysis.detailStrategy} />
          </Card>
          <Card title="开头与结尾">
            <Line label="开头策略" value={contentAnalysis.openingStrategy} />
            <Line label="结尾策略" value={contentAnalysis.closingStrategy} />
            <Line label="风格适配" value={contentAnalysis.roleAdaptation} />
          </Card>
        </div>
      </Section>

      <Section title="隐性要求与避坑提醒" subtitle="真正影响分数的常常不是“有没有写”，而是是否写得像一篇真实、得体的日记。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="隐性要求">
            <TextList items={taskAnalysis.hiddenRequirements} emptyText="暂无隐性要求分析。" />
          </Card>
          <Card title="高频失分点">
            <TextList items={taskAnalysis.commonPitfalls} emptyText="暂无失分风险提醒。" />
          </Card>
        </div>
      </Section>

      {vocabData.length > 0 ? (
        <Section title="日记常用表达" subtitle="聚焦情绪变化、日常记录和感悟收尾时更自然的表达方式。">
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
