import { normalizeType } from './feedbackAdapter';
import {
  CohesionAnalysisBlock,
  ErrorCatalogBlock,
  FeedbackContentReview,
  FeedbackLanguageReview,
  FeedbackStructureReview,
  ImprovementPlanBlock,
  RubricComparisonBlock,
  TaskPointsBlock,
} from './FeedbackDeepReviewBlocks.jsx';
import { ShimmerBlock } from './FeedbackShell';

function ReviewPanel({ title, subtitle, _tint, children, isMobile = false }) {
  return (
    <div style={{ display: 'grid', gap: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#f5f0e8',
        borderTop: '1px solid #d4c8b8',
        borderBottom: '1px solid #d4c8b8',
        padding: isMobile ? '8px 20px' : '9px 26px',
        margin: isMobile ? '0 -10px 10px' : '0 -14px 10px',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6b5a47', letterSpacing: '0.04em' }}>{title}</span>
        {subtitle && <span style={{ fontSize: 11, color: '#8a7d6e' }}>{subtitle}</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function normalizeFeedbackType(feedback) {
  return normalizeType(feedback?.type || feedback?.writingType || feedback?.selectedType || 'general');
}

function hasPlainObjectContent(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

function hasListContent(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasGrammarIssues(feedback) {
  return hasListContent(feedback?.grammarIssues) || hasListContent(feedback?.grammar);
}

function hasImprovementPlan(feedback) {
  return hasListContent(feedback?.improvementPlan?.coreProblems) ||
    hasListContent(feedback?.improvementPlan?.shortTermActions);
}

function hasCohesion(feedback) {
  return Boolean(
    feedback?.cohesionAnalysis?.intraPara ||
    feedback?.cohesionAnalysis?.interPara ||
    feedback?.cohesionAnalysis?.thematicEcho ||
    hasListContent(feedback?.cohesionAnalysis?.suggestions)
  );
}

function hasContentReview(feedback) {
  return [
    hasListContent(feedback?.contentLogic),
    hasPlainObjectContent(feedback?.contentAnalysis),
    hasListContent(feedback?.keyPoints),
    hasListContent(feedback?.missedPoints),
    hasPlainObjectContent(feedback?.storyLine),
    hasPlainObjectContent(feedback?.emotionLine),
    hasPlainObjectContent(feedback?.commentaryAnalysis),
  ].some(Boolean);
}

function hasStructureReview(feedback) {
  return [
    hasListContent(feedback?.structure),
    hasPlainObjectContent(feedback?.logicStructure),
    hasPlainObjectContent(feedback?.plotLogic),
  ].some(Boolean);
}

function buildReviewPanels({ feedback, isContinuation, isMobile, onNavigate }) {
  return [
    {
      key: 'task-points',
      show: !isContinuation && hasListContent(feedback?.taskPoints),
      title: '题目要点核查',
      subtitle: '逐一确认题目要求的任务是否都已完成。',
      content: <TaskPointsBlock feedback={feedback} showHeading={false} />,
    },
    {
      key: 'error-catalog',
      show: hasListContent(feedback?.errorCatalog),
      title: '语言错误全览',
      subtitle: isContinuation ? '原文中的语言问题逐条列出，按段落和严重程度标注。' : '原文中的语言问题逐条列出，按严重程度排序。',
      content: <ErrorCatalogBlock feedback={feedback} showHeading={false} onNavigate={onNavigate} />,
    },
    {
      key: 'grammar',
      show: !hasListContent(feedback?.errorCatalog) && hasGrammarIssues(feedback),
      title: '语言深入分析',
      subtitle: '把本次语法问题转成后续可练习的语法点。',
      content: <FeedbackLanguageReview feedback={feedback} showHeading={false} onNavigate={onNavigate} />,
    },
    {
      key: 'content',
      show: hasContentReview(feedback),
      title: '内容深入分析',
      subtitle: '检查任务完成、情节推进和主题回应，让内容不只写到表面。',
      content: <FeedbackContentReview feedback={feedback} showHeading={false} compact />,
    },
    {
      key: 'structure',
      show: hasStructureReview(feedback),
      title: '结构深入分析',
      subtitle: '梳理段落职责、承接关系和收束效果，让整篇文章更有骨架。',
      content: <FeedbackStructureReview feedback={feedback} showHeading={false} compact />,
    },
    {
      key: 'cohesion',
      show: isContinuation && hasCohesion(feedback),
      title: '篇章衔接评析',
      subtitle: '从段内衔接、段间衔接、主题回扣三个维度评价行文连贯性。',
      content: <CohesionAnalysisBlock feedback={feedback} showHeading={false} />,
    },
    {
      key: 'rubric',
      show: Boolean(feedback?.rubricComparison?.tiers?.length),
      title: '档次对照表',
      subtitle: isContinuation ? '对照高考读后续写五档评分标准，了解当前档次和晋档条件。' : '对照高考应用文五档评分标准，了解当前档次和晋档条件。',
      content: <RubricComparisonBlock feedback={feedback} showHeading={false} />,
    },
    {
      key: 'plan',
      show: hasImprovementPlan(feedback),
      title: '提分计划',
      subtitle: '本次核心问题与可立即执行的改进方案。',
      content: <ImprovementPlanBlock feedback={feedback} showHeading={false} />,
    },
  ].filter((panel) => panel.show).map((panel) => ({
    ...panel,
    isMobile,
  }));
}

function ReviewPanelList({ panels }) {
  return panels.map((panel) => (
    <ReviewPanel
      key={panel.key}
      title={panel.title}
      subtitle={panel.subtitle}
      isMobile={panel.isMobile}
    >
      {panel.content}
    </ReviewPanel>
  ));
}

export function FeedbackDeepReviewSection({ feedback, _originalText, isMobile = false, onNavigate }) {
  const type = normalizeFeedbackType(feedback);
  const isContinuation = type === 'continuation';
  const panels = buildReviewPanels({ feedback, isContinuation, isMobile, onNavigate });

  return (
    <div style={{ display: 'grid', gap: isMobile ? 10 : 14 }}>
      <ReviewPanelList panels={panels} />
    </div>
  );
}

export function FeedbackDeepReviewSkeleton({ isMobile = false }) {
  return (
    <div style={{ display: 'grid', gap: isMobile ? 10 : 14 }}>
      {[0, 1, 2].map((block) => (
        <div
          key={block}
          style={{ display: 'grid', gap: 8, paddingBottom: 12, borderBottom: '1px dashed #d4c8b8' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShimmerBlock width={20} height={20} radius={2} />
            <div style={{ display: 'grid', gap: 5 }}>
              <ShimmerBlock width={isMobile ? 110 : 140} height={15} radius={2} />
              <ShimmerBlock width={isMobile ? 160 : 260} height={11} radius={2} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ShimmerBlock />
            <ShimmerBlock width="96%" />
            <ShimmerBlock width="80%" />
          </div>
        </div>
      ))}
    </div>
  );
}
