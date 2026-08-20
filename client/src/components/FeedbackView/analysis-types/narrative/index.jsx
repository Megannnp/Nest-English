import useIsMobile from '../../../../hooks/useIsMobile.js';
import VocabularyList from '../../shared/VocabularyList';
import {
  AnalysisPage,
  AnalysisSection as Section,
  AnalysisCard,
  AnalysisLine,
  AnalysisText,
  AnalysisTextList,
  AnalysisResourceGrid,
  ANALYSIS_THEME,
} from '../shared-ui.jsx';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function gridColumns(isMobile, columns = 'repeat(2, minmax(0, 1fr))') {
  return isMobile ? '1fr' : columns;
}

export default function NarrativeAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const storyLine = feedback?.storyLine || {};
  const emotionLine = feedback?.emotionLine || {};
  const taskAnalysis = feedback?.taskAnalysis || {};
  const contentAnalysis = feedback?.contentAnalysis || {};
  const vocabData = asList(feedback?.vocabulary);

  return (
    <AnalysisPage>
      <Section title="叙事主线" subtitle="先抓稳人物、时间、地点和事件推进，记叙文才不会写散。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <AnalysisCard title="故事六要素">
            <AnalysisLine label="人物" value={storyLine.who} />
            <AnalysisLine label="时间" value={storyLine.when} />
            <AnalysisLine label="地点" value={storyLine.where} />
            <AnalysisLine label="起因" value={storyLine.why} />
            <AnalysisLine label="经过" value={storyLine.what} />
            <AnalysisLine label="结果" value={storyLine.result} />
          </AnalysisCard>
          <AnalysisCard title="叙事目标">
            <AnalysisText>{contentAnalysis.communicationGoal || '记叙文的核心是把事件讲清、情绪写顺、结尾收稳。'}</AnalysisText>
          </AnalysisCard>
        </div>
      </Section>

      <Section title="情感推进" subtitle="情节是否打动人，往往取决于情绪线有没有跟着事件自然发展。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <AnalysisCard title="情绪轨迹">
            <AnalysisLine label="起始情绪" value={emotionLine.initial} />
            <AnalysisTextList items={emotionLine.changes} ordered emptyText="暂无情绪变化分析。" />
            <div style={{ marginTop: 8 }}>
              <AnalysisLine label="整体基调" value={emotionLine.tone} />
            </div>
          </AnalysisCard>
          <AnalysisCard title="写作重点">
            <AnalysisTextList items={taskAnalysis.contentChecklist} emptyText="暂无叙事重点提示。" />
          </AnalysisCard>
        </div>
      </Section>

      <Section title="内容组织与表达策略" subtitle="高分记叙文通常具备清晰推进、细节支撑和自然收尾。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <AnalysisCard title="内容组织">
            <AnalysisLine label="信息流" value={contentAnalysis.informationFlow} />
            <AnalysisLine label="细节策略" value={contentAnalysis.detailStrategy} />
            <AnalysisLine label="开头策略" value={contentAnalysis.openingStrategy} />
            <AnalysisLine label="结尾策略" value={contentAnalysis.closingStrategy} />
          </AnalysisCard>
          <AnalysisCard title="失分风险">
            <AnalysisTextList items={taskAnalysis.pitfalls} emptyText="暂无失分提醒。" />
          </AnalysisCard>
        </div>
      </Section>

      {vocabData.length > 0 ? (
        <Section title="记叙文常用表达" subtitle="可直接用于动作描写、心理变化和情节衔接。">
          <AnalysisResourceGrid
            items={vocabData}
            renderItem={(scene, index) => (
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
            )}
          />
        </Section>
      ) : null}
    </AnalysisPage>
  );
}
