import { Suspense, lazy } from 'react';

import { normalizeType } from './feedbackAdapter';
import { ShimmerBlock } from './FeedbackShell';

const AnalysisTab = lazy(() => import('./AnalysisTab'));

const FeedbackNavigationSection = lazy(() => import('./FeedbackNavigationSection').then((module) => ({ default: module.FeedbackNavigationSection })));
const FeedbackDeepReviewSection = lazy(() => import('./FeedbackDeepReviewSection').then((module) => ({ default: module.FeedbackDeepReviewSection })));
const FeedbackSampleEssaySection = lazy(() => import('./FeedbackSampleEssaySection').then((module) => ({ default: module.FeedbackSampleEssaySection })));

function FlatSkeleton({ label, rows = 3, isMobile = false }) {
  return (
    <div style={{ display: 'grid', gap: 8, paddingBottom: 12, borderBottom: '1px dashed #d4c8b8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {label && (
          <span style={{
            fontSize: isMobile ? 10 : 11,
            fontWeight: 700,
            color: '#8a7d6e',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>{label}</span>
        )}
        <div style={{ display: 'grid', gap: 5 }}>
          <ShimmerBlock width={isMobile ? 100 : 130} height={15} radius={2} />
          <ShimmerBlock width={isMobile ? 160 : 240} height={11} radius={2} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <ShimmerBlock key={i} width={i === rows - 1 ? '78%' : i % 2 === 0 ? '100%' : '92%'} />
        ))}
      </div>
    </div>
  );
}

function FeedbackNavigationFallback({ isMobile = false }) {
  return <FlatSkeleton label="导航" rows={2} isMobile={isMobile} />;
}

function FeedbackDeepReviewFallback({ isMobile = false }) {
  return <FlatSkeleton label="精批" rows={3} isMobile={isMobile} />;
}

function FeedbackSampleEssayFallback({ isMobile = false }) {
  return <FlatSkeleton label="范文" rows={2} isMobile={isMobile} />;
}

function QuickDiagnosticCard({ title, items, tone = 'problem', isMobile = false }) {
  if (!Array.isArray(items) || !items.length) return null;
  const palette = tone === 'action'
    ? { bg: '#f0f7f2', border: '#c8dfd0', color: '#3a6a45' }
    : { bg: '#fdf6f0', border: '#e8d5c0', color: '#8A6F5B' };

  return (
    <div style={{ paddingBottom: 4 }}>
      <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 800, color: palette.color, marginBottom: 5 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.slice(0, 3).map((item, index) => (
          <div key={`${item}-${index}`} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ color: palette.color, fontWeight: 800, fontSize: 12, minWidth: 14 }}>{index + 1}.</span>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: '#3D2C1F' }}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function hasList(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasNavigationContent(feedback) {
  const highlightLists = [
    feedback?.highlights?.content,
    feedback?.highlights?.vocabulary,
    feedback?.highlights?.sentences,
    feedback?.suggestions,
    feedback?.improvements,
  ];
  return highlightLists.some(hasList);
}

function hasDeepReviewContent(feedback) {
  const listFields = [
    feedback?.grammarIssues,
    feedback?.grammar,
    feedback?.contentLogic,
    feedback?.structure,
    feedback?.errorCatalog,
    feedback?.taskPoints,
  ];
  const objectFields = [
    feedback?.contentAnalysis,
    feedback?.logicStructure,
    feedback?.rubricComparison,
    feedback?.improvementPlan,
    feedback?.cohesionAnalysis,
  ];
  return listFields.some(hasList) || objectFields.some(hasObject);
}

function normalizeDiagnosticItems(items) {
  return Array.isArray(items)
    ? items.map((item) => (typeof item === 'string' ? item : (item?.detail || item?.title || ''))).filter(Boolean)
    : [];
}

function getMainProblems(feedback) {
  if (hasList(feedback?.mainProblems)) return feedback.mainProblems;
  return hasList(feedback?.weaknesses) ? feedback.weaknesses : [];
}

function getWritingType(feedback) {
  return normalizeType(feedback?.questionAnalysis?.type || feedback?.writingType || feedback?.type || 'general');
}

function buildEvaluationModel(feedback) {
  const mainProblems = getMainProblems(feedback);
  const nextActionsItems = normalizeDiagnosticItems(feedback?.nextActions);
  const hasDetailed = hasNavigationContent(feedback) || hasDeepReviewContent(feedback) || hasEssayContent(feedback);

  return {
    hasDetailed,
    hasQuickDiagnostics: mainProblems.length > 0 || nextActionsItems.length > 0,
    mainProblems,
    nextActionsItems,
    sampleEssayPending: Boolean(feedback?.sampleEssayPending),
    writingType: getWritingType(feedback),
  };
}

function hasEssayContent(feedback) {
  return Boolean(
    feedback?.correctedSampleEssay?.text ||
    feedback?.excellentSampleEssay?.text ||
    feedback?.sampleEssay?.text
  );
}

function QuickDiagnosticsGrid({ isMobile, mainProblems, nextActionsItems }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 8 : 12, padding: isMobile ? '10px 12px' : '12px 14px', border: '1px solid #e8e0d5', background: '#fffaf5' }}>
      <QuickDiagnosticCard title="本次优先处理的问题" items={mainProblems} isMobile={isMobile} />
      <QuickDiagnosticCard title="下一步先改什么" items={nextActionsItems} tone="action" isMobile={isMobile} />
    </div>
  );
}

function QuickOnlyDiagnostics({ feedback, isMobile, mainProblems, nextActionsItems }) {
  return (
    <>
      {feedback?.summary ? (
        <div style={{ background: '#ffffff', border: '1px solid #e8e0d5', borderRadius: 0, padding: isMobile ? '10px 12px' : '12px 14px', fontSize: 13, lineHeight: 1.7, color: '#3D2C1F' }}>
          {feedback.summary}
        </div>
      ) : null}
      <QuickDiagnosticCard title="这次最影响得分的问题" items={mainProblems} isMobile={isMobile} />
      <QuickDiagnosticCard title="下一步先改什么" items={nextActionsItems} tone="action" isMobile={isMobile} />
      <div style={{ fontSize: isMobile ? 11 : 12, lineHeight: 1.65, color: '#8A6F5B', paddingTop: 2 }}>
        这是一版快速诊断结果，重点先帮你看清分数区间、最大问题和下一步动作。更完整的深度精批会继续在后台补充。
      </div>
    </>
  );
}

function DetailedFeedbackPanels({ feedback, isMobile, onNavigate, originalText, sampleEssayPending, writingType }) {
  return (
    <>
      <Suspense fallback={<FeedbackNavigationFallback isMobile={isMobile} />}>
        <FeedbackNavigationSection feedback={feedback} isMobile={isMobile} />
      </Suspense>
      <Suspense fallback={<FeedbackDeepReviewFallback isMobile={isMobile} />}>
        <FeedbackDeepReviewSection
          feedback={feedback}
          originalText={originalText}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />
      </Suspense>
      <Suspense fallback={<FeedbackSampleEssayFallback isMobile={isMobile} />}>
        {sampleEssayPending ? (
          <FeedbackSampleEssayFallback isMobile={isMobile} />
        ) : (
          <FeedbackSampleEssaySection
            sampleEssay={feedback?.sampleEssay}
            correctedSampleEssay={feedback?.correctedSampleEssay}
            excellentSampleEssay={feedback?.excellentSampleEssay}
            writingType={writingType}
            isMobile={isMobile}
          />
        )}
      </Suspense>
    </>
  );
}

export function FeedbackAIEvaluation({ feedback, _loading, originalText, isMobile = false, onNavigate }) {
  const model = buildEvaluationModel(feedback);

  return (
    <div style={{ padding: isMobile ? '0 10px 12px' : '0 14px 16px', display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12, background: '#ffffff' }}>
      {model.hasDetailed && model.hasQuickDiagnostics && (
        <QuickDiagnosticsGrid
          isMobile={isMobile}
          mainProblems={model.mainProblems}
          nextActionsItems={model.nextActionsItems}
        />
      )}

      {/* Quick diagnostic banner — shown while supplemental feedback is still generating.
          Stays visible until real navigation/deep-review/essay content is ready.
          This avoids an abrupt layout jump when the transition happens. */}
      {!model.hasDetailed && (
        <QuickOnlyDiagnostics
          feedback={feedback}
          isMobile={isMobile}
          mainProblems={model.mainProblems}
          nextActionsItems={model.nextActionsItems}
        />
      )}

      {/* Detailed panels — rendered once supplemental feedback arrives.
          NavigationSection has built-in generic fallbacks so it always shows content. */}
      {model.hasDetailed && (
        <DetailedFeedbackPanels
          feedback={feedback}
          isMobile={isMobile}
          onNavigate={onNavigate}
          originalText={originalText}
          sampleEssayPending={model.sampleEssayPending}
          writingType={model.writingType}
        />
      )}
    </div>
  );
}

export function FeedbackAnalysisPanel({ feedback, question, promptText, writingType, isMobile = false }) {
  const analysisFeedback = {
    ...(feedback || {}),
    ...(feedback?.questionAnalysis || {}),
    analysisMeta: feedback?.analysisMeta || null,
    promptText: question?.promptText || feedback?.promptText || promptText || '',
  };

  return (
    <div style={{ padding: isMobile ? '0 10px 12px' : '0 14px 16px', background: '#ffffff' }}>
      <Suspense fallback={<FlatSkeleton label="分析" rows={3} isMobile={isMobile} />}>
        <AnalysisTab
          feedback={analysisFeedback}
          question={question}
          originalText={promptText || ''}
          writingType={writingType}
        />
      </Suspense>
    </div>
  );
}
