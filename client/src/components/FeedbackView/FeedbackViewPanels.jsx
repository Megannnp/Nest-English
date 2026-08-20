import { Suspense } from 'react';

import { THEME } from './feedbackAdapter';
import {
  GenerationProgress,
  SubTabButton,
} from './FeedbackShell';
import FeedbackStatusNotice from './FeedbackStatusNotice.jsx';

export function FeedbackSectionFallback({ minHeight = 180 }) {
  return (
    <div
      style={{
        minHeight,
        borderRadius: 0,
        background: '#f5f0e8',
        border: '1px solid #e8e0d5',
      }}
    />
  );
}

export function EmptyFeedbackState() {
  return (
    <div className="writing-feedback-view" style={{
      textAlign: 'center',
      color: THEME.textMuted,
      minHeight: '50vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: '#f0ece4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}>
        <div style={{ width: 20, height: 20, borderRadius: 2, background: '#c8bfb2' }} />
      </div>
      <p style={{ fontSize: 14, color: '#8a7d6e', margin: 0 }}>暂无反馈数据</p>
    </div>
  );
}

function FeedbackTabs({ aiTab, onSetTab }) {
  return (
    <div role="tablist" aria-label="反馈视图" className="writing-feedback-tabs">
      <SubTabButton active={aiTab === 'analysis'} label="题目分析" sub="题型、题目、资源与框架" onClick={() => onSetTab('analysis')} />
      <SubTabButton active={aiTab === 'evaluation'} label="写作评价" sub="导航、精批与范文" onClick={() => onSetTab('evaluation')} />
    </div>
  );
}

function ActiveStatusNotice({ aiTab, analysisStatusState, evaluationStatusState, isMobile }) {
  const state = aiTab === 'analysis' ? analysisStatusState : evaluationStatusState;
  return <FeedbackStatusNotice state={state} style={{ margin: isMobile ? '10px 10px 0' : '12px 14px 0' }} />;
}

function ActiveFeedbackPanel({
  aiTab,
  analysisFeedback,
  FeedbackAIEvaluation,
  FeedbackAnalysisPanel,
  isMobile,
  loading,
  onNavigate,
  originalText,
  promptText,
  question,
  safeData,
  writingType,
}) {
  return (
    <Suspense fallback={<FeedbackSectionFallback minHeight={280} />}>
      {aiTab === 'analysis' ? (
        <FeedbackAnalysisPanel
          feedback={analysisFeedback}
          question={question}
          promptText={promptText || question?.promptText || ''}
          writingType={writingType}
          isMobile={isMobile}
        />
      ) : (
        <FeedbackAIEvaluation
          feedback={safeData}
          loading={loading}
          originalText={originalText}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />
      )}
    </Suspense>
  );
}

export function FeedbackTabbedPanel({
  aiTab,
  analysisFeedback,
  analysisStatusState,
  evaluationStatusState,
  FeedbackAIEvaluation,
  FeedbackAnalysisPanel,
  isMobile,
  loading,
  onNavigate,
  originalText,
  promptText,
  question,
  safeData,
  writingType,
  onSetTab,
}) {
  return (
    <>
      <FeedbackTabs aiTab={aiTab} onSetTab={onSetTab} />
      <div className="writing-feedback-panel" style={{ minHeight: 180 }}>
        <ActiveStatusNotice
          aiTab={aiTab}
          analysisStatusState={analysisStatusState}
          evaluationStatusState={evaluationStatusState}
          isMobile={isMobile}
        />
        <ActiveFeedbackPanel
          aiTab={aiTab}
          analysisFeedback={analysisFeedback}
          FeedbackAIEvaluation={FeedbackAIEvaluation}
          FeedbackAnalysisPanel={FeedbackAnalysisPanel}
          isMobile={isMobile}
          loading={loading}
          onNavigate={onNavigate}
          originalText={originalText}
          promptText={promptText}
          question={question}
          safeData={safeData}
          writingType={writingType}
        />
      </div>
    </>
  );
}

export { GenerationProgress };
