import useIsMobile from '../../../../hooks/useIsMobile.js';
import VocabularyList from '../../shared/VocabularyList';
import {
  AnalysisPage,
  AnalysisSection as Section,
  AnalysisCard as CompactBlock,
  AnalysisLine as InfoLine,
  AnalysisSubTitle as SubTitle,
  AnalysisText as Text,
  AnalysisTextList as TextList,
  AnalysisResourceGrid,
  ANALYSIS_THEME,
} from '../shared-ui.jsx';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function firstList(...lists) {
  return lists.find((list) => asList(list).length) || [];
}

function buildSpeechModel(feedback) {
  const scenarioAnalysis = feedback?.scenarioAnalysis || {};
  const taskAnalysis = feedback?.taskAnalysis || {};
  const contentAnalysis = feedback?.contentAnalysis || {};
  const structure = feedback?.structureAnalysis || {};
  const rhetoricalDevices = asList(feedback?.rhetoricalDevices);
  const expressionGroups = rhetoricalDevices.length ? [buildExpressionGroup(rhetoricalDevices)] : [];

  return {
    bodyPlan: firstList(contentAnalysis.bodyPlan, structure.bodyPoints),
    contentAnalysis,
    mergedVocabulary: [...asList(feedback?.vocabulary), ...expressionGroups],
    offTopicRisks: firstList(contentAnalysis.offTopicRisks, taskAnalysis.pitfalls, feedback?.risks),
    scenarioAnalysis,
    structure,
    taskAnalysis,
    themeFocus: buildThemeFocus({ contentAnalysis, scenarioAnalysis }),
    topicFitPoints: firstList(contentAnalysis.fitPoints, taskAnalysis.contentChecklist),
    typeHighlights: buildTypeHighlights(feedback),
  };
}

function buildExpressionGroup(rhetoricalDevices) {
  return {
    icon: '✨',
    category: '演讲表达',
    words: rhetoricalDevices.map((item) => ({ word: item, pos: 'phrase', meaning: '适合演讲稿中直接借用或改写的表达。' })),
  };
}

function buildTypeHighlights(feedback) {
  return [
    feedback?.overview || '演讲稿重在围绕明确主题进行表达，并形成面向听众的说明、感染或号召效果。',
    '与普通作文相比，演讲稿更强调听众意识、现场感和结尾号召力。',
    '写作时要先点明主题，再分层展开内容，最后形成总结或呼吁。',
  ].filter(Boolean);
}

function buildThemeFocus({ contentAnalysis, scenarioAnalysis }) {
  return [
    scenarioAnalysis.occasion && `演讲场合：${scenarioAnalysis.occasion}`,
    scenarioAnalysis.speakerRole && `演讲身份：${scenarioAnalysis.speakerRole}`,
    scenarioAnalysis.audience && `听众对象：${scenarioAnalysis.audience}`,
    contentAnalysis.coreMessage && `核心立意：${contentAnalysis.coreMessage}`,
    scenarioAnalysis.valueOrientation && `价值导向：${scenarioAnalysis.valueOrientation}`,
  ].filter(Boolean);
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

function SpeechResourcesSection({ mergedVocabulary }) {
  return (
    <Section title="写作资源库" subtitle="把和当前主题更贴近的表达集中整理，方便学生直接迁移到自己的演讲稿中。">
      {mergedVocabulary.length > 0 ? (
        <AnalysisResourceGrid
          items={mergedVocabulary}
          renderItem={(scene, idx) => <ResourceItem scene={scene} index={idx} />}
        />
      ) : (
        <CompactBlock title="常用表达">
          <Text muted>暂无可展示的演讲表达资源。</Text>
        </CompactBlock>
      )}
    </Section>
  );
}

function gridColumns(isMobile, columns = 'repeat(2, minmax(0, 1fr))') {
  return isMobile ? '1fr' : columns;
}

export default function SpeechAnalysis({ feedback }) {
  const isMobile = useIsMobile();
  const model = buildSpeechModel(feedback);
  const { contentAnalysis, scenarioAnalysis, structure, taskAnalysis } = model;

  return (
    <AnalysisPage>
      <Section title="题型分析" subtitle="先理解演讲稿这一题型的基本要求，再进入当前题目的具体分析。">
        <CompactBlock title="题型特点">
          <TextList items={model.typeHighlights} />
        </CompactBlock>
      </Section>

      <Section title="主题分析" subtitle="这一部分聚焦当前题目的主题、对象和表达重心，帮助学生判断这道题真正该写什么。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile), gap: 12 }}>
          <CompactBlock title="写作任务">
            <InfoLine label="演讲场合" value={scenarioAnalysis.occasion} />
            <InfoLine label="演讲身份" value={scenarioAnalysis.speakerRole} />
            <InfoLine label="听众对象" value={scenarioAnalysis.audience} />
            <InfoLine label="写作目的" value={scenarioAnalysis.formality ? `${scenarioAnalysis.formality}表达` : null} />
            <InfoLine label="核心任务" value={feedback?.focusPoints?.[0] || taskAnalysis.structureFocus} />
          </CompactBlock>
          <CompactBlock title="立意聚焦">
            <TextList items={model.themeFocus} emptyText="暂无立意分析。" />
          </CompactBlock>
          <CompactBlock title="贴题方向">
            <TextList items={model.topicFitPoints} emptyText="暂无贴题方向提示。" />
          </CompactBlock>
          <CompactBlock title="偏题预警">
            <TextList items={model.offTopicRisks} emptyText="暂无偏题风险提示。" />
          </CompactBlock>
        </div>
      </Section>

      <SpeechResourcesSection mergedVocabulary={model.mergedVocabulary} />

      <Section title="写作模板/框架" subtitle="按照演讲稿的常见写法，把开头、主体和结尾的安排拆开，帮助学生快速搭出文章骨架。">
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns(isMobile, '1fr 1fr'), gap: 12 }}>
          <CompactBlock title="结构安排">
            <InfoLine label="开头问候" value={structure.greeting} />
            <InfoLine label="开头进入" value={contentAnalysis.openingStrategy} />
            <div style={{ marginTop: 8 }}>
              <SubTitle>内容铺陈</SubTitle>
              <TextList items={model.bodyPlan} ordered emptyText="暂无主体展开建议。" />
            </div>
          </CompactBlock>
          <CompactBlock title="结尾收束">
            <InfoLine label="结尾方式" value={contentAnalysis.endingStrategy} />
            <InfoLine label="号召表达" value={structure.callToAction} />
            <div style={{ marginTop: 8 }}>
              <SubTitle>行文重点</SubTitle>
              <TextList
                items={[
                  contentAnalysis.argumentPath,
                  contentAnalysis.evidenceStrategy,
                  contentAnalysis.audienceAdaptation,
                ].filter(Boolean)}
                emptyText="暂无行文重点提示。"
              />
            </div>
          </CompactBlock>
        </div>
      </Section>
    </AnalysisPage>
  );
}
