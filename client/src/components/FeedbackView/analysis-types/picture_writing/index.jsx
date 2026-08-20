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

export default function PictureWritingAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const storyLine = feedback?.storyLine || {};
  const taskAnalysis = feedback?.taskAnalysis || {};
  const contentAnalysis = feedback?.contentAnalysis || {};
  const vocabData = Array.isArray(feedback?.vocabulary) ? feedback.vocabulary : [];

  return (
    <AnalysisPage>
      <Section title="画面信息拆解" subtitle="看图写话先不是急着编故事，而是先把图里真正给出的信息抓准。">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <AnalysisCard title="图中核心元素">
            <AnalysisLine label="人物" value={storyLine.who} />
            <AnalysisLine label="场景" value={storyLine.where} />
            <AnalysisLine label="时间" value={storyLine.when} />
            <AnalysisLine label="动作/事件" value={storyLine.what} />
          </AnalysisCard>
          <AnalysisCard title="写作目标">
            <AnalysisText>{contentAnalysis.communicationGoal || '看图写话的关键是既不遗漏画面要点，也不过度脱离图片乱编情节。'}</AnalysisText>
          </AnalysisCard>
        </div>
      </Section>

      <Section title="内容清单与想象边界" subtitle="高分关键不是想象越多越好，而是补充得合理、贴画面。">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <AnalysisCard title="必须覆盖内容">
            <AnalysisTextList items={taskAnalysis.contentChecklist} emptyText="暂无内容覆盖提示。" />
          </AnalysisCard>
          <AnalysisCard title="失分风险">
            <AnalysisTextList items={taskAnalysis.pitfalls} emptyText="暂无偏题风险提醒。" />
          </AnalysisCard>
        </div>
      </Section>

      <Section title="成篇组织" subtitle="从画面观察到完整短文，需要有起点、推进和收束。">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <AnalysisCard title="组织策略">
            <AnalysisLine label="信息流" value={contentAnalysis.informationFlow} />
            <AnalysisLine label="细节策略" value={contentAnalysis.detailStrategy} />
            <AnalysisLine label="开头策略" value={contentAnalysis.openingStrategy} />
            <AnalysisLine label="结尾策略" value={contentAnalysis.closingStrategy} />
          </AnalysisCard>
          <AnalysisCard title="对象与语体">
            <AnalysisLine label="表达适配" value={contentAnalysis.roleAdaptation} />
          </AnalysisCard>
        </div>
      </Section>

      {vocabData.length > 0 ? (
        <Section title="看图写话常用表达" subtitle="适合人物动作、场景描写和情节衔接的表达素材。">
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
