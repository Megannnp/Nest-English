import useIsMobile from '../../../../hooks/useIsMobile.js';
import VocabularyList from '../../shared/VocabularyList';
import {
  AnalysisPage,
  AnalysisSection as Section,
  AnalysisCard as Card,
  AnalysisLine as Line,
  AnalysisResourceGrid,
  AnalysisTextList as TextList,
  ANALYSIS_THEME,
} from '../shared-ui.jsx';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function gridColumns(isMobile, columns = 'repeat(2, minmax(0, 1fr))') {
  return isMobile ? '1fr' : columns;
}

export default function ReviewAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const materialAnalysis = feedback?.materialAnalysis || {};
  const taskAnalysis = feedback?.taskAnalysis || {};
  const commentaryAnalysis = feedback?.commentaryAnalysis || {};
  const contentAnalysis = feedback?.contentAnalysis || {};
  const vocabData = asList(feedback?.vocabulary);

  return (
    <AnalysisPage>
      <Section title="作品材料与任务边界" subtitle="读后感/观后感的关键是分清作品介绍和个人感悟，不能只复述内容。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="材料属性">
            <Line label="材料类型" value={materialAnalysis.materialType} />
            <Line label="核心话题" value={materialAnalysis.topic} />
            <Line label="价值锚点" value={materialAnalysis.valueAnchor} />
          </Card>
          <Card title="任务边界">
            <div style={{ fontSize: 13, lineHeight: 1.75, color: ANALYSIS_THEME.text }}>
              {materialAnalysis.taskBoundary || '需要做到“简要介绍作品 + 聚焦个人感悟 + 用作品内容支撑观点”，避免介绍过多、感悟过空。'}
            </div>
          </Card>
        </div>
      </Section>

      <Section title="观点与感悟建构" subtitle="真正拉开差距的不是知道作品讲了什么，而是你从中看到了什么、为什么这样看。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="核心立场">
            <Line label="个人观点" value={commentaryAnalysis.stance} />
            <Line label="推理路径" value={commentaryAnalysis.reasoningPath} />
            <Line label="论据策略" value={commentaryAnalysis.evidenceStrategy} />
          </Card>
          <Card title="内容目标">
            <Line label="写作目标" value={contentAnalysis.communicationGoal} />
            <Line label="信息流" value={contentAnalysis.informationFlow} />
          </Card>
        </div>
      </Section>

      <Section title="写作任务与失分提醒" subtitle="高分读后感通常既有作品依据，也有真实、深入的思考。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="任务清单">
            <TextList items={taskAnalysis.contentChecklist} emptyText="暂无写作任务清单。" />
          </Card>
          <Card title="失分风险">
            <TextList items={taskAnalysis.pitfalls} emptyText="暂无失分提醒。" />
          </Card>
        </div>
      </Section>

      <Section title="语言逻辑与收束" subtitle="观点要讲清，结尾要立住，整篇感悟才不会显得空泛。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="逻辑与读者意识">
            <Line label="语言逻辑" value={commentaryAnalysis.languageLogic} />
            <Line label="读者意识" value={commentaryAnalysis.readerAwareness} />
            <Line label="篇幅建议" value={commentaryAnalysis.wordCountAdvice} />
          </Card>
          <Card title="结构策略">
            <Line label="开头策略" value={contentAnalysis.openingStrategy} />
            <Line label="细节策略" value={contentAnalysis.detailStrategy} />
            <Line label="结尾策略" value={contentAnalysis.closingStrategy} />
          </Card>
        </div>
      </Section>

      {vocabData.length > 0 ? (
        <Section title="读后感常用表达" subtitle="适合用在作品介绍、感悟展开和价值升华中的表达。">
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
