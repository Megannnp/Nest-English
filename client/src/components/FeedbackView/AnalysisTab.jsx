import { Suspense, lazy } from 'react';

import { SharedResourceBank } from './analysis-types/shared-ui.jsx';
import { normalizeType, TYPE_DISPLAY } from './feedbackAdapter';
import { ShimmerBlock } from './FeedbackShell';
import { WRITING_TYPES } from '../../constants/index.jsx';

const ANALYSIS_COMPONENTS = {
  [WRITING_TYPES.CONTINUATION]: lazy(() => import('./analysis-types/continuation')),
  [WRITING_TYPES.ARGUMENTATIVE]: lazy(() => import('./analysis-types/argumentative')),
  [WRITING_TYPES.EXPOSITORY]: lazy(() => import('./analysis-types/expository')),
  [WRITING_TYPES.SUMMARY]: lazy(() => import('./analysis-types/summary')),
  [WRITING_TYPES.SPEECH]: lazy(() => import('./analysis-types/speech')),
  [WRITING_TYPES.LETTER]: lazy(() => import('./analysis-types/letter')),
  [WRITING_TYPES.NOTICE]: lazy(() => import('./analysis-types/notice')),
  [WRITING_TYPES.DIARY]: lazy(() => import('./analysis-types/diary')),
  [WRITING_TYPES.REPORT]: lazy(() => import('./analysis-types/report')),
  [WRITING_TYPES.NARRATIVE]: lazy(() => import('./analysis-types/narrative')),
  [WRITING_TYPES.PICTURE_WRITING]: lazy(() => import('./analysis-types/picture_writing')),
  [WRITING_TYPES.PROPOSAL]: lazy(() => import('./analysis-types/proposal')),
  [WRITING_TYPES.REVIEW]: lazy(() => import('./analysis-types/review')),
  [WRITING_TYPES.CHART_WRITING]: lazy(() => import('./analysis-types/chart_writing')),
};
const GenericAnalysis = lazy(() => import('./analysis-types/general'));

const SUPPORTED_SPECIALIZED_TYPES = new Set(Object.keys(ANALYSIS_COMPONENTS));

function DynamicPendingPanel({ title = '题目分析生成中', message }) {
  return (
    <div style={{ padding: 16, background: '#ffffff' }}>
      <div
        style={{
          background: '#ffffff',
          borderRadius: 0,
          border: '1px solid #e8e0d5',
          padding: 18,
          textAlign: 'left',
          boxShadow: 'none',
          display: 'grid',
          gap: 16,
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ color: '#3D2C1F', fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>{title}</div>
          {message ? (
            <div style={{ color: '#8A6F5B', fontSize: 13, lineHeight: 1.7 }}>
              {message}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <ShimmerBlock width="100%" height={18} radius={2} />
            <ShimmerBlock width="92%" height={18} radius={2} />
            <ShimmerBlock width="86%" height={18} radius={2} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 0, background: '#f5f0e8', border: '1px solid #d4c8b8', display: 'grid', gap: 10 }}>
              <ShimmerBlock width="38%" height={16} radius={2} />
              <ShimmerBlock width="100%" height={16} radius={2} />
              <ShimmerBlock width="88%" height={16} radius={2} />
            </div>
            <div style={{ padding: 12, borderRadius: 0, background: '#f5f0e8', border: '1px solid #d4c8b8', display: 'grid', gap: 10 }}>
              <ShimmerBlock width="34%" height={16} radius={2} />
              <ShimmerBlock width="96%" height={16} radius={2} />
              <ShimmerBlock width="82%" height={16} radius={2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LoadingAnalysis = ({ feedback, writingTypeLabel }) => (
  <DynamicPendingPanel
    title="题目分析生成中"
    message={feedback?.overview || `当前按「${writingTypeLabel}」继续补充题目分析，请稍候查看。`}
  />
);

const FailedAnalysis = ({ feedback, writingType }) => (
  <div style={{ padding: 16, background: '#ffffff' }}>
    <div style={{ background: '#ffffff', borderRadius: 0, border: '1px solid #d4c8b8', padding: 14, textAlign: 'left' }}>
      <div style={{ color: '#9a3a2a', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>题目分析暂未完全生成</div>
      <div style={{ color: '#8A6F5B', fontSize: 13, lineHeight: 1.7, marginBottom: Array.isArray(feedback?.focusPoints) && feedback.focusPoints.length ? 6 : 0 }}>
        {feedback?.overview || `当前写作类型「${writingType}」的独立题目分析暂未返回完整结构，建议先查看写作评价，稍后再回来查看。`}
      </div>
      {Array.isArray(feedback?.focusPoints) && feedback.focusPoints.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {feedback.focusPoints.slice(0, 3).map((item, index) => (
            <div key={index} style={{ fontSize: 13, lineHeight: 1.75, color: '#3D2C1F' }}>• {item}</div>
          ))}
        </div>
      ) : null}
    </div>
  </div>
);

const PartialAnalysisNotice = ({ message, tone = 'warning' }) => (
  <div style={{ marginBottom: 14 }}>
    <DynamicPendingPanel
      title={tone === 'error' ? '题目分析暂未完全生成' : '题目分析继续生成中'}
      message={message || '当前先展示已生成的题目分析内容，其余细节会稍后补齐。'}
    />
  </div>
);

function hasList(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasContinuationAnalysis(feedback) {
  return [
    feedback?.storyLine?.who,
    feedback?.storyLine?.what,
    feedback?.emotionLine?.initial,
    feedback?.plotAnalysis?.translation,
    feedback?.starters?.para1?.text,
    feedback?.contentAnalysis?.plotLogic?.accuracy,
  ].some(Boolean);
}

function hasFallbackAnalysis(feedback) {
  return Boolean(
    feedback?.overview ||
    feedback?.reason ||
    hasList(feedback?.themes) ||
    hasList(feedback?.focusPoints) ||
    hasList(feedback?.suggestions)
  );
}

function resolveWritingType({ feedback, writingTypeProp }) {
  return normalizeType(writingTypeProp || feedback?.questionAnalysis?.type || feedback?.writingType || feedback?.type || 'general');
}

function resolveAnalysisStatus(feedback) {
  if (feedback?.analysisMeta?.status) return feedback.analysisMeta.status;
  if (feedback?.status) return feedback.status;
  return feedback?.pending ? 'pending' : null;
}

function buildAnalysisModel({ feedback, writingTypeProp }) {
  const writingType = resolveWritingType({ feedback, writingTypeProp });
  const analysisStatus = resolveAnalysisStatus(feedback);
  const writingTypeLabel = TYPE_DISPLAY[writingType] || writingType;
  const hasContinuationContent = writingType === WRITING_TYPES.CONTINUATION && hasContinuationAnalysis(feedback);
  const hasFallbackContent = hasFallbackAnalysis(feedback);

  return {
    analysisStatus,
    hasContinuationContent,
    hasFallbackContent,
    hasSpecializedComponent: SUPPORTED_SPECIALIZED_TYPES.has(writingType),
    writingType,
    writingTypeLabel,
  };
}

function shouldShowLoading(model) {
  return model.analysisStatus === 'pending' && !model.hasContinuationContent && !model.hasFallbackContent;
}

function shouldShowFailed(model) {
  if (model.analysisStatus === 'failed' && !model.hasContinuationContent && !model.hasFallbackContent) return true;
  return model.writingType === WRITING_TYPES.CONTINUATION && !model.hasContinuationContent && !model.hasFallbackContent;
}

function resolveAnalysisComponent(model) {
  if (model.writingType === WRITING_TYPES.CONTINUATION && !model.hasContinuationContent) return GenericAnalysis;
  return model.hasSpecializedComponent ? ANALYSIS_COMPONENTS[model.writingType] : GenericAnalysis;
}

function noticeModel({ key, message, show, tone = undefined }) {
  return { key, message, show, tone };
}

function buildNoticeFlags(model) {
  const isPending = model.analysisStatus === 'pending';
  const isFailed = model.analysisStatus === 'failed';
  return {
    failedContinuation: isFailed && model.hasContinuationContent,
    failedFallback: isFailed && model.hasFallbackContent && !model.hasContinuationContent,
    partial: model.analysisStatus === 'partial',
    pendingContinuation: isPending && model.hasContinuationContent,
    pendingFallback: isPending && model.hasFallbackContent && !model.hasContinuationContent,
    unsupported: !model.hasSpecializedComponent,
  };
}

function buildAnalysisNotices(feedback, model) {
  const flags = buildNoticeFlags(model);

  return [
    noticeModel({
      key: 'pending-continuation',
      show: flags.pendingContinuation,
      message: feedback?.overview || '题目分析核心结构已生成，原文精读、资源库和模板细节仍在补充。',
    }),
    noticeModel({
      key: 'pending-fallback',
      show: flags.pendingFallback,
      message: feedback?.overview || '题目分析基础内容已生成，故事线、首句解析和资源库等细节仍在补充。',
    }),
    noticeModel({
      key: 'failed-continuation',
      show: flags.failedContinuation,
      tone: 'error',
      message: feedback?.overview || '题目分析的部分高级模块暂未生成完成，当前先展示已生成的核心内容。',
    }),
    noticeModel({
      key: 'failed-fallback',
      show: flags.failedFallback,
      tone: 'error',
      message: feedback?.overview || '题目分析细节未完全生成，当前先展示已生成的基础题型与题目理解内容。',
    }),
    noticeModel({
      key: 'partial',
      show: flags.partial,
      message: feedback?.overview || '当前展示的是已生成的题目分析内容，部分专属细节暂未补齐。',
    }),
    noticeModel({
      key: 'unsupported',
      show: flags.unsupported,
      message: `当前写作类型「${model.writingTypeLabel}」暂未接入专属题型分析模板，先展示通用题目分析内容。`,
    }),
  ].filter((notice) => notice.show);
}

function AnalysisNotices({ feedback, model }) {
  return buildAnalysisNotices(feedback, model).map((notice) => (
    <PartialAnalysisNotice
      key={notice.key}
      tone={notice.tone}
      message={notice.message}
    />
  ));
}

function EmptyAnalysis() {
  return <div style={{ padding: 24, textAlign: 'center', color: '#8a7d6e' }}>暂无分析数据，请先提交作文获取AI反馈</div>;
}

export default function AnalysisTab({ feedback, originalText, writingType: writingTypeProp }) {
  if (!feedback) return <EmptyAnalysis />;

  const model = buildAnalysisModel({ feedback, writingTypeProp });

  if (shouldShowLoading(model)) {
    return <LoadingAnalysis feedback={feedback} writingTypeLabel={model.writingTypeLabel} />;
  }

  if (shouldShowFailed(model)) {
    return <FailedAnalysis feedback={feedback} writingType={model.writingTypeLabel} />;
  }

  const AnalysisComponent = resolveAnalysisComponent(model);

  return (
    <>
      <AnalysisNotices feedback={feedback} model={model} />
      <Suspense fallback={<LoadingAnalysis feedback={feedback} writingTypeLabel={model.writingTypeLabel} />}>
        <AnalysisComponent
          feedback={feedback}
          originalText={originalText || ''}
          writingType={model.writingTypeLabel}
        />
      </Suspense>
      {model.writingType !== WRITING_TYPES.CONTINUATION && (
        <SharedResourceBank feedback={feedback} />
      )}
    </>
  );
}
