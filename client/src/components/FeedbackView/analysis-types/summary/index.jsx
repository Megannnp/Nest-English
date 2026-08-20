import KeyPoints from './KeyPoints';
import MissingPointsAlert from './MissingPointsAlert';
import SummaryRules from './SummaryRules';
import useIsMobile from '../../../../hooks/useIsMobile.js';
import VocabularyList from '../../shared/VocabularyList';
import {
  AnalysisPage,
  AnalysisSection as Section,
  AnalysisCard as Card,
  AnalysisLine as Line,
  AnalysisText as Text,
  AnalysisResourceGrid,
  ANALYSIS_THEME,
} from '../shared-ui.jsx';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function buildSummaryModel(feedback) {
  return {
    commentaryAnalysis: feedback?.commentaryAnalysis || {},
    keyPoints: asList(feedback?.keyPoints),
    materialAnalysis: feedback?.materialAnalysis || {},
    missedPoints: asList(feedback?.missedPoints),
    opinionAlerts: asList(feedback?.personalOpinionAlerts),
    structureAnalysis: feedback?.structureAnalysis || {},
    summaryRules: asList(feedback?.summaryRules),
    vocabData: asList(feedback?.vocabulary),
  };
}

function gridColumns(isMobile, columns = 'repeat(2, minmax(0, 1fr))') {
  return isMobile ? '1fr' : columns;
}

function ResourceItem({ scene, index }) {
  return (
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
  );
}

function SummaryVocabularySection({ vocabData }) {
  if (!vocabData.length) return null;

  return (
    <Section title="概要述评常用表达" subtitle="把概括、转述、转折和评论时常用的表达集中归档，方便学生直接借用。">
      <AnalysisResourceGrid
        items={vocabData}
        renderItem={(scene, idx) => <ResourceItem scene={scene} index={idx} />}
      />
    </Section>
  );
}

export default function SummaryAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const model = buildSummaryModel(feedback);
  const { commentaryAnalysis, materialAnalysis, structureAnalysis } = model;

  return (
    <AnalysisPage>
      <Section title="材料解构与任务边界" subtitle="先判断材料是什么、写作要求是什么，再决定概括和评论分别做到什么程度。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="材料属性">
            <Line label="材料类型" value={materialAnalysis.materialType} />
            <Line label="核心话题" value={materialAnalysis.topic} />
            <Line label="价值锚点" value={materialAnalysis.valueAnchor} />
          </Card>
          <Card title="任务边界">
            <Text>
              {materialAnalysis.taskBoundary || '需要区分“原文概括”和“个人评论”的边界，既不能只复述，也不能脱离材料空谈。'}
            </Text>
          </Card>
        </div>
      </Section>

      <Section title="概要述评框架" subtitle="这一题型的核心不是单纯写摘要，而是先概后评、评据结合。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <Card title="段落任务分配">
            <Line label="开头引入" value={structureAnalysis.introTask} />
            <Line label="概括任务" value={structureAnalysis.summaryTask} />
            <Line label="评论任务" value={structureAnalysis.commentaryTask} />
            <Line label="结尾收束" value={structureAnalysis.endingTask} />
          </Card>
          <Card title="评论建构">
            <Line label="核心立场" value={commentaryAnalysis.stance} />
            <Line label="推理路径" value={commentaryAnalysis.reasoningPath} />
            <Line label="论据策略" value={commentaryAnalysis.evidenceStrategy} />
          </Card>
        </div>
      </Section>

      <SummaryRules rules={model.summaryRules} />
      <KeyPoints keyPoints={model.keyPoints} />
      <MissingPointsAlert missedPoints={model.missedPoints} opinionAlerts={model.opinionAlerts} />

      <Section title="语言逻辑与读者意识" subtitle="高分述评既要逻辑清楚，也要保持考场书面语的客观、理性和得体。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile, 'repeat(3, minmax(0, 1fr))'), gap: 12 }}>
          <Card title="语言逻辑">
            <Text>
              {commentaryAnalysis.languageLogic || '建议严格按照“概括贴原文顺序，评论按观点-论据-小结展开”的逻辑组织语言。'}
            </Text>
          </Card>
          <Card title="读者意识">
            <Text>
              {commentaryAnalysis.readerAwareness || '默认读者是阅卷者，因此语言应正式、中立、理性，避免口语化和情绪化表达。'}
            </Text>
          </Card>
          <Card title="字数控制">
            <Text>
              {commentaryAnalysis.wordCountAdvice || '要严格控制概括与评论的篇幅比例，避免概括过长或评论过空。'}
            </Text>
          </Card>
        </div>
      </Section>

      <SummaryVocabularySection vocabData={model.vocabData} />
    </AnalysisPage>
  );
}
